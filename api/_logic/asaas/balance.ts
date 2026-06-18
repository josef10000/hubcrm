import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from '../../_utils/asaas.js';
import { verifyAuth } from '../../_utils/authMiddleware.js';
import { db } from '../../_utils/firebase.js';

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Permission check
    const isAuthorized = await hasFinancePermission(uid);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Acesso negado: Requer privilégios financeiros' });
    }

    // Obter orgId do perfil do usuario
    const profileSnap = await db.collection('profiles').doc(uid).get();
    const orgId = profileSnap.data()?.orgId;
    if (!orgId) {
      return res.status(400).json({ error: 'Organizacao nao encontrada no perfil do usuario' });
    }

    // Obter asaasKey da organizacao
    const prefsDoc = await db.collection('organizations').doc(orgId)
      .collection('settings').doc('preferences').get();
    const asaasKey = prefsDoc.exists ? prefsDoc.data()?.asaas_api_key : null;

    // Call Asaas finance balance endpoint
    const data = await asaasRequest('/finance/balance', 'GET', null, asaasKey);

    // Persist balance snapshot to Firestore for frontend cache
    try {
      if (typeof data.balance === 'number') {
        await db.collection('organizations').doc(orgId)
          .collection('settings').doc('asaas_cache')
          .set({ balance: data.balance, updatedAt: Date.now() }, { merge: true });
      }
    } catch (cacheErr) {
      // Cache save failure should NOT block the response
      console.warn('[Balance] Falha ao gravar cache no Firestore:', cacheErr);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao obter saldo no Asaas');
  }
}
