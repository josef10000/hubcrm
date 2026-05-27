import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdmin, db } from '../../_utils/firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Inicializa o Firebase Admin SDK local
  getFirebaseAdmin();

  try {
    if (req.method === 'GET') {
      // 1. Obter todos os clientes marcados como monitorados
      const monitoredClients = await db.collectionGroup('clients')
        .where('isMonitored', '==', true)
        .get();

      const monitors = monitoredClients.docs.map(doc => {
        const clientData = doc.data();
        const monitoring = clientData.monitoring || {};
        
        let status = 1; // Checking / Not checked yet
        if (monitoring.status === 'up') status = 2; // Online
        else if (monitoring.status === 'down') status = 9; // Offline
        else if (monitoring.status === 'paused') status = 0; // Paused

        return {
          id: doc.id, // Retorna o ID do documento do cliente para ser usado na deleção
          friendly_name: clientData.name,
          url: clientData.siteLink,
          type: 1, // HTTP
          status: status,
          interval: 300,
          latency: monitoring.latency || 0,
          lastChecked: monitoring.lastChecked || null
        };
      });

      return res.status(200).json(monitors);
    } 
    
    else if (req.method === 'POST') {
      // 2. Ativar o monitoramento de um cliente por URL ou Nome
      const { friendly_name, url } = req.body;
      
      if (!friendly_name || !url) {
        return res.status(400).json({ error: 'friendly_name and url are required' });
      }

      // Buscar o cliente pelo nome para ativar o monitoramento
      const clientsSnapshot = await db.collectionGroup('clients')
        .where('name', '==', friendly_name)
        .get();

      if (clientsSnapshot.empty) {
        return res.status(404).json({ error: 'Cliente não encontrado no CRM' });
      }

      const clientDoc = clientsSnapshot.docs[0];
      
      // Atualiza o cliente para monitoramento nativo
      await clientDoc.ref.update({
        isMonitored: true,
        siteLink: url.trim(),
        monitoring: {
          status: 'checking',
          lastChecked: Date.now(),
          latency: 0,
          statusCode: null,
          error: null
        }
      });

      return res.status(200).json({
        id: clientDoc.id,
        friendly_name,
        url,
        status: 1
      });
    }

    else if (req.method === 'DELETE') {
      // 3. Desativar o monitoramento do cliente
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'monitor id is required' });
      }

      // Localiza o cliente monitorado
      const clientsSnapshot = await db.collectionGroup('clients')
        .get();

      const clientDoc = clientsSnapshot.docs.find(d => d.id === id.toString());
      
      if (!clientDoc) {
        return res.status(404).json({ error: 'Monitor não encontrado ou já deletado' });
      }

      // Desativa a flag de monitoramento
      await clientDoc.ref.update({
        isMonitored: false,
        'monitoring.status': 'paused'
      });

      return res.status(200).json({ success: true });
    }

    else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('[Wrapper Uptime monitors] Error:', error);
    return res.status(500).json({ error: 'Erro interno no motor nativo de uptime', details: error.message });
  }
}
