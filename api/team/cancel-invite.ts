import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_utils/firebase.js';
import { verifyAuth } from '../_utils/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Verificar Autenticação do solicitante
  const senderUid = await verifyAuth(req, res);
  if (!senderUid) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { inviteId } = req.body;

    if (!inviteId) {
      return res.status(400).json({ error: 'ID do convite é obrigatório' });
    }

    // 2. Verificar se o solicitante é Administrador ou Gerente
    const senderProfileSnap = await db.collection('profiles').doc(senderUid).get();
    if (!senderProfileSnap.exists) {
      return res.status(403).json({ error: 'Perfil do remetente não encontrado' });
    }
    const senderData = senderProfileSnap.data()!;
    if (senderData.role !== 'Administrador' && senderData.role !== 'Gerente') {
      return res.status(403).json({ error: 'Apenas Administradores ou Gerentes podem cancelar convites' });
    }

    // 3. Verificar o convite
    const inviteRef = db.collection('convites').doc(inviteId);
    const inviteSnap = await inviteRef.get();
    
    if (!inviteSnap.exists) {
      return res.status(404).json({ error: 'Convite não encontrado' });
    }
    
    const inviteData = inviteSnap.data()!;
    if (inviteData.orgId !== senderData.orgId) {
      return res.status(403).json({ error: 'Este convite não pertence à sua organização' });
    }

    // 4. Deletar Convite
    await inviteRef.delete();

    console.log(`[Team] Convite ${inviteId} cancelado por ${senderUid}`);
    return res.status(200).json({ success: true, message: 'Convite cancelado com sucesso' });

  } catch (error: any) {
    console.error("Cancel Invite Error:", error);
    return res.status(500).json({ error: 'Erro ao cancelar convite: ' + error.message });
  }
}
