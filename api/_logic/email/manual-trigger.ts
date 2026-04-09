import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../_utils/firebase.js';
import { verifyAuth } from '../../_utils/authMiddleware.js';
import { 
  sendBoasVindasSubscriptionEmail,
  sendBoasVindasLinkEmail,
  sendFaturaEmitidaEmail, 
  sendFaturaVencimentoEmail 
} from '../../../src/services/emailService.js';
import { logEmailHistory } from '../../_utils/emailLogger.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth check
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { clientId, emailType, userId } = req.body;

    if (!clientId || !emailType || !userId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Security check: ensure the authenticated user owns this data
    if (uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to this resource' });
    }

    const clientRef = db.collection('users').doc(userId).collection('clients').doc(clientId);
    const clientDoc = await clientRef.get();

    if (!clientDoc.exists) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const clientData = clientDoc.data()!;
    if (!clientData.email) {
      return res.status(400).json({ error: 'Client has no email configured' });
    }

    let result;
    let subject = '';
    let type: 'WELCOME' | 'INVOICE' | 'OVERDUE' | 'RECEIPT' | 'WELCOME_SUBSCRIPTION' | 'WELCOME_LINK' = 'WELCOME';

    switch (emailType) {
      case 'WELCOME_SUBSCRIPTION':
        type = 'WELCOME_SUBSCRIPTION';
        subject = 'Bem-vindo ao Hub Symples - Seu plano está pronto!';
        const valSub = clientData.planPrice || 0;
        const dueSub = clientData.nextDueDate ? clientData.nextDueDate.split('-').reverse().join('/') : 'A combinar';
        const linkSub = clientData.invoiceUrl || '';
        if (!linkSub) return res.status(400).json({ error: 'Nenhuma fatura/link disponível para este cliente' });
        
        result = await sendBoasVindasSubscriptionEmail(
          clientData.email, 
          clientData.name,
          valSub,
          dueSub,
          linkSub,
          subject
        );
        break;

      case 'WELCOME_LINK':
        type = 'WELCOME_LINK';
        subject = 'Sua Fatura - Hub Symples';
        const valLink = clientData.planPrice || 0;
        const dueLink = clientData.nextDueDate ? clientData.nextDueDate.split('-').reverse().join('/') : 'A combinar';
        const linkL = clientData.invoiceUrl || '';
        if (!linkL) return res.status(400).json({ error: 'Nenhum link de pagamento disponível para este cliente' });

        result = await sendBoasVindasLinkEmail(
          clientData.email, 
          clientData.name,
          valLink,
          dueLink,
          linkL,
          subject
        );
        break;

      case 'WELCOME':
        // Legado / Fallback - Aposentado mas mantido para não quebrar chamadas antigas
        type = 'WELCOME';
        subject = 'Bem-vindo ao Hub central';
        result = await sendBoasVindasLinkEmail(clientData.email, clientData.name, 0, 'A combinar', '', subject);
        break;
      case 'INVOICE':
        type = 'INVOICE';
        if (!clientData.invoiceUrl) {
          return res.status(400).json({ error: 'No invoice URL available for this client' });
        }
        const valor = clientData.planPrice || 0;
        const vencimento = clientData.nextDueDate ? clientData.nextDueDate.split('-').reverse().join('/') : 'A combinar';
        subject = `Fatura - Plano ${clientData.plan}`;
        result = await sendFaturaEmitidaEmail(
          clientData.email,
          clientData.name,
          valor,
          vencimento,
          clientData.invoiceUrl,
          `Fatura - Plano ${clientData.plan}`,
          subject
        );
        break;
      case 'OVERDUE':
        type = 'OVERDUE';
        if (!clientData.invoiceUrl) {
          return res.status(400).json({ error: 'No invoice URL available for this client' });
        }
        const v = clientData.planPrice || 0;
        const ven = clientData.nextDueDate ? clientData.nextDueDate.split('-').reverse().join('/') : 'A combinar';
        subject = `Cobrança de Atraso - Plano ${clientData.plan}`;
        result = await sendFaturaVencimentoEmail(
          clientData.email,
          clientData.name,
          v,
          ven,
          clientData.invoiceUrl,
          `Cobrança de Atraso - Plano ${clientData.plan}`,
          subject
        );
        break;
      default:
        return res.status(400).json({ error: 'Invalid email type' });
    }

    // Log to history
    await logEmailHistory(userId, clientId, {
      type,
      status: 'sent',
      sentAt: Date.now(),
      recipient: clientData.email,
      subject
    });

    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("Manual Email Trigger Error:", error);
    return res.status(500).json({ error: error.message || 'Erro ao disparar e-mail' });
  }
}
