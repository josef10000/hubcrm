import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, getFirebaseAdmin } from '../_utils/firebase.js';
import { verifyAuth } from '../_utils/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Verificar Autenticação
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token de convite é obrigatório' });
    }

    // 2. Verificar o convite no Firestore
    const inviteRef = db.collection('convites').doc(token);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      return res.status(404).json({ error: 'Convite não encontrado ou inválido' });
    }

    const inviteData = inviteSnap.data()!;

    // 3. Validações de status e expiração
    if (inviteData.status !== 'pending') {
      return res.status(400).json({ error: 'Este convite já foi utilizado ou está expirado' });
    }

    if (inviteData.expiresAt < Date.now()) {
      await inviteRef.update({ status: 'expired' });
      return res.status(400).json({ error: 'Este convite expirou' });
    }

    // 4. Aceitar Convite
    const profileRef = db.collection('profiles').doc(uid);
    const profileSnap = await profileRef.get();

    const admin = getFirebaseAdmin();
    const userRecord = await admin.auth().getUser(uid);
    
    await profileRef.set({
      uid: uid,
      email: userRecord.email || inviteData.email,
      displayName: userRecord.displayName || inviteData.email.split('@')[0],
      orgId: inviteData.orgId,
      role: inviteData.role,
      createdAt: profileSnap.exists ? (profileSnap.data()?.createdAt || Date.now()) : Date.now(),
      acceptedInviteAt: Date.now()
    }, { merge: true });

    // 5. Atualizar status do convite
    await inviteRef.update({ 
      status: 'accepted',
      acceptedBy: uid,
      acceptedAt: Date.now()
    });

    console.log(`[Team] Convite aceito pelo usuário ${uid} para Org: ${inviteData.orgId} como ${inviteData.role}`);
    return res.status(200).json({ success: true, message: 'Convite aceito com sucesso!' });
  } catch (error: any) {
    console.error("Accept Invite Error:", error);
    return res.status(500).json({ error: 'Erro ao aceitar convite: ' + error.message });
  }
}
