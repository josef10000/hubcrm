import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { event, payment } = req.body;
    console.log("Asaas Webhook Received:", event, payment?.id);
    
    // Process webhook logic here
    
    return res.status(200).json({ received: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
