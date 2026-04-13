import { VercelRequest, VercelResponse } from '@vercel/node';
import { db, getFirebaseAdmin } from './_utils/firebase.js';
import { verifyAuth } from './_utils/authMiddleware.js';
import { sendTeamInviteEmail, sendTeamBroadcastEmail } from '../src/services/emailService.js';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  // 1. Verificar Autenticação (Comum a quase todos, exceto Accept que pode ser anônimo mas aqui validamos o token)
  const uid = await verifyAuth(req, res);
  if (!uid && action !== 'accept') return; // Se não for accept, precisa de UID

  try {
    switch (action) {
      case 'list':
        return await handleList(req, res, uid!);
      case 'invite':
        return await handleInvite(req, res, uid!);
      case 'remove':
        return await handleRemove(req, res, uid!);
      case 'accept':
        return await handleAccept(req, res, uid!);
      case 'cancel-invite':
        return await handleCancelInvite(req, res, uid!);
      case 'update-profile':
        return await handleUpdateProfile(req, res, uid!);
      case 'broadcast':
        return await handleBroadcast(req, res, uid!);
      default:
        return res.status(400).json({ error: 'Ação inválida ou não fornecida' });
    }
  } catch (error: any) {
    console.error(`[TeamHandler] Erro na ação ${action}:`, error);
    return res.status(500).json({ error: error.message });
  }
}

// ── Handlers de Equipe ────────────────────────────────────────────────────────

async function handleList(req: VercelRequest, res: VercelResponse, uid: string) {
  const profileSnap = await db.collection('profiles').doc(uid).get();
  if (!profileSnap.exists) return res.status(403).json({ error: 'Perfil não encontrado' });

  const { orgId, role } = profileSnap.data()!;
  if (role !== 'Administrador' && role !== 'Gerente') return res.status(403).json({ error: 'Acesso negado' });

  const membersSnap = await db.collection('profiles').where('orgId', '==', orgId).get();
  const members = membersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

  const invitesSnap = await db.collection('convites').where('orgId', '==', orgId).where('status', '==', 'pending').get();
  const invites = invitesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return res.status(200).json({ success: true, members, invites });
}

async function handleInvite(req: VercelRequest, res: VercelResponse, uid: string) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const { email, role, collaboratorName } = req.body;

  const profileSnap = await db.collection('profiles').doc(uid).get();
  const senderData = profileSnap.data();
  if (senderData?.role !== 'Administrador' && senderData?.role !== 'Gerente') {
    return res.status(403).json({ error: 'Permissão negada para convidar' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);

  await db.collection('convites').doc(token).set({
    id: token, email, role, orgId: senderData.orgId, token, status: 'pending', createdAt: Date.now(), expiresAt, invitedBy: uid
  });

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${req.headers.host}`;
  await sendTeamInviteEmail(email, collaboratorName, role, `${baseUrl}/convite/${token}`);

  return res.status(200).json({ success: true, message: 'Convite enviado' });
}

async function handleRemove(req: VercelRequest, res: VercelResponse, uid: string) {
  const { targetUid, deleteAllData } = req.body;
  if (uid === targetUid) return res.status(400).json({ error: 'Não pode remover a si mesmo' });

  const senderSnap = await db.collection('profiles').doc(uid).get();
  if (senderSnap.data()?.role !== 'Administrador') return res.status(403).json({ error: 'Apenas Admins podem remover' });

  const targetRef = db.collection('profiles').doc(targetUid);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists || targetSnap.data()?.orgId !== senderSnap.data()?.orgId) {
    return res.status(403).json({ error: 'Membro inválido ou de outra organização' });
  }

  const batch = db.batch();
  if (deleteAllData === true) {
    const leads = await db.collection('leads').where('assignedTo', '==', targetUid).get();
    leads.forEach(d => batch.delete(d.ref));
    const clients = await db.collection('clients').where('assignedTo', '==', targetUid).get();
    clients.forEach(d => batch.delete(d.ref));
  }
  batch.delete(targetRef);
  await batch.commit();
  return res.status(200).json({ success: true });
}

async function handleAccept(req: VercelRequest, res: VercelResponse, uid: string) {
  const { token } = req.body;
  let inviteSnap;

  if (token) {
    inviteSnap = await db.collection('convites').doc(token).get();
  } else {
    const user = await getFirebaseAdmin().auth().getUser(uid);
    const invites = await db.collection('convites').where('email', '==', user.email).where('status', '==', 'pending').limit(1).get();
    if (invites.empty) return res.status(404).json({ error: 'Convite não encontrado' });
    inviteSnap = invites.docs[0];
  }

  const inviteData = inviteSnap.data();
  if (!inviteSnap.exists || inviteData?.status !== 'pending' || inviteData.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Convite inválido ou expirado' });
  }

  const userRecord = await getFirebaseAdmin().auth().getUser(uid);
  await db.collection('profiles').doc(uid).set({
    uid, email: userRecord.email, displayName: userRecord.displayName || inviteData.email.split('@')[0],
    orgId: inviteData.orgId, role: inviteData.role, createdAt: Date.now(), acceptedInviteAt: Date.now()
  }, { merge: true });

  await inviteSnap.ref.update({ status: 'accepted', acceptedBy: uid, acceptedAt: Date.now() });
  return res.status(200).json({ success: true });
}

async function handleCancelInvite(req: VercelRequest, res: VercelResponse, uid: string) {
  const { inviteId } = req.body;
  const senderSnap = await db.collection('profiles').doc(uid).get();
  const senderData = senderSnap.data();
  if (senderData?.role !== 'Administrador' && senderData?.role !== 'Gerente') return res.status(403).json({ error: 'Acesso negado' });

  const inviteRef = db.collection('convites').doc(inviteId);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists || inviteSnap.data()?.orgId !== senderData.orgId) return res.status(403).json({ error: 'Convite inválido' });

  await inviteRef.delete();
  return res.status(200).json({ success: true });
}

async function handleUpdateProfile(req: VercelRequest, res: VercelResponse, uid: string) {
  const { targetUid, profileData } = req.body;
  const isEditingSelf = uid === targetUid;
  const editorSnap = await db.collection('profiles').doc(uid).get();
  const editorData = editorSnap.data();
  const isAdmin = editorData?.role === 'Administrador';

  if (!isEditingSelf && !isAdmin) return res.status(403).json({ error: 'Permissão negada' });

  if (isAdmin && !isEditingSelf) {
    const targetSnap = await db.collection('profiles').doc(targetUid).get();
    if (!targetSnap.exists || targetSnap.data()?.orgId !== editorData?.orgId) {
      return res.status(403).json({ error: 'Membro de outra organização' });
    }
  }

  if (profileData?.reportsTo === targetUid) return res.status(400).json({ error: 'Não pode reportar a si mesmo' });

  await db.collection('profiles').doc(targetUid).set({ ...profileData, updatedAt: Date.now() }, { merge: true });
  return res.status(200).json({ success: true });
}

async function handleBroadcast(req: VercelRequest, res: VercelResponse, uid: string) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  
  const { uids, subject, message, hasButton, buttonText, buttonUrl } = req.body;
  if (!uids || !Array.isArray(uids) || uids.length === 0) {
    return res.status(400).json({ error: 'Nenhum destinatário informado' });
  }

  // Verifica permissão
  const senderSnap = await db.collection('profiles').doc(uid).get();
  const senderData = senderSnap.data();
  if (senderData?.role !== 'Administrador' && senderData?.role !== 'Gerente' && senderData?.role !== 'People & Culture') {
    return res.status(403).json({ error: 'Acesso negado para enviar comunicados' });
  }

  // Busca emails da organização para os uids selecionados
  // Note: Firestore 'in' query has a limit of 30 items per batch. 
  // For small teams this is fine, for large teams we chunk it.
  const recipients: {email: string; name: string}[] = [];
  
  // Chunck UIDs into batches of 30 to bypass firestore limits
  const chunkSize = 30;
  for (let i = 0; i < uids.length; i += chunkSize) {
    const chunk = uids.slice(i, i + chunkSize);
    const profilesSnap = await db.collection('profiles')
      .where('orgId', '==', senderData.orgId)
      .where('__name__', 'in', chunk)
      .get();
      
    profilesSnap.docs.forEach(d => {
      const pData = d.data();
      if (pData.email) {
        recipients.push({
          email: pData.email,
          name: pData.displayName ? pData.displayName.split(' ')[0] : 'Time'
        });
      }
    });
  }

  if (recipients.length === 0) {
    return res.status(400).json({ error: 'Nenhum e-mail válido encontrado para os usuários selecionados' });
  }

  // Define os dados a enviar
  const payload = {
    subject,
    message,
    hasButton,
    buttonText,
    buttonUrl
  };

  // Enviar os emails
  await sendTeamBroadcastEmail(recipients, payload);

  return res.status(200).json({ success: true, count: recipients.length });
}
