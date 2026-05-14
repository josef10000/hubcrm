import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { city = 'São Paulo' } = req.query;
  const apiKey = process.env.HubCrm;

  if (!apiKey) {
    return res.status(500).json({ error: 'Weather API key not configured' });
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city as string)}&appid=${apiKey}&units=metric&lang=pt_br`
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Weather API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch weather' });
  }
}
