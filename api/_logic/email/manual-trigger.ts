import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../_utils/firebase';
import { verifyAuth } from '../../_utils/authMiddleware';
import { 
  sendBoasVindasEmail, 
  sendFaturaEmitidaEmail, 
  sendFaturaVencimentoEmail 
} from '../../src/services/emailService';
import { logEmailHistory } from '../../_utils/emailLogger';

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
    let type: 'WELCOME' | 'INVOICE' | 'OVERDUE' | 'RECEIPT' = 'WELCOME';

    switch (emailType) {
      case 'WELCOME':
        type = 'WELCOME';
        subject = 'Bem-vindo ao Hub central';
        result = await sendBoasVindasEmail(clientData.email, clientData.name);
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
