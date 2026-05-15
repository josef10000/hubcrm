import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import monitorsHandler from './_logic/uptimerobot/monitors.js';
import manualTriggerHandler from './_logic/email/manual-trigger.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  try {
    switch (action) {
      case 'weather':
        return await handleWeather(req, res);
      case 'uptime':
        return await monitorsHandler(req, res);
      case 'email':
        return await manualTriggerHandler(req, res);
      default:
        return res.status(400).json({ error: 'Ação do sistema inválida ou não especificada' });
    }
  } catch (error: any) {
    console.error(`[SYSTEM_HANDLER] Error in action ${action}:`, error);
    return res.status(500).json({ 
      error: 'Erro interno no processador do sistema', 
      details: error.message 
    });
  }
}

async function handleWeather(req: VercelRequest, res: VercelResponse) {
  const { city = 'São Paulo' } = req.query;
  const apiKey = process.env.HubCrm;

  if (!apiKey) {
    return res.status(500).json({ error: 'Weather API key not configured' });
  }

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city as string)}&appid=${apiKey}&units=metric&lang=pt_br`
  );
  
  if (!response.ok) {
    const errorData = await response.json();
    return res.status(response.status).json(errorData);
  }

  const data = await response.json();
  return res.status(200).json(data);
}
