import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_utils/firebase.js';
import { asaasRequest } from '../_utils/asaas.js';
import { sendBirthdayGreetingEmail } from '../../src/services/emailService.js';

export async function runDailyCron(req: VercelRequest, res: VercelResponse) {
  try {
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const currentDay = brazilTime.getDate();
    const currentMonth = brazilTime.getMonth() + 1;
    const currentYear = brazilTime.getFullYear();

    console.log(`[Daily Cron] Iniciando Auditoria do Sistema para ${currentDay}/${currentMonth}/${currentYear}`);

    const results: any = {
      birthdays: 0,
      financialAlerts: 0,
      supportAlerts: 0,
      processedOrgs: 0
    };

    // 1. Buscar todas as organizações
    const orgsSnapshot = await db.collection('organizations').get();
    
    const orgPromises = orgsSnapshot.docs.map(async (orgDoc) => {
      const orgId = orgDoc.id;
      const orgData = orgDoc.data();
      results.processedOrgs++;

      //--- MÓDULO A: ANIVERSÁRIOS ---
      const profilesSnapshot = await db.collection('profiles').where('orgId', '==', orgId).get();
      const birthDayBuddies: any[] = [];
      
      profilesSnapshot.forEach(doc => {
        const profile = doc.data();
        if (!profile.birthDate) return;
        const [year, month, day] = profile.birthDate.split('-').map(Number);
        if (day === currentDay && month === currentMonth && profile.lastBirthdayEmailYear !== currentYear) {
          birthDayBuddies.push({
            uid: doc.id,
            email: profile.email,
            name: profile.displayName || 'Colaborador'
          });
        }
      });

      for (const buddy of birthDayBuddies) {
        if (!buddy.email) continue;
        try {
          await sendBirthdayGreetingEmail(buddy.email, buddy.name);
          await db.collection('profiles').doc(buddy.uid).update({ lastBirthdayEmailYear: currentYear });
          results.birthdays++;
        } catch (err) {
          console.error(`[Cron] Erro no aniversário de ${buddy.name} (Org: ${orgId}):`, err);
        }
      }

      if (birthDayBuddies.length > 0) {
        await db.collection('system_alerts').add({
          title: '🎂 Celebrações de Hoje',
          message: `${birthDayBuddies.length} e-mail(s) de aniversário enviados para a equipe da ${orgData.name || 'sua empresa'}.`,
          type: 'cron',
          targetRoles: ['Administrador', 'Gerente', 'People & Culture'],
          createdAt: Date.now(),
          link: '/team',
          orgId: orgId
        });
      }

      //--- MÓDULO B: AUDITORIA FINANCEIRA (ASZAS) ---
      // Pegar a chave do Asaas nas preferências da organização
      const prefsDoc = await db.collection('organizations').doc(orgId).collection('settings').doc('preferences').get();
      const asaasKey = prefsDoc.exists ? prefsDoc.data()?.asaas_api_key : null;

      if (asaasKey) {
        try {
          // Buscar faturas vencidas (OVERDUE)
          const overduePayments = await asaasRequest('/payments?status=OVERDUE&limit=10', 'GET', null, asaasKey);
          
          if (overduePayments.data && overduePayments.data.length > 0) {
            const totalOverdue = overduePayments.data.reduce((acc: number, p: any) => acc + p.value, 0);
            
            await db.collection('system_alerts').add({
              title: '💰 Alerta de Inadimplência',
              message: `Atenção: Existem ${overduePayments.data.length} faturas vencidas aguardando retorno. Total aproximado: R$ ${totalOverdue.toFixed(2)}.`,
              type: 'error',
              targetRoles: ['Administrador', 'Gerente', 'FinOps'],
              createdAt: Date.now(),
              link: '/finance',
              orgId: orgId
            });
            results.financialAlerts++;
          }
        } catch (err) {
          console.error(`[Cron] Erro na auditoria financeira da Org ${orgId}:`, err);
        }
      }

      //--- MÓDULO C: AUDITORIA DE SUPORTE (SLA) ---
      try {
        const ticketsSnapshot = await db.collection('organizations').doc(orgId).collection('supportRequests')
          .where('status', 'not-in', ['Finalizado', 'Cancelado'])
          .get();
        
        const overdueTickets = ticketsSnapshot.docs.filter(doc => {
          const t = doc.data();
          if (!t.slaLimit) return false;
          return new Date(t.slaLimit).getTime() < now.getTime();
        });

        if (overdueTickets.length > 0) {
          await db.collection('system_alerts').add({
            title: '🎧 SLA de Suporte Crítico',
            message: `Identificamos ${overdueTickets.length} chamado(s) com SLA vencido que precisam de atenção imediata.`,
            type: 'warning',
            targetRoles: ['Administrador', 'Gerente', 'Suporte Técnico'],
            createdAt: Date.now(),
            link: '/support',
            orgId: orgId
          });
          results.supportAlerts++;
        }
      } catch (err) {
        console.error(`[Cron] Erro na auditoria de suporte da Org ${orgId}:`, err);
      }
    });

    await Promise.allSettled(orgPromises);

    return res.status(200).json({ 
      success: true, 
      date: brazilTime.toISOString(),
      summary: results
    });

  } catch (error: any) {
    console.error(`[Daily Cron] Erro crítico:`, error);
    return res.status(500).json({ error: error.message });
  }
}
