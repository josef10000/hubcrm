import { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from '../../api/_lib/firebase-admin';
import { verifyAuth } from '../../api/_lib/auth-middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { targetUid, profileData } = req.body;

    // Apenas o próprio usuário ou um Administrador da mesma organização podem editar
    const isEditingSelf = auth.uid === targetUid;
    
    // Buscar perfil de quem está editando e de quem será editado
    const editorProfileRef = adminDb.collection('profiles').doc(auth.uid);
    const editorProfile = await editorProfileRef.get();
    
    if (!editorProfile.exists) {
      return res.status(404).json({ error: 'Perfil do editor não encontrado' });
    }
    
    const editorData = editorProfile.data();
    const isAdmin = editorData?.role === 'Administrador';

    if (!isEditingSelf && !isAdmin) {
      return res.status(403).json({ error: 'Você não tem permissão para editar este perfil' });
    }

    // Se for Admin editando outro membro, verificar se estão na mesma organização
    if (isAdmin && !isEditingSelf) {
      const targetProfileRef = adminDb.collection('profiles').doc(targetUid);
      const targetProfile = await targetProfileRef.get();
      if (!targetProfile.exists || targetProfile.data()?.orgId !== editorData?.orgId) {
        return res.status(403).json({ error: 'Membro não pertence à sua organização' });
      }
    }

    // Trava anti-ciclo para reportsTo
    if (profileData.reportsTo) {
      if (profileData.reportsTo === targetUid) {
        return res.status(400).json({ error: 'Um usuário não pode ser o seu próprio superior' });
      }
      
      // Validação básica de existência do superior (em background/opcional aqui para performance)
      const superiorProfile = await adminDb.collection('profiles').doc(profileData.reportsTo).get();
      if (!superiorProfile.exists) {
        return res.status(400).json({ error: 'Superior imediato não encontrado' });
      }
    }

    // Atualizar perfil
    const profileRef = adminDb.collection('profiles').doc(targetUid);
    await profileRef.set({
      ...profileData,
      updatedAt: Date.now()
    }, { merge: true });

    return res.status(200).json({ success: true, message: 'Perfil atualizado com sucesso' });

  } catch (error: any) {
    console.error('[UpdateProfile] Erro:', error);
    return res.status(500).json({ error: error.message });
  }
}
