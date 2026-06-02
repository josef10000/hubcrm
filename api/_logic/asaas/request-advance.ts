import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from '../../_utils/asaas.js';
import { verifyAuth } from '../../_utils/authMiddleware.js';
import { db } from '../../_utils/firebase.js';
import { logActivity } from '../../_utils/audit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth check - Qualquer colaborador autenticado pode solicitar
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valor do adiantamento inválido' });
    }

    // Buscar perfil do colaborador solicitante
    const profileSnap = await db.collection('profiles').doc(uid).get();
    if (!profileSnap.exists) {
      return res.status(404).json({ error: 'Perfil do colaborador não encontrado' });
    }
    const profile = profileSnap.data();

    if (!profile) {
      return res.status(404).json({ error: 'Dados do perfil inválidos' });
    }

    const orgId = profile.orgId || 'default';
    const salary = Number(profile.salary) || 0;

    // 1. Validar se possui salário base
    if (salary <= 0) {
      return res.status(400).json({ 
        error: 'Para solicitar adiantamento salarial, é necessário ter um salário base configurado no seu perfil pelo RH.' 
      });
    }

    // 2. Validar se possui chave Pix
    if (!profile.pixKey || !profile.pixKeyType) {
      return res.status(400).json({ 
        error: 'Para solicitar adiantamento salarial, configure sua chave Pix na aba de edição de perfil.' 
      });
    }

    // 3. Obter mês corrente de Brasília (competência)
    const now = new Date();
    // Como o fuso horário da aplicação é America/Sao_Paulo (UTC-3), deslocamos o tempo para obter ano e mês exatos.
    const brTime = new Date(now.getTime() - 3 * 3600 * 1000);
    const year = brTime.getUTCFullYear();
    const month = String(brTime.getUTCMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${month}`;

    // 4. Verificar se já existe algum adiantamento para este colaborador no mês atual
    const advancesSnap = await db.collection('organizations').doc(orgId).collection('salary_advances')
      .where('userId', '==', uid)
      .where('month', '==', currentMonth)
      .get();

    if (!advancesSnap.empty) {
      return res.status(400).json({ 
        error: 'Você já solicitou um adiantamento salarial para este mês de competência.' 
      });
    }

    // 5. Validar limite de 30% do salário base
    const maxAllowed = salary * 0.3;
    if (amount > maxAllowed) {
      return res.status(400).json({ 
        error: `O valor solicitado (R$ ${Number(amount).toFixed(2)}) excede o seu limite máximo permitido de 30% do salário (R$ ${maxAllowed.toFixed(2)}).` 
      });
    }

    // 6. Configurar payload Asaas
    let asaasKeyType = profile.pixKeyType;
    if (profile.pixKeyType === 'RANDOM') asaasKeyType = 'EVP';

    const asaasPayload = {
      value: Number(amount),
      description: `Adiantamento Salarial - ${profile.displayName} - Competência ${currentMonth}`,
      pixAddressKey: profile.pixKey,
      pixAddressKeyType: asaasKeyType
    };

    // 7. Executar transferência no Asaas
    const asaasRes = await asaasRequest('/transfers', 'POST', asaasPayload);

    // 8. Gravar registro em salary_advances no Firestore
    const advanceRef = db.collection('organizations').doc(orgId).collection('salary_advances').doc();
    const newAdvance = {
      id: advanceRef.id,
      userId: uid,
      userName: profile.displayName || 'Colaborador',
      amount: Number(amount),
      month: currentMonth,
      requestedAt: Date.now(),
      status: 'pending_repayment',
      asaasTransferId: asaasRes.id
    };
    await advanceRef.set(newAdvance);

    // 9. Lançar despesa automática no caixa do CRM
    const transactionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const newTransaction = {
      id: transactionId,
      description: `Adiantamento Salarial - ${profile.displayName} (Ref: ${currentMonth})`,
      amount: Number(amount),
      date: Date.now(),
      type: 'EXPENSE',
      status: 'PAID',
      categoryId: 'payroll', // Categoria de folha de pagamento
      categoryName: 'Folha de Pagamento'
    };
    await db.collection('organizations').doc(orgId).collection('transactions').doc(transactionId).set(newTransaction);

    // 10. Gravar auditoria no CRM
    await logActivity({
      orgId,
      userId: uid,
      userName: profile.displayName || 'Colaborador',
      action: 'SALARY_ADVANCE_REQUESTED',
      targetId: advanceRef.id,
      targetType: 'transaction',
      details: `Adiantamento de R$ ${Number(amount).toFixed(2)} solicitado e processado via Pix Asaas (Transfer ID: ${asaasRes.id})`
    });

    return res.status(200).json({
      success: true,
      advance: newAdvance,
      asaasResult: asaasRes
    });

  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao processar adiantamento salarial no Asaas');
  }
}
