import type { VercelRequest, VercelResponse } from '@vercel/node';
import { admin, db } from './_utils/firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurações de CORS básicas
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Token simples de segurança para evitar execuções acidentais
  const { secret } = req.query;
  if (secret !== 'limpeza123') {
    return res.status(403).json({ error: 'Acesso não autorizado. Secret inválido.' });
  }

  try {
    console.log('[Cleanup] Iniciando limpeza de dados do portal no Firestore...');

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

    console.log(`[Cleanup] Limpos ${cleanedClientsCount} cards de clientes.`);

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

    console.log(`[Cleanup] Removidos ${deletedProfilesCount} perfis do tipo client_admin.`);

    return res.status(200).json({
      success: true,
      message: 'Limpeza do Firestore realizada com sucesso!',
      clientsCleaned: cleanedClientsCount,
      profilesDeleted: deletedProfilesCount
    });

  } catch (error: any) {
    console.error('[Cleanup] Erro crítico durante a limpeza:', error);
    return res.status(500).json({
      error: 'Erro interno na limpeza do Firestore',
      message: error.message
    });
  }
}
