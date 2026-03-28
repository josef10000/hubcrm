import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'UPTIMEROBOT_API_KEY is not configured in environment variables.' });
  }

  const baseUrl = 'https://api.uptimerobot.com/v2';

  try {
    if (req.method === 'GET') {
      // Get all monitors
      const response = await fetch(`${baseUrl}/getMonitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: new URLSearchParams({
          api_key: apiKey,
          format: 'json',
          logs: '1',
        }),
      });

      const data = await response.json();
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded', 
          retryAfter: response.headers.get('Retry-After') 
        });
      }

      if (data.stat === 'ok') {
        return res.status(200).json(data.monitors);
      } else {
        return res.status(400).json({ error: data.error?.message || 'Failed to fetch monitors' });
      }
    } 
    
    else if (req.method === 'POST') {
      // Create a new monitor
      const { friendly_name, url } = req.body;
      
      if (!friendly_name || !url) {
        return res.status(400).json({ error: 'friendly_name and url are required' });
      }

      const response = await fetch(`${baseUrl}/newMonitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: new URLSearchParams({
          api_key: apiKey,
          format: 'json',
          type: '1', // HTTP(s)
          url: url,
          friendly_name: friendly_name,
        }),
      });

      const data = await response.json();

      if (data.stat === 'ok') {
        return res.status(200).json(data.monitor);
      } else {
        return res.status(400).json({ error: data.error?.message || 'Failed to create monitor' });
      }
    }

    else if (req.method === 'DELETE') {
      // Delete a monitor
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'monitor id is required' });
      }

      const response = await fetch(`${baseUrl}/deleteMonitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: new URLSearchParams({
          api_key: apiKey,
          format: 'json',
          id: id.toString(),
        }),
      });

      const data = await response.json();

      if (data.stat === 'ok') {
        return res.status(200).json({ success: true });
      } else {
        return res.status(400).json({ error: data.error?.message || 'Failed to delete monitor' });
      }
    }

    else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('UptimeRobot API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
