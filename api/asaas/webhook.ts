import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { event, payment } = req.body;
    console.log("Asaas Webhook Received:", event, payment?.id);
    
    // In a real scenario, you would update Firebase here using firebase-admin.
    
    return res.status(200).send("OK");
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return res.status(500).send("Error");
  }
}
