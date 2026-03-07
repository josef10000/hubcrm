import type { VercelRequest, VercelResponse } from '@vercel/node';

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojk1YjA2OWFjLTNiZDMtNDhiNi1hYWZlLWIwZjY0Mjk5ZDBiYjo6JGFhY2hfOTJlNzdkMTctYmFmYS00YjgwLTg5ZTctMGY0NGY5NGI3MTQx";
const ASAAS_API_URL = "https://api.asaas.com/v3";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { customer, billingType, value, description, dueDate } = req.body;
    
    const response = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
        "User-Agent": "HubCentralCRM"
      },
      body: JSON.stringify({
        customer,
        billingType: billingType || "PIX",
        value,
        dueDate,
        description
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
