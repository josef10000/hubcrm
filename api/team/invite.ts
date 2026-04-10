import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_utils/firebase.js';
import { verifyAuth } from '../_utils/authMiddleware.js';
import { sendTeamInviteEmail } from '../../src/services/emailService.js';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Verificar Autenticação
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, role, collaboratorName } = req.body;

    if (!email || !role || !collaboratorName) {
      return res.status(400).json({ error: 'Faltam parâmetros obrigatórios' });
    }

    // 2. Verificar permissão do remetente no Firestore
    const profileRef = db.collection('profiles').doc(uid);
    const profileSnap = await profileRef.get();
    
    if (!profileSnap.exists) {
      return res.status(403).json({ error: 'Perfil do usuário não encontrado' });
    }

    const senderProfile = profileSnap.data()!;
    if (senderProfile.role !== 'Administrador' && senderProfile.role !== 'Gerente') {
      return res.status(403).json({ error: 'Apenas Administradores ou Gerentes podem convidar membros' });
    }

    // 3. Gerar Token Único
    const token = crypto.randomBytes(32).toString('hex');
    const orgId = senderProfile.orgId;
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 dias

    // 4. Salvar Convite na coleção de topo
    const inviteRef = db.collection('convites').doc(token);
    await inviteRef.set({
      id: token,
      email,
      role,
      orgId,
      token,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt,
      invitedBy: uid
    });

    // 5. Enviar E-mail via Resend
    // O link aponta para uma rota que vamos criar no frontend: /convite/:token
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hubcentral.vercel.app';
    const inviteLink = `${baseUrl}/convite/${token}`;
    
    await sendTeamInviteEmail(email, collaboratorName, role, inviteLink);

    console.log(`[Team] Convite enviado para ${email} (Role: ${role}, Org: ${orgId})`);
    return res.status(200).json({ success: true, message: 'Convite enviado com sucesso' });
  } catch (error: any) {
    console.error("Invite Error:", error);
    return res.status(500).json({ error: 'Erro ao processar convite: ' + error.message });
  }
}
