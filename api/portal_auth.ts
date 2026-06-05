import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_utils/firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, uid } = req.body;

    if (!email || !uid) {
      return res.status(400).json({ error: 'Parâmetros email e uid são obrigatórios.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Busca em lote em todas as organizações por um cliente com o e-mail fornecido
    const clientsQuery = await db
      .collectionGroup('clients')
      .where('email', '==', cleanEmail)
      .limit(1)
      .get();

    if (clientsQuery.empty) {
      console.warn(`[PortalAuth] E-mail não encontrado em nenhum card de cliente: ${cleanEmail}`);
      return res.status(404).json({ 
        error: 'Este e-mail não está associado a nenhuma empresa no sistema. Solicite ao suporte que insira seu e-mail no seu cadastro.' 
      });
    }

    const clientDoc = clientsQuery.docs[0];
    const clientId = clientDoc.id;
    const orgId = clientDoc.ref.parent.parent?.id;

    if (!orgId) {
      console.error(`[PortalAuth] Erro ao extrair orgId para o cliente ${clientId}`);
      return res.status(500).json({ error: 'Erro de integrabilidade estrutural do banco.' });
    }

    // 2. Cria ou atualiza o perfil do usuário na coleção /profiles
    const profileRef = db.collection('profiles').doc(uid);
    await profileRef.set({
      email: cleanEmail,
      role: 'client_admin',
      orgId: orgId,
      clientId: clientId,
      updatedAt: new Date()
    }, { merge: true });

    console.log(`[PortalAuth] Vinculado com sucesso: ${cleanEmail} -> org: ${orgId}, client: ${clientId}`);

    return res.status(200).json({
      success: true,
      orgId,
      clientId
    });

  } catch (error: any) {
    console.error("[PortalAuth] Erro crítico na vinculação:", error);
    return res.status(500).json({ error: 'Erro interno ao autenticar e vincular conta do portal.' });
  }
}
