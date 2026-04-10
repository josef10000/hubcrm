import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_utils/firebase.js';
import { verifyAuth } from '../_utils/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Verificar Autenticação
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  try {
    // 2. Buscar orgId do usuário logado
    const profileRef = db.collection('profiles').doc(uid);
    const profileSnap = await profileRef.get();
    
    if (!profileSnap.exists) {
      return res.status(403).json({ error: 'Perfil do usuário não encontrado' });
    }

    const { orgId, role } = profileSnap.data()!;

    // Apenas Administradores e Gerentes podem listar a equipe completa/convites
    if (role !== 'Administrador' && role !== 'Gerente') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // 3. Listar membros da organização
    const membersSnap = await db.collection('profiles').where('orgId', '==', orgId).get();
    const members = membersSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // 4. Listar convites pendentes
    const invitesSnap = await db.collection('convites')
      .where('orgId', '==', orgId)
      .get();
    
    const invites = invitesSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })).filter((i: any) => i.status === 'pending'); // Filtro manual se necessário ou query direta

    return res.status(200).json({ 
      success: true, 
      members, 
      invites 
    });
  } catch (error: any) {
    console.error("List Team Error:", error);
    return res.status(500).json({ error: 'Erro ao listar equipe: ' + error.message });
  }
}
