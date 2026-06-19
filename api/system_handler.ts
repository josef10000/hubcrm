import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import monitorsHandler from './_logic/uptimerobot/monitors.js';
import manualTriggerHandler from './_logic/email/manual-trigger.js';
import { admin, db } from './_utils/firebase.js';
import { verifyAuth } from './_utils/authMiddleware.js';
import { processSingleOrgReconciliation } from './_cron/finance_reconciler.js';
import { processOrganizationFinance } from './_cron/finance_engine.js';

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
      case 'youtube-search':
        return await handleYoutubeSearch(req, res);
      case 'force-task':
        return await handleForceTask(req, res);
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

async function handleForceTask(req: VercelRequest, res: VercelResponse) {
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { taskKey } = req.body;
  if (!taskKey) {
    return res.status(400).json({ error: 'taskKey é obrigatório' });
  }

  try {
    const results = {
      processedOrgs: 1,
      syncedClients: 0,
      updatedClients: 0,
      errors: [] as string[]
    };

    const docRef = db.collection('organizations').doc(uid).collection('settings').doc('usage');

    if (taskKey === 'lastBillingScan') {
      const orgDoc = await db.collection('organizations').doc(uid).get();
      if (!orgDoc.exists) {
        return res.status(404).json({ error: 'Organização não encontrada' });
      }
      
      await processSingleOrgReconciliation(uid, orgDoc.data(), results);
      
      if (results.errors.length > 0) {
        return res.status(500).json({ error: 'Erro ao executar reconciliador', details: results.errors });
      }

      await docRef.set({ lastBillingScan: Date.now() }, { merge: true });
      return res.status(200).json({ success: true, results });

    } else if (taskKey === 'lastCfoSync') {
      await processOrganizationFinance(uid);
      await docRef.set({ lastCfoSync: Date.now() }, { merge: true });
      return res.status(200).json({ success: true });
      
    } else {
      return res.status(400).json({ error: 'taskKey inválida ou não suportada' });
    }

  } catch (error: any) {
    console.error(`[Force Task Error] ${taskKey}:`, error);
    return res.status(500).json({ error: error.message || 'Erro ao forçar execução da tarefa' });
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
    const supportSnap = await db.collectionGroup('supportRequests').get();
    const supportList = supportSnap.docs.map(doc => ({
      id: doc.id,
      path: doc.ref.path,
      ...doc.data()
    }));

    const profilesSnap = await db.collection('profiles').get();
    const profilesList = profilesSnap.docs.map(doc => ({
      id: doc.id,
      path: doc.ref.path,
      ...doc.data()
    }));

    return res.status(200).json({
      supportRequests: supportList,
      profiles: profilesList
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao ler dados de suporte e perfis', details: error.message });
  }
}

async function handleYoutubeSearch(req: VercelRequest, res: VercelResponse) {
  const { q } = req.query;

  if (!q || typeof q !== 'string' || !q.trim()) {
    return res.status(400).json({ error: 'Termo de busca (q) é obrigatório' });
  }

  const queryTerm = q.trim();
  
  // Normalizar a query para o ID do documento do Firestore
  const normalizedQuery = queryTerm
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // remove especiais
    .trim()
    .replace(/\s+/g, '_'); // espaços para underscores

  if (!normalizedQuery) {
    return res.status(400).json({ error: 'Termo de busca inválido' });
  }

  try {
    const cacheRef = db.collection('youtubeSearchCache').doc(normalizedQuery);
    const cacheSnap = await cacheRef.get();

    if (cacheSnap.exists) {
      const cacheData = cacheSnap.data();
      const ageMs = Date.now() - (cacheData?.createdAt || 0);
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      if (ageMs < thirtyDaysMs && Array.isArray(cacheData?.results)) {
        console.log(`[YouTube Search] Cache hit para query: "${queryTerm}"`);
        return res.status(200).json({ results: cacheData.results, cached: true });
      }
    }

    const apiKey = process.env.youtube;
    if (!apiKey) {
      console.error('[YouTube Search] Variável de ambiente "youtube" não configurada.');
      return res.status(500).json({ error: 'YouTube API Key não configurada no servidor' });
    }

    console.log(`[YouTube Search] Cache miss. Buscando na API do YouTube para: "${queryTerm}"`);
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryTerm)}&type=video&maxResults=8&key=${apiKey}`;
    
    const ytRes = await fetch(youtubeUrl);
    
    if (!ytRes.ok) {
      const errorText = await ytRes.text();
      console.error('[YouTube Search] Erro na API do YouTube:', errorText);
      return res.status(500).json({ error: 'Erro ao buscar dados na API do YouTube', details: errorText });
    }

    const ytData = await ytRes.json() as any;
    
    const results = (ytData.items || []).map((item: any) => {
      const videoId = item.id?.videoId;
      const snippet = item.snippet || {};
      
      return {
        id: `youtube-search-${videoId}`,
        name: snippet.title || 'Vídeo do YouTube',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        favicon: snippet.thumbnails?.default?.url || snippet.thumbnails?.medium?.url || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=80&h=80&fit=crop',
        tags: ['youtube', 'video'],
        type: 'youtube'
      };
    }).filter((s: any) => {
      const videoId = s.id.replace('youtube-search-', '');
      return videoId && videoId.length === 11;
    });

    await cacheRef.set({
      query: queryTerm,
      results,
      createdAt: Date.now()
    });

    return res.status(200).json({ results, cached: false });
  } catch (err: any) {
    console.error('[YouTube Search] Falha ao processar busca:', err);
    return res.status(500).json({ error: 'Falha interna ao processar busca do YouTube', details: err.message });
  }
}
