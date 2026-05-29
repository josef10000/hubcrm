import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_utils/firebase.js';
import { asaasRequest } from '../_utils/asaas.js';

export async function runFinanceReconciler(req: VercelRequest, res: VercelResponse) {
  const { secret } = req.query;

  // 1. Validação de Segurança do Cron
  if (secret !== process.env.CRON_SECRET) {
    console.error('[Finance Reconciler] Tentativa de acesso não autorizada');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {
    processedOrgs: 0,
    syncedClients: 0,
    updatedClients: 0,
    errors: [] as string[]
  };

  try {
    console.log(`[Finance Reconciler] Iniciando rotina automática de conciliação de faturas...`);

    // 2. Buscar todas as organizações
    const orgsSnapshot = await db.collection('organizations').get();
    
    // Processamos todas as organizações concorrentemente
    const orgPromises = orgsSnapshot.docs.map(async (orgDoc) => {
      const orgId = orgDoc.id;
      const orgData = orgDoc.data();
      results.processedOrgs++;

      // Obter preferências de faturamento e chave do Asaas da organização
      const prefsDoc = await db.collection('organizations').doc(orgId).collection('settings').doc('preferences').get();
      const asaasKey = prefsDoc.exists ? prefsDoc.data()?.asaas_api_key : null;

      if (!asaasKey) {
        // Organização sem integração do Asaas configurada
        return;
      }

      try {
        // Buscar clientes ativos e em desenvolvimento da organização
        const clientsSnapshot = await db.collection('organizations').doc(orgId).collection('clients')
          .get();

        const clientsToSync = clientsSnapshot.docs
          .map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() as any }))
          .filter(c => c.asaasCustomerId && c.status !== 'Cancelado' && !c.isCourtesy);

        if (clientsToSync.length === 0) return;

        // Processamos a sincronização dos clientes da organização em paralelo
        const clientSyncPromises = clientsToSync.map(async (client) => {
          results.syncedClients++;
          try {
            // A. Buscar pagamentos recentes do cliente no Asaas
            const paymentsRes = await asaasRequest(`/payments?customer=${client.asaasCustomerId}&limit=20`, "GET", null, asaasKey);
            const payments = paymentsRes.data || [];

            let subscription: any = null;
            if (client.asaasSubscriptionId) {
              try {
                subscription = await asaasRequest(`/subscriptions/${client.asaasSubscriptionId}`, "GET", null, asaasKey);
              } catch (subErr: any) {
                console.warn(`[Finance Reconciler] Assinatura ${client.asaasSubscriptionId} não encontrada ou erro no Asaas para ${client.name}: ${subErr.message}`);
              }
            }

            if (payments.length > 0) {
              // B. Identificar o pagamento alvo (Atrasado primeiro, senão Pendente, senão a última emitida)
              let targetPayment = payments.find((p: any) => p.status === 'OVERDUE');
              if (!targetPayment) targetPayment = payments.find((p: any) => p.status === 'PENDING');
              if (!targetPayment) {
                targetPayment = [...payments].sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0];
              }

              const latestPayment = targetPayment;
              const status = latestPayment.status;

              let newPaymentStatus: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'N/A' = 'PENDING';
              let newSiteStatus = client.status;

              if (status === 'RECEIVED' || status === 'CONFIRMED') {
                newPaymentStatus = 'RECEIVED';
                newSiteStatus = 'Ativo';
              } else if (status === 'OVERDUE') {
                newPaymentStatus = 'OVERDUE';
                newSiteStatus = 'Inadimplente';
              }

              const nextDueDate = status === 'PENDING' || status === 'OVERDUE' 
                ? latestPayment.dueDate 
                : (subscription?.nextDueDate || client.nextDueDate || null);

              const invoiceUrl = latestPayment.invoiceUrl || client.invoiceUrl || null;

              // C. Se houver divergências de status, atualiza o Firestore e notifica a equipe
              if (
                newPaymentStatus !== client.paymentStatus || 
                newSiteStatus !== client.status || 
                nextDueDate !== client.nextDueDate || 
                (latestPayment.invoiceUrl && latestPayment.invoiceUrl !== client.invoiceUrl)
              ) {
                const updatePayload: any = {
                  paymentStatus: newPaymentStatus,
                  status: newSiteStatus,
                  lastUpdate: Date.now()
                };

                if (nextDueDate) updatePayload.nextDueDate = nextDueDate;
                if (invoiceUrl) updatePayload.invoiceUrl = invoiceUrl;

                await client.ref.update(updatePayload);
                results.updatedClients++;

                // D. Disparar alertas inteligentes de sistema
                if (newPaymentStatus === 'RECEIVED' && client.paymentStatus !== 'RECEIVED') {
                  // Confirmação de recebimento / Desbloqueio de acesso
                  await db.collection('system_alerts').add({
                    title: `✅ Pagamento Conciliado: ${client.name}`,
                    message: `O pagamento do plano do cliente "${client.name}" foi confirmado pelo Asaas e o acesso ao sistema foi restabelecido.`,
                    type: 'success',
                    targetRoles: ['Administrador', 'Gerente', 'FinOps'],
                    createdAt: Date.now(),
                    link: '/finance',
                    orgId: orgId
                  });
                } else if (newPaymentStatus === 'OVERDUE' && client.paymentStatus !== 'OVERDUE') {
                  // Atraso de pagamento / Inadimplência
                  await db.collection('system_alerts').add({
                    title: `⚠️ Inadimplência Detectada: ${client.name}`,
                    message: `Identificamos que a fatura do cliente "${client.name}" está vencida no Asaas. O status do cliente foi alterado para Inadimplente.`,
                    type: 'error',
                    targetRoles: ['Administrador', 'Gerente', 'FinOps'],
                    createdAt: Date.now(),
                    link: '/finance',
                    orgId: orgId
                  });
                }
              }
            }
          } catch (clientErr: any) {
            results.errors.push(`Erro ao sincronizar cliente ${client.name || client.id} (Org: ${orgId}): ${clientErr.message}`);
          }
        });

        await Promise.allSettled(clientSyncPromises);

      } catch (orgErr: any) {
        results.errors.push(`Erro ao processar organização ${orgId} (${orgData.name || 'Sem Nome'}): ${orgErr.message}`);
      }
    });

    await Promise.allSettled(orgPromises);

    console.log(`[Finance Reconciler] Concluído com sucesso. Organizações processadas: ${results.processedOrgs}, Clientes varridos: ${results.syncedClients}, Atualizados: ${results.updatedClients}`);

    return res.status(200).json({
      success: true,
      summary: results
    });

  } catch (error: any) {
    console.error(`[Finance Reconciler] Erro crítico no processo de conciliação:`, error);
    return res.status(500).json({ error: error.message });
  }
}
