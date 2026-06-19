import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_utils/firebase.js';
import { asaasRequest } from '../_utils/asaas.js';

export async function processSingleOrgReconciliation(
  orgId: string,
  orgData: any,
  results: {
    processedOrgs: number;
    syncedClients: number;
    updatedClients: number;
    errors: string[];
  }
) {
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

    if (clientsToSync.length > 0) {
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
    }

    // E. Sincronizar despesas do extrato do Asaas (Automático)
    try {
      console.log(`[Finance Reconciler] Sincronizando extrato de despesas da Org ${orgId}...`);
      
      // 1. Carregar transações existentes no CRM para cache e similaridade
      const transactionsSnap = await db.collection('organizations').doc(orgId).collection('transactions').get();
      const orgTransactions = transactionsSnap.docs.map(d => d.data());
      const existingIds = new Set(orgTransactions.map(tx => tx.id));
      const categorizedExpenses = orgTransactions.filter(tx => tx.type === 'EXPENSE' && tx.categoryName && tx.categoryName !== 'A Categorizar');

      // 2. Buscar extrato de transações financeiras recentes no Asaas
      const transactionsRes = await asaasRequest('/financialTransactions?limit=50', 'GET', null, asaasKey);
      const asaasTransactions = transactionsRes.data || [];
      const debits = asaasTransactions.filter((t: any) => t.type === 'DEBIT');

      let newExpensesCount = 0;
      let pendingConciliationCount = 0;

      for (const t of debits) {
        const transactionId = `asaas_tx_${t.id}`;
        
        // Ignorar se já cadastrado no CRM
        if (existingIds.has(transactionId)) continue;

        // Evitar duplicidade de transferências de lote ( Pix de salários )
        const isDuplicateTransfer = orgTransactions.some(tx => 
          tx.externalReference === t.id || 
          (tx.type === 'EXPENSE' && tx.amount === Math.abs(t.value) && Math.abs(tx.date - new Date(t.date).getTime()) < 5 * 60 * 1000)
        );
        if (isDuplicateTransfer) continue;

        // Algoritmo de Mapeamento Inteligente de Categorias
        let matchedCategoryName = 'A Categorizar';
        const cleanDesc = String(t.description || '').toLowerCase();
        
        for (const exp of categorizedExpenses) {
          const expDesc = String(exp.description || '').toLowerCase();
          const keywords = ['aws', 'amazon', 'google', 'facebook', 'github', 'host', 'telecom', 'energia', 'agua', 'luz', 'asaas', 'tar', 'ted', 'pix', 'boleto', 'caju', 'flash', 'seguro', 'internet'];
          const matchedKey = keywords.find(key => cleanDesc.includes(key) && expDesc.includes(key));
          if (matchedKey) {
            matchedCategoryName = exp.categoryName;
            break;
          }
        }

        if (matchedCategoryName === 'A Categorizar') {
          pendingConciliationCount++;
        }

        // Criar a despesa
        const txRef = db.collection('organizations').doc(orgId).collection('transactions').doc(transactionId);
        await txRef.set({
          id: transactionId,
          description: t.description || 'Despesa Asaas',
          amount: Math.abs(t.value),
          netAmount: Math.abs(t.value),
          gatewayFee: 0,
          date: new Date(t.date || Date.now()).getTime(),
          paymentDate: new Date(t.date || Date.now()).getTime(),
          type: 'EXPENSE',
          status: 'PAID',
          categoryName: matchedCategoryName,
          externalReference: t.id
        });
        
        newExpensesCount++;
      }

      console.log(`[Finance Reconciler] Sincronização concluída na Org ${orgId}. Novas despesas: ${newExpensesCount} | A Categorizar: ${pendingConciliationCount}`);

      // Se houver novos lançamentos a categorizar, gera um alerta único
      if (pendingConciliationCount > 0) {
        await db.collection('system_alerts').add({
          title: `📊 Conciliação Bancária Pendente`,
          message: `Foram importadas ${pendingConciliationCount} novas despesas do Asaas sem categoria correspondente. Faça a classificação no painel financeiro.`,
          type: 'info',
          targetRoles: ['Administrador', 'Gerente', 'FinOps'],
          createdAt: Date.now(),
          link: '/finance',
          orgId: orgId
        });
      }
    } catch (expErr: any) {
      results.errors.push(`Erro ao sincronizar extrato de despesas (Org: ${orgId}): ${expErr.message}`);
    }

  } catch (orgErr: any) {
    results.errors.push(`Erro ao processar organização ${orgId} (${orgData.name || 'Sem Nome'}): ${orgErr.message}`);
  }
}

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
      results.processedOrgs++;
      await processSingleOrgReconciliation(orgDoc.id, orgDoc.data(), results);
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
