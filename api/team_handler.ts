import { VercelRequest, VercelResponse } from '@vercel/node';
import { db, getFirebaseAdmin } from './_utils/firebase.js';
import { verifyAuth } from './_utils/authMiddleware.js';
import { sendTeamInviteEmail, sendTeamBroadcastEmail } from '../src/services/emailService.js';
import crypto from 'crypto';
import { logActivity } from './_utils/audit.js';

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
      case 'add-feedback':
        return await handleAddFeedback(req, res, uid!);
      case 'add-asset':
        return await handleAddAsset(req, res, uid!);
      case 'remove-asset':
        return await handleRemoveAsset(req, res, uid!);
      case 'add-milestone':
        return await handleAddMilestone(req, res, uid!);
      case 'update-skills':
        return await handleUpdateSkills(req, res, uid!);
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
  
  await logActivity({
    orgId: senderData.orgId,
    userId: uid,
    userName: senderData.displayName || 'Admin',
    action: 'TEAM_INVITE_SENT',
    targetId: email,
    targetType: 'team',
    details: `Convite enviado para ${email} com a role ${role}`
  });

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

  await logActivity({
    orgId: senderSnap.data()?.orgId,
    userId: uid,
    userName: senderSnap.data()?.displayName || 'Admin',
    action: 'TEAM_MEMBER_REMOVED',
    targetId: targetUid,
    targetType: 'team',
    details: `Membro ${targetUid} removido da organização. Dados deletados: ${deleteAllData}`
  });

  return res.status(200).json({ success: true });
}

async function handleAccept(req: VercelRequest, res: VercelResponse, uid: string) {
  const { token } = req.body;
  let inviteId = token;

  // Se não houver token, buscamos o ID do convite pelo e-mail do usuário autenticado
  if (!inviteId) {
    const user = await getFirebaseAdmin().auth().getUser(uid);
    const invites = await db.collection('convites')
      .where('email', '==', user.email)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
      
    if (invites.empty) return res.status(404).json({ error: 'Convite não encontrado para este e-mail' });
    inviteId = invites.docs[0].id;
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const inviteRef = db.collection('convites').doc(inviteId);
      const inviteSnap = await transaction.get(inviteRef);
      const inviteData = inviteSnap.data();

      // 1. Validações básicas do convite
      if (!inviteSnap.exists || inviteData?.status !== 'pending' || inviteData.expiresAt < Date.now()) {
        throw new Error('Convite inválido, expirado ou já aceito');
      }

      // 2. Validação rigorosa do Usuário Autenticado
      const userRecord = await getFirebaseAdmin().auth().getUser(uid);
      
      // A) Verificar se o e-mail coincide (segurança contra hijacking de sessão/e-mail não verificado)
      if (userRecord.email?.toLowerCase() !== inviteData.email?.toLowerCase()) {
        throw new Error('Este convite foi enviado para outro endereço de e-mail.');
      }

      // B) Exigir e-mail verificado para segurança em SaaS multi-tenancy
      if (!userRecord.emailVerified) {
        throw new Error('Por favor, verifique seu e-mail no Firebase antes de aceitar o convite.');
      }

      // 3. Verificar se o usuário já tem um perfil e se já pertence a outra organização
      const profileRef = db.collection('profiles').doc(uid);
      const profileSnap = await transaction.get(profileRef);
      
      if (profileSnap.exists) {
        const currentProfile = profileSnap.data();
        if (currentProfile?.orgId && currentProfile.orgId !== 'pending' && currentProfile.orgId !== inviteData.orgId) {
          throw new Error('Você já pertence a outra organização. Solicite a remoção antes de aceitar um novo convite.');
        }
      }

      // 4. Preparar Atualização de Perfil (Profile)
      const profileUpdate: any = {
        uid,
        email: userRecord.email,
        displayName: userRecord.displayName || inviteData.email.split('@')[0],
        orgId: inviteData.orgId,
        role: inviteData.role,
        updatedAt: Date.now(),
        acceptedInviteAt: Date.now()
      };

      // Só define createdAt se for um perfil novo
      if (!profileSnap.exists) {
        profileUpdate.createdAt = Date.now();
      }

      // Vínculo de hierarquia
      if (inviteData.invitedBy) {
        profileUpdate.reportsTo = inviteData.invitedBy;
      }

      // EXECUÇÃO ATÔMICA
      transaction.set(profileRef, profileUpdate, { merge: true });
      transaction.update(inviteRef, { 
        status: 'accepted', 
        acceptedBy: uid, 
        acceptedAt: Date.now() 
      });

      return { success: true };
    });

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[handleAccept] Transaction failed:', err.message);
    return res.status(400).json({ error: err.message });
  }
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
  
  const { uids, hasButton, buttonUrl } = req.body;
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
    hasButton,
    buttonUrl
  };

  // Enviar os emails
  await sendTeamBroadcastEmail(recipients, payload);

  return res.status(200).json({ success: true, count: recipients.length });
}

async function handleAddFeedback(req: VercelRequest, res: VercelResponse, uid: string) {
  const { targetUid, feedback } = req.body;
  const isSelf = uid === targetUid;
  
  const senderSnap = await db.collection('profiles').doc(uid).get();
  const senderData = senderSnap.data();
  const isManagement = ['Administrador', 'Gerente', 'People & Culture'].includes(senderData?.role || '');

  if (isSelf) return res.status(403).json({ error: 'Não pode enviar feedback para si mesmo' });
  if (!isManagement) return res.status(403).json({ error: 'Apenas gestores podem enviar feedbacks' });

  await db.collection('profiles').doc(targetUid).update({
    feedbacks: getFirebaseAdmin().firestore.FieldValue.arrayUnion({
      ...feedback,
      id: crypto.randomUUID(),
      fromId: uid,
      fromName: senderData?.displayName || 'Membro da Equipe',
      date: Date.now()
    })
  });

  return res.status(200).json({ success: true });
}

async function handleAddAsset(req: VercelRequest, res: VercelResponse, uid: string) {
  const { targetUid, asset } = req.body;
  const senderSnap = await db.collection('profiles').doc(uid).get();
  if (senderSnap.data()?.role !== 'Administrador') return res.status(403).json({ error: 'Apenas Admins podem gerenciar ativos' });

  const senderData = senderSnap.data();
  const orgId = senderData?.orgId || 'default';

  await db.collection('organizations').doc(orgId).collection('assets').add({
    ...asset,
    assignedTo: targetUid,
    assignedAt: Date.now(),
    orgId
  });

  await logActivity({
    orgId,
    userId: uid,
    userName: senderData.displayName || 'Admin',
    action: 'ASSET_ASSIGNED',
    targetId: targetUid,
    targetType: 'team',
    details: `Ativo ${asset.name} atribuído ao usuário ${targetUid}`
  });

  return res.status(200).json({ success: true });
}

async function handleRemoveAsset(req: VercelRequest, res: VercelResponse, uid: string) {
  const { targetUid, assetId } = req.body;
  const senderSnap = await db.collection('profiles').doc(uid).get();
  if (senderSnap.data()?.role !== 'Administrador') return res.status(403).json({ error: 'Apenas Admins podem remover ativos' });

  const senderData = senderSnap.data();
  const orgId = senderData?.orgId || 'default';

  await db.collection('organizations').doc(orgId).collection('assets').doc(assetId).delete();

  return res.status(200).json({ success: true });
}

async function handleAddMilestone(req: VercelRequest, res: VercelResponse, uid: string) {
  const { targetUid, milestone } = req.body;
  const senderSnap = await db.collection('profiles').doc(uid).get();
  const senderData = senderSnap.data();
  const isManagement = ['Administrador', 'Gerente', 'People & Culture'].includes(senderData?.role || '');

  if (!isManagement) return res.status(403).json({ error: 'Apenas Administradores, Gerentes ou RH podem adicionar marcos' });

  await db.collection('profiles').doc(targetUid).update({
    careerTimeline: getFirebaseAdmin().firestore.FieldValue.arrayUnion({
      ...milestone,
      id: crypto.randomUUID()
    })
  });

  return res.status(200).json({ success: true });
}

async function handleUpdateSkills(req: VercelRequest, res: VercelResponse, uid: string) {
  const { targetUid, skills } = req.body;
  const isSelf = uid === targetUid;
  const senderSnap = await db.collection('profiles').doc(uid).get();
  const senderData = senderSnap.data();
  const isOwner = senderData?.email === 'jfs102019@hotmail.com';
  
  // Aceita tanto o nome amigável quanto o ID da role para maior compatibilidade
  const roleName = typeof senderData?.role === 'object' ? senderData.role.name : senderData?.role;
  const isManagement = isOwner || ['Administrador', 'Gerente', 'People & Culture'].includes(roleName || '');

  // Se for o dono, ignoramos a trava de isSelf
  if (isSelf && !isOwner && roleName !== 'Administrador') {
    return res.status(403).json({ error: 'O colaborador não pode atualizar sua própria matriz de competências' });
  }
  
  if (!isManagement) return res.status(403).json({ error: 'Sem permissão para atualizar competências' });

  await db.collection('profiles').doc(targetUid).set({ skills }, { merge: true });
  return res.status(200).json({ success: true });
}

