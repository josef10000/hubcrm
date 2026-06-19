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
      case 'site-shield':
        return await handleSiteShield(req, res);
      case 'site-status':
        return await handleSiteStatus(req, res);
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

async function handleSiteShield(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  const scriptContent = `(async function() {
  const domain = window.location.hostname;
  const storageKey = 'site_shield_status_' + domain;
  
  const cached = sessionStorage.getItem(storageKey);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      if (data.suspended) {
        applySuspension(data.message || 'Assinatura temporariamente suspensa.');
        return;
      }
      if (Date.now() - data.timestamp < 12 * 60 * 60 * 1000) {
        return;
      }
    } catch (e) {}
  }

  try {
    const scriptSrc = document.currentScript ? document.currentScript.src : '';
    const crmOrigin = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;
    
    const res = await fetch(crmOrigin + '/api/site-status?domain=' + encodeURIComponent(domain));
    if (!res.ok) return;
    const data = await res.json();
    
    sessionStorage.setItem(storageKey, JSON.stringify({
      suspended: data.suspended,
      message: data.message,
      timestamp: Date.now()
    }));
    
    if (data.suspended) {
      applySuspension(data.message || 'Assinatura temporariamente suspensa.');
    }
  } catch (e) {
    console.warn('[Site Shield] Erro ao verificar integridade do site:', e);
  }

  function applySuspension(message) {
    const style = document.createElement('style');
    style.innerHTML = \`
      #site-shield-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%) !important;
        color: #f8fafc !important;
        z-index: 9999999999 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        padding: 20px !important;
        box-sizing: border-box !important;
        text-align: center !important;
      }
      #site-shield-card {
        background: rgba(255, 255, 255, 0.03) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 24px !important;
        padding: 40px 30px !important;
        max-width: 480px !important;
        width: 100% !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
        animation: shield-fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      @keyframes shield-fade-in {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      #site-shield-icon {
        width: 80px !important;
        height: 80px !important;
        margin: 0 auto 24px !important;
        background: rgba(239, 68, 68, 0.1) !important;
        border: 2px solid rgba(239, 68, 68, 0.2) !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #ef4444 !important;
      }
      #site-shield-title {
        font-size: 24px !important;
        font-weight: 700 !important;
        margin: 0 0 12px 0 !important;
        letter-spacing: -0.025em !important;
        line-height: 1.25 !important;
      }
      #site-shield-text {
        font-size: 15px !important;
        color: #94a3b8 !important;
        line-height: 1.6 !important;
        margin: 0 0 28px 0 !important;
      }
      #site-shield-btn {
        display: inline-block !important;
        background: #4f46e5 !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        font-size: 14px !important;
        padding: 12px 24px !important;
        border-radius: 12px !important;
        text-decoration: none !important;
        transition: all 0.2s ease !important;
        border: none !important;
        cursor: pointer !important;
      }
      #site-shield-btn:hover {
        background: #4338ca !important;
        transform: translateY(-1px) !important;
      }
    \`;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'site-shield-overlay';
    overlay.innerHTML = \`
      <div id="site-shield-card">
        <div id="site-shield-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h1 id="site-shield-title">Website Suspenso</h1>
        <p id="site-shield-text">\${message}<br><br>Por favor, entre em contato com a equipe administrativa para regularizar a situação e reativar o seu serviço.</p>
        <button id="site-shield-btn" onclick="sessionStorage.removeItem('\${storageKey}'); window.location.reload();">Verificar Novamente</button>
      </div>
    \`;
    
    document.body.innerHTML = '';
    document.body.appendChild(overlay);
    
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.background = '#0f172a';
  }
})();\`;

  return res.status(200).send(scriptContent);
}

async function handleSiteStatus(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { domain } = req.query;

  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Parâmetro domain é obrigatório' });
  }

  const normalizeDomain = (url: string) => {
    let clean = url.trim().toLowerCase();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, '');
    clean = clean.split('/')[0];
    clean = clean.split('?')[0];
    return clean;
  };

  const searchDomain = normalizeDomain(domain);

  try {
    const snapshot = await db.collectionGroup('clients').get();
    let matchedClient: any = null;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.siteLink) {
        const clientDomain = normalizeDomain(data.siteLink);
        if (clientDomain === searchDomain) {
          matchedClient = { id: doc.id, ...data };
          break;
        }
      }
    }

    if (!matchedClient) {
      return res.status(200).json({ suspended: false });
    }

    if (matchedClient.status === 'Cancelado') {
      return res.status(200).json({ 
        suspended: true, 
        message: 'Esta assinatura foi cancelada.' 
      });
    }

    const isOverdue = matchedClient.paymentStatus === 'OVERDUE' || matchedClient.status === 'Inadimplente';
    
    if (isOverdue && matchedClient.nextDueDate) {
      const dueDate = new Date(matchedClient.nextDueDate + 'T12:00:00');
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 10) {
        return res.status(200).json({ 
          suspended: true, 
          message: 'Assinatura com pendências financeiras pendentes.' 
        });
      }
    }

    return res.status(200).json({ suspended: false });

  } catch (error: any) {
    console.error('[Site Status Error]:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao consultar status do site', 
      details: error.message 
    });
  }
}
