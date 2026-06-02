import { db } from '../../../_utils/firebase.js';

/**
 * 💸 Handler de Webhooks de Transferências do Asaas
 * Captura conciliações de pagamento e falhas nas transferências do RH.
 */
export async function handleTransferEvent(transferData: any, event: string) {
  const transferId = transferData.id;
  if (!transferId) return;

  const isSuccess = event === 'TRANSFER_CONFIRMED' || event === 'TRANSFER_LIQUIDATED';
  const isFailure = event === 'TRANSFER_FAILED';

  if (!isSuccess && !isFailure) return;

  // 1. Procurar nas transações contábeis
  const txSnapshot = await db.collectionGroup('transactions').where('id', '==', `asaas_${transferId}`).limit(1).get();
  
  let orgId = '';
  
  if (!txSnapshot.empty) {
    const txDoc = txSnapshot.docs[0];
    orgId = txDoc.ref.parent.parent?.id || '';
    
    // Atualizar status da despesa na DRE/Caixa
    await txDoc.ref.update({
      status: isSuccess ? 'PAID' : 'FAILED',
      updatedAt: Date.now()
    });
  }

  // 2. Procurar em adiantamentos salariais
  const advSnapshot = await db.collectionGroup('salary_advances').where('asaasTransferId', '==', transferId).limit(1).get();
  if (!advSnapshot.empty) {
    const advDoc = advSnapshot.docs[0];
    if (!orgId) orgId = advDoc.ref.parent.parent?.id || '';
    
    await advDoc.ref.update({
      status: isSuccess ? 'repaid' : 'failed',
      updatedAt: Date.now()
    });
  }

  // 3. Procurar em recibos de férias
  const vacSnapshot = await db.collectionGroup('vacation_payments').where('asaasTransferId', '==', transferId).limit(1).get();
  if (!vacSnapshot.empty) {
    const vacDoc = vacSnapshot.docs[0];
    if (!orgId) orgId = vacDoc.ref.parent.parent?.id || '';
    
    await vacDoc.ref.update({
      status: isSuccess ? 'paid' : 'failed',
      updatedAt: Date.now()
    });
  }

  // 4. Procurar na folha de pagamento (payrolls)
  const payrollsSnapshot = await db.collectionGroup('payrolls').get();
  for (const payrollDoc of payrollsSnapshot.docs) {
    const data = payrollDoc.data();
    if (data.items && Array.isArray(data.items)) {
      const itemIndex = data.items.findIndex((item: any) => item.asaasTransferId === transferId);
      if (itemIndex !== -1) {
        if (!orgId) orgId = payrollDoc.ref.parent.parent?.id || '';
        
        const updatedItems = [...data.items];
        updatedItems[itemIndex].status = isSuccess ? 'paid' : 'failed';
        if (isFailure) {
          updatedItems[itemIndex].errorMessage = transferData.failReason || 'Rejeitado pelo banco de destino';
        }
        
        await payrollDoc.ref.update({
          items: updatedItems,
          updatedAt: Date.now()
        });
        break;
      }
    }
  }

  // 5. Se a transferência falhou, gerar logs de auditoria e alerta de RH
  if (isFailure && orgId) {
    const alertId = `alert_${transferId}`;
    const targetUserId = transferData.targetUserId || '';
    
    let collaboratorName = 'Colaborador';
    if (targetUserId) {
      const profileSnap = await db.collection('profiles').doc(targetUserId).get();
      if (profileSnap.exists) {
        collaboratorName = profileSnap.data()?.displayName || 'Colaborador';
      }
    }

    // Criar notificação para o RH
    await db.collection(`organizations/${orgId}/notifications`).doc(alertId).set({
      id: alertId,
      title: '⚠️ Falha em Pix de Salário/Adiantamento',
      message: `O Pix no valor de R$ ${Number(transferData.value).toFixed(2)} enviado para ${collaboratorName} falhou. Motivo: ${transferData.failReason || 'Rejeitado pelo banco de destino.'} Verifique os dados bancários cadastrados no perfil do colaborador.`,
      type: 'PAYROLL_FAILED',
      createdAt: Date.now(),
      read: false,
      transferId
    });

    // Registrar auditoria
    await db.collection(`organizations/${orgId}/audit_logs`).doc(`audit_${Date.now()}`).set({
      userId: 'system',
      userName: 'Asaas Webhook',
      action: 'ASAAS_TRANSFER_FAILED',
      targetId: transferId,
      targetType: 'transaction',
      details: `Pix de R$ ${Number(transferData.value).toFixed(2)} para ${collaboratorName} falhou. Motivo: ${transferData.failReason || 'Rejeitado pelo banco de destino'}`,
      timestamp: Date.now()
    });
  }
}
