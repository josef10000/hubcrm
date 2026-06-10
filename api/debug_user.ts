import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_utils/firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração rápida de CORS para facilitar o acesso de depuração
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Parâmetro email é obrigatório na query string.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Buscar na coleção 'profiles' (onde a chave é a UID do Firebase Auth)
    const profilesQuery = await db
      .collection('profiles')
      .where('email', '==', cleanEmail)
      .get();

    const profiles: any[] = [];
    profilesQuery.forEach((doc) => {
      profiles.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // 2. Buscar em lote de clientes (collectionGroup 'clients')
    const clientsQuery = await db
      .collectionGroup('clients')
      .where('email', '==', cleanEmail)
      .get();

    const clients: any[] = [];
    clientsQuery.forEach((doc) => {
      // Extrair o ID da organização através da referência do documento
      const orgId = doc.ref.parent.parent?.id;
      clients.push({
        id: doc.id,
        orgId: orgId || null,
        path: doc.ref.path,
        data: doc.data()
      });
    });

    // 3. Buscar adicionais por e-mail no formato exato cadastrado (caso seja case-sensitive no Firestore)
    // Para ajudar a rastrear se o e-mail foi cadastrado com letras maiúsculas
    let clientsWithOriginalCase: any[] = [];
    if (email !== cleanEmail) {
      const originalCaseQuery = await db
        .collectionGroup('clients')
        .where('email', '==', email.trim())
        .get();
      
      originalCaseQuery.forEach((doc) => {
        const orgId = doc.ref.parent.parent?.id;
        clientsWithOriginalCase.push({
          id: doc.id,
          orgId: orgId || null,
          path: doc.ref.path,
          data: doc.data()
        });
      });
    }

    return res.status(200).json({
      queryEmail: email,
      cleanEmail,
      profilesFound: profiles.length,
      profiles,
      clientsFound: clients.length,
      clients,
      clientsWithOriginalCaseFound: clientsWithOriginalCase.length,
      clientsWithOriginalCase
    });

  } catch (error: any) {
    console.error('[DebugUser] Erro crítico:', error);
    return res.status(500).json({ error: 'Erro interno no diagnóstico', message: error.message });
  }
}
