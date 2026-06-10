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
      case 'support':
        return await handleReadSupport(req, res);
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

  // 2. Obter perfis para separar funcionários de clientes
  const allProfilesSnap = await db.collection('profiles').get();
  const employeeUids = new Set<string>();
  const clientProfileRefs: any[] = [];

  allProfilesSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.role === 'client_admin') {
      clientProfileRefs.push(doc.ref);
    } else {
      employeeUids.add(doc.id);
    }
  });

  // 3. Listar todos os usuários do Firebase Auth e deletar os que não forem funcionários do CRM
  let deletedAuthUsersCount = 0;
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    for (const userRecord of listUsersResult.users) {
      const uid = userRecord.uid;
      // Se não for funcionário do CRM, removemos do Auth
      if (!employeeUids.has(uid)) {
        await admin.auth().deleteUser(uid);
        deletedAuthUsersCount++;
      }
    }
  } catch (authErr: any) {
    console.error('[Cleanup] Erro ao listar/deletar usuários do Firebase Auth:', authErr);
  }

  // 4. Deletar os perfis do tipo client_admin do Firestore
  let deletedProfilesCount = 0;
  if (clientProfileRefs.length > 0) {
    const batch = db.batch();
    clientProfileRefs.forEach((ref) => {
      batch.delete(ref);
      deletedProfilesCount++;
    });
    await batch.commit();
  }

  return res.status(200).json({
    success: true,
    message: 'Limpeza do Firestore e Firebase Auth realizada com sucesso!',
    clientsCleaned: cleanedClientsCount,
    profilesDeleted: deletedProfilesCount,
    authUsersDeleted: deletedAuthUsersCount
  });
}

async function handleReadSupport(req: VercelRequest, res: VercelResponse) {
  const { secret } = req.query;
  if (secret !== 'limpeza123') {
    return res.status(403).json({ error: 'Acesso não autorizado. Secret inválido.' });
  }

  try {
    const snap = await db.collectionGroup('supportRequests').get();
    const list = snap.docs.map(doc => ({
      id: doc.id,
      path: doc.ref.path,
      ...doc.data()
    }));
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao ler chamados', details: error.message });
  }
}
