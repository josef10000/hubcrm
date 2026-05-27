import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdmin, db } from '../_utils/firebase.js';
import fetch from 'node-fetch';

export async function runProcessScheduler(req: VercelRequest, res: VercelResponse) {
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

    // --- PARTE C: MONITORAMENTO DE UPTIME NATIVO (HUB UPTIME ENGINE) ---
    const monitoredClients = await db.collectionGroup('clients')
      .where('isMonitored', '==', true)
      .get();

    console.log(`[Cron] Checando uptime para ${monitoredClients.size} sites de clientes...`);

    const uptimeChecks = monitoredClients.docs.map(async (doc) => {
      const clientData = doc.data();
      let url = clientData.siteLink || '';
      if (!url) return;

      // Sanitizar URL
      url = url.trim().replace(/\s+/g, '');
      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }

      // Evitar bater em URLs locais
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        await doc.ref.update({
          'monitoring.status': 'paused',
          'monitoring.error': 'Endereço local não monitorável'
        });
        return;
      }

      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'HubCrm-UptimeBot/1.0',
            'Accept': '*/*'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - start;
        const status = response.status >= 200 && response.status < 400 ? 'up' : 'down';

        await doc.ref.update({
          'monitoring.status': status,
          'monitoring.lastChecked': Date.now(),
          'monitoring.latency': latency,
          'monitoring.statusCode': response.status,
          'monitoring.error': null
        });

        // Alerta crítico se cair
        if (status === 'down' && clientData.monitoring?.status === 'up') {
          const orgRef = doc.ref.parent.parent;
          if (orgRef) {
            await db.collection('system_alerts').add({
              title: `🚨 Site Fora do Ar: ${clientData.name}`,
              message: `O site ${url} do cliente ${clientData.name} está fora do ar ou retornou erro (HTTP ${response.status}).`,
              type: 'error',
              targetRoles: ['*'],
              createdAt: Date.now(),
              orgId: orgRef.id
            });
          }
        }
      } catch (err: any) {
        const latency = Date.now() - start;
        await doc.ref.update({
          'monitoring.status': 'down',
          'monitoring.lastChecked': Date.now(),
          'monitoring.latency': latency,
          'monitoring.statusCode': null,
          'monitoring.error': err.message || 'Timeout'
        });

        if (clientData.monitoring?.status === 'up') {
          const orgRef = doc.ref.parent.parent;
          if (orgRef) {
            await db.collection('system_alerts').add({
              title: `🚨 Site Fora do Ar: ${clientData.name}`,
              message: `O site ${url} do cliente ${clientData.name} está fora do ar ou não respondeu a tempo (Erro: ${err.message || 'Timeout'}).`,
              type: 'error',
              targetRoles: ['*'],
              createdAt: Date.now(),
              orgId: orgRef.id
            });
          }
        }
      }
    });

    await Promise.all(uptimeChecks);

    return res.status(200).json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('[Cron] Erro crítico:', error);
    return res.status(500).json({ error: error.message });
  }
}
