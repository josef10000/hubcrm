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
    let inviteRef;
    let inviteSnap;

    if (token) {
      inviteRef = db.collection('convites').doc(token);
      inviteSnap = await inviteRef.get();
    } else {
      // Se não houver token, buscamos por e-mail do usuário logado (Auto-accept)
      const adminAuth = getFirebaseAdmin().auth();
      const user = await adminAuth.getUser(uid);
      const email = user.email;

      if (!email) {
        return res.status(400).json({ error: 'E-mail do usuário não encontrado para auto-aceite' });
      }

      const invitesSnap = await db.collection('convites')
        .where('email', '==', email)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (invitesSnap.empty) {
        return res.status(404).json({ error: 'Nenhum convite pendente encontrado para este e-mail' });
      }

      inviteRef = invitesSnap.docs[0].ref;
      inviteSnap = invitesSnap.docs[0];
    }

    if (!inviteSnap.exists) {
      return res.status(404).json({ error: 'Convite não encontrado ou inválido' });
    }

    const inviteData = inviteSnap.data()!;

    // 3. Validações de status e expiração
    if (inviteData.status !== 'pending' && inviteData.acceptedBy !== uid) {
      return res.status(400).json({ error: 'Este convite já foi utilizado por outra pessoa ou expirou' });
    }

    if (inviteData.expiresAt < Date.now() && inviteData.status === 'pending') {
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
