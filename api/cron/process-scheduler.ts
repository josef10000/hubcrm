import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdmin, db } from '../_utils/firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { secret } = req.query;
  const admin = getFirebaseAdmin();

  // 1. Validação de Segurança
  if (secret !== process.env.CRON_SECRET) {
    console.error('[Cron] Tentativa de acesso não autorizada');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = admin.firestore.Timestamp.now();
    const results = {
      messagesSent: 0,
      remindersTriggered: 0,
      errors: [] as string[]
    };

    console.log(`[Cron] Iniciando processamento em ${new Date().toISOString()}`);

    // --- PARTE A: MENSAGENS AGENDADAS ---
    // Usamos collectionGroup para buscar em todos os chats de todas as organizações simultaneamente
    const scheduledMessages = await db.collectionGroup('messages')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', now)
      .get();

    for (const msgDoc of scheduledMessages.docs) {
      try {
        const messageData = msgDoc.data();
        const messageRef = msgDoc.ref;
        
        // O path é: organizations/{orgId}/chats/{chatId}/messages/{msgId}
        const chatRef = messageRef.parent.parent;
        if (!chatRef) continue;

        // Atualizar a mensagem para 'sent'
        await messageRef.update({
          status: 'sent',
          createdAt: now // Opcional: ajustar para o momento real do envio
        });

        // Atualizar o preview do chat
        await chatRef.update({
          lastMessage: {
            text: messageData.text,
            senderName: messageData.senderName,
            createdAt: now,
            type: messageData.type || 'text'
          },
          updatedAt: now
        });

        results.messagesSent++;
      } catch (err: any) {
        results.errors.push(`Erro na mensagem ${msgDoc.id}: ${err.message}`);
      }
    }

    // --- PARTE B: LEMBRETES ---
    // organizations/{orgId}/users/{userId}/reminders
    const pendingReminders = await db.collectionGroup('reminders')
      .where('status', '==', 'pending')
      .where('remindAt', '<=', now)
      .get();

    for (const reminderDoc of pendingReminders.docs) {
      try {
        // Por enquanto apenas marcamos como 'triggered'
        // Futuramente aqui pode disparar um Push Notification ou E-mail
        await reminderDoc.ref.update({
          status: 'triggered',
          triggeredAt: now
        });

        // Adicionamos um alerta de sistema para o usuário
        // O path é: organizations/{orgId}/users/{userId}/reminders/{id}
        const userRef = reminderDoc.ref.parent.parent;
        const orgRef = userRef?.parent.parent;
        
        if (orgRef && userRef) {
          await db.collection('system_alerts').add({
            title: '🔔 Lembrete de Mensagem',
            message: `Você pediu para ser lembrado: "${reminderDoc.data().textPreview}"`,
            type: 'info',
            targetRoles: ['*'], // Ou filtrar pelo UID do usuário se houver suporte
            targetUid: userRef.id,
            createdAt: Date.now(),
            link: `/chat/${reminderDoc.data().chatId}`,
            orgId: orgRef.id
          });
        }

        results.remindersTriggered++;
      } catch (err: any) {
        results.errors.push(`Erro no lembrete ${reminderDoc.id}: ${err.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('[Cron] Erro crítico:', error);
    return res.status(500).json({ error: error.message });
  }
}
