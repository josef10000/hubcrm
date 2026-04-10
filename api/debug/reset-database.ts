import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_utils/firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Segurança básica: apenas o proprietário deve saber esta URL ou ela deve ser usada via instrução direta
  const { confirm } = req.query;

  if (confirm !== 'true') {
    return res.status(400).json({ 
      message: 'Para resetar o banco, adicione ?confirm=true na URL',
      warning: 'ESTA AÇÃO APAGARÁ TODOS OS DADOS DO CRM.'
    });
  }

  try {
    console.log('[DEBUG] Iniciando reset total do banco de dados...');

    const collectionsToDelete = ['profiles', 'organizations'];
    const results: any = {};

    for (const collectionName of collectionsToDelete) {
      console.log(`[DEBUG] Apagando coleção: ${collectionName}`);
      const snapshot = await db.collection(collectionName).get();
      
      const batch = db.batch();
      let count = 0;
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }
      
      results[collectionName] = `${count} documentos removidos.`;
    }

    console.log('[DEBUG] Reset concluído com sucesso.');
    
    return res.status(200).json({
      status: 'success',
      message: 'Banco de dados resetado com sucesso. Todas as coleções de Perfis e Organizações foram limpas.',
      results
    });

  } catch (error: any) {
    console.error('[DEBUG] Falha ao resetar banco de dados:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Falha ao resetar o banco de dados.',
      error: error.message 
    });
  }
}
