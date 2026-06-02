import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from '../../_utils/asaas.js';
import { verifyAuth } from '../../_utils/authMiddleware.js';
import { db } from '../../_utils/firebase.js';
import { logActivity } from '../../_utils/audit.js';

async function hasFinancePermission(uid: string): Promise<boolean> {
  const profileSnap = await db.collection('profiles').doc(uid).get();
  if (!profileSnap.exists) return false;
  const profileData = profileSnap.data();

  // 1. Super Admin por email
  if (profileData?.email === 'jfs102019@hotmail.com') return true;

  // 2. Cargos de gerência/financeiros comuns
  const role = profileData?.role;
  const roleName = typeof role === 'string' ? role : typeof role === 'object' ? role?.name : '';
  const matchRoles = ['Administrador', 'Gerente', 'FinOps', 'Diretor', 'Financeiro'];
  if (roleName && matchRoles.includes(roleName)) return true;

  // 3. Verificação explícita de permissões do usuário
  if (profileData?.permissions && Array.isArray(profileData.permissions)) {
    if (profileData.permissions.includes('MANAGE_FINANCE')) return true;
  }

  // 4. Verificação de permissões do cargo cadastrado na organização
  const roleId = profileData?.roleId;
  const orgId = profileData?.orgId;
  if (orgId && roleId) {
    const roleSnap = await db.collection('organizations').doc(orgId).collection('roles').doc(roleId).get();
    if (roleSnap.exists) {
      const perms = roleSnap.get('permissions');
      if (Array.isArray(perms) && perms.includes('MANAGE_FINANCE')) return true;
    }
  }

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth check
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Permission check
    const isAuthorized = await hasFinancePermission(uid);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Acesso negado: Requer privilégios financeiros' });
    }

    const { 
      value, 
      pixAddressKey, 
      pixAddressKeyType, 
      bankAccount, 
      description,
      targetUserId,
      type // 'salary' | 'advance' | 'vacation'
    } = req.body;

    if (!value || value <= 0) {
      return res.status(400).json({ error: 'Valor da transferência inválido' });
    }

    const profileSnap = await db.collection('profiles').doc(uid).get();
    const editorProfile = profileSnap.data();
    const orgId = editorProfile?.orgId || 'default';

    let asaasPayload: any = {
      value: Number(value),
      description: description || 'Transferência do HubCRM'
    };

    if (pixAddressKey && pixAddressKeyType) {
      // Transfer via Pix Key
      // Asaas key types: CPF, CNPJ, EMAIL, PHONE, EVP (chave aleatória)
      let asaasKeyType = pixAddressKeyType;
      if (pixAddressKeyType === 'RANDOM') asaasKeyType = 'EVP';
      
      asaasPayload.pixAddressKey = pixAddressKey;
      asaasPayload.pixAddressKeyType = asaasKeyType;
    } else if (bankAccount) {
      // Transfer via Bank Account
      const accountTypeMapped = bankAccount.accountType === 'SAVINGS' ? 'CONTA_POUPANCA' : 'CONTA_CORRENTE';
      asaasPayload.bank = {
        code: bankAccount.bankCode
      };
      asaasPayload.bankAccount = {
        ownerName: bankAccount.holderName,
        cpfCnpj: bankAccount.holderCpfCnpj,
        agency: bankAccount.agency,
        account: bankAccount.account,
        accountDigit: bankAccount.accountDigit,
        bankAccountType: accountTypeMapped
      };
    } else {
      return res.status(400).json({ error: 'É necessário informar uma chave Pix ou dados de conta bancária' });
    }

    // Call Asaas transfer endpoint
    const data = await asaasRequest('/transfers', 'POST', asaasPayload);

    // Audit logs inside CRM
    await logActivity({
      orgId,
      userId: uid,
      userName: editorProfile?.displayName || 'Financeiro',
      action: 'ASAAS_TRANSFER_SENT',
      targetId: targetUserId || 'asaas',
      targetType: 'transaction',
      details: `Transferência Asaas de R$ ${Number(value).toFixed(2)} enviada com sucesso. Tipo: ${type || 'finance'}. ID Asaas: ${data.id}`
    });

    return res.status(200).json(data);
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao processar transferência no Asaas');
  }
}
