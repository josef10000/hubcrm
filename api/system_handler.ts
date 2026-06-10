import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import monitorsHandler from './_logic/uptimerobot/monitors.js';
import manualTriggerHandler from './_logic/email/manual-trigger.js';
import { admin, db } from './_utils/firebase.js';

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
      case 'cleanup':
        return await handleCleanup(req, res);
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

async function handleCleanup(req: VercelRequest, res: VercelResponse) {
  // Token simples de segurança para evitar execuções acidentais
  const { secret } = req.query;
  if (secret !== 'limpeza123') {
    return res.status(403).json({ error: 'Acesso não autorizado. Secret inválido.' });
  }

  // 1. Buscar todos os clientes da base (CollectionGroup)
  const clientsSnap = await db.collectionGroup('clients').get();
  let cleanedClientsCount = 0;

  if (!clientsSnap.empty) {
    const batch = db.batch();
    clientsSnap.docs.forEach((doc) => {
      const data = doc.data();
      // Só limpa se houver dados do portal vinculados para otimizar escritas
      if (data.portalLinked || data.portalEmail || data.portalUserUid || data.portalLinkedAt) {
        batch.update(doc.ref, {
          portalLinked: admin.firestore.FieldValue.delete(),
          portalEmail: admin.firestore.FieldValue.delete(),
          portalUserUid: admin.firestore.FieldValue.delete(),
          portalLinkedAt: admin.firestore.FieldValue.delete()
        });
        cleanedClientsCount++;
      }
    });

    if (cleanedClientsCount > 0) {
      await batch.commit();
    }
  }

  // 2. Buscar e deletar todos os perfis com role 'client_admin'
  const profilesSnap = await db
    .collection('profiles')
    .where('role', '==', 'client_admin')
    .get();
  
  let deletedProfilesCount = 0;

  if (!profilesSnap.empty) {
    const batch = db.batch();
    profilesSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedProfilesCount++;
    });
    await batch.commit();
  }

  return res.status(200).json({
    success: true,
    message: 'Limpeza do Firestore realizada com sucesso!',
    clientsCleaned: cleanedClientsCount,
    profilesDeleted: deletedProfilesCount
  });
}
