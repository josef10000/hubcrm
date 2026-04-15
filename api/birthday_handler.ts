import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_utils/firebase.js';
import { sendBirthdayGreetingEmail } from '../src/services/emailService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Segurança: Vercel Cron envia um cabeçalho específico
  // Se quiser ser ultra seguro, verifique se o request vem da Vercel
  // const isCron = req.headers['x-vercel-cron'] === '1';
  // if (!isCron && process.env.NODE_ENV === 'production') {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    const now = new Date();
    // Ajuste para o fuso horário de Brasília (UTC-3)
    const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const currentDay = brazilTime.getDate();
    const currentMonth = brazilTime.getMonth() + 1; // 1-12
    const currentYear = brazilTime.getFullYear();

    console.log(`[Cron] Iniciando verificação de aniversários para ${currentDay}/${currentMonth}/${currentYear}`);

    const profilesRef = db.collection('profiles');
    const snapshot = await profilesRef.get();

    if (snapshot.empty) {
      return res.status(200).json({ message: 'Nenhum perfil encontrado.' });
    }

    const birthDayBuddies: any[] = [];
    const updatePromises: any[] = [];
    const emailPromises: any[] = [];

    snapshot.forEach(doc => {
      const profile = doc.data();
      if (!profile.birthDate) return;

      // Formato esperado: YYYY-MM-DD
      const [year, month, day] = profile.birthDate.split('-').map(Number);
      
      const isBirthdayToday = day === currentDay && month === currentMonth;
      const alreadySentThisYear = profile.lastBirthdayEmailYear === currentYear;

      if (isBirthdayToday && !alreadySentThisYear) {
        birthDayBuddies.push({
          uid: doc.id,
          email: profile.email,
          name: profile.displayName || 'Colaborador'
        });
      }
    });

    console.log(`[Cron] ${birthDayBuddies.length} aniversariantes encontrados hoje.`);

    for (const buddy of birthDayBuddies) {
      if (!buddy.email) continue;

      // 1. Disparar E-mail
      emailPromises.push(
        sendBirthdayGreetingEmail(buddy.email, buddy.name)
          .then(() => {
            // 2. Atualizar Ano no perfil para evitar duplicidade
            return db.collection('profiles').doc(buddy.uid).update({
              lastBirthdayEmailYear: currentYear
            });
          })
          .catch(err => {
            console.error(`[Cron] Erro ao processar aniversário de ${buddy.name}:`, err);
          })
      );
    }

    await Promise.all(emailPromises);

    // 3. Criar alerta operacional para a gestão
    if (birthDayBuddies.length > 0) {
      await db.collection('system_alerts').add({
        title: '🎂 Automação de Aniversários',
        message: `${birthDayBuddies.length} e-mail(s) de parabéns foram enviados hoje para: ${birthDayBuddies.map(b => b.name).join(', ')}.`,
        type: 'cron',
        targetRoles: ['Administrador', 'Gerente', 'People & Culture'],
        createdAt: Date.now(),
        link: '/team'
      });
    }

    return res.status(200).json({ 
      success: true, 
      processed: birthDayBuddies.length,
      buddies: birthDayBuddies.map(b => b.name)
    });
  } catch (error: any) {
    console.error(`[Cron] Erro crítico no birthday_handler:`, error);
    return res.status(500).json({ error: error.message });
  }
}
