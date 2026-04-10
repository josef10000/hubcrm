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
    const { targetUid, deleteAllData } = req.body;

    if (!targetUid) {
      return res.status(400).json({ error: 'UID do membro é obrigatório' });
    }

    if (senderUid === targetUid) {
      return res.status(400).json({ error: 'Você não pode remover a si mesmo' });
    }

    // 2. Verificar se o solicitante é Administrador
    const senderProfileSnap = await db.collection('profiles').doc(senderUid).get();
    if (!senderProfileSnap.exists) {
      return res.status(403).json({ error: 'Perfil do remetente não encontrado' });
    }
    const senderData = senderProfileSnap.data()!;
    if (senderData.role !== 'Administrador') {
      return res.status(403).json({ error: 'Apenas Administradores podem remover membros' });
    }

    // 3. Verificar se o alvo pertence à mesma organização
    const targetProfileRef = db.collection('profiles').doc(targetUid);
    const targetProfileSnap = await targetProfileRef.get();
    
    if (!targetProfileSnap.exists) {
      return res.status(404).json({ error: 'Membro não encontrado' });
    }
    const targetData = targetProfileSnap.data()!;
    if (targetData.orgId !== senderData.orgId) {
      return res.status(403).json({ error: 'Este membro não pertence à sua organização' });
    }

    const batch = db.batch();

    // 4. Se solicitado, apagar tudo o que o funcionário fez (Leads e Clientes vinculados)
    if (deleteAllData === true) {
      console.log(`[Team] Realizando limpeza profunda para o usuário ${targetUid}`);
      
      // Buscar Leads vinculados
      const leadsSnap = await db.collection('leads').where('assignedTo', '==', targetUid).get();
      leadsSnap.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Buscar Clientes vinculados
      const clientsSnap = await db.collection('clients').where('assignedTo', '==', targetUid).get();
      clientsSnap.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      console.log(`[Team] ${leadsSnap.size} leads e ${clientsSnap.size} clientes marcados para exclusão.`);
    }

    // 5. Remover Perfil
    batch.delete(targetProfileRef);

    await batch.commit();

    console.log(`[Team] Membro ${targetUid} removido por ${senderUid}. Limpeza de dados: ${deleteAllData}`);
    return res.status(200).json({ success: true, message: 'Membro removido com sucesso' });

  } catch (error: any) {
    console.error("Remove Member Error:", error);
    return res.status(500).json({ error: 'Erro ao remover membro: ' + error.message });
  }
}
