import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_utils/firebase.js';

/**
 * HubCRM Finance Engine - Cron Job
 * 
 * Este endpoint é responsável por:
 * 1. Processar dados financeiros de todas as organizações
 * 2. Gerar snapshots diários para o DRE Dinâmico
 * 3. Calcular projeções de Cash Flow (Fluxo de Caixa)
 * 4. Salvar resultados na subcoleção 'cashflow_projections'
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { secret } = req.query;

  // 1. Validação de Segurança (Mesmo padrão do Chat)
  // Certifique-se de configurar FINANCE_CRON_SECRET na Vercel
  if (!secret || secret !== process.env.FINANCE_CRON_SECRET) {
    console.error('[Finance Cron] Tentativa de acesso não autorizada');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    console.log(`[Finance Cron] Iniciando processamento financeiro em ${now.toISOString()}`);

    const results = {
      organizationsProcessed: 0,
      projectionsUpdated: 0,
      errors: [] as string[]
    };

    // 2. Buscar todas as organizações para processamento
    const orgsSnapshot = await db.collection('organizations').get();
    
    for (const orgDoc of orgsSnapshot.docs) {
      try {
        const orgId = orgDoc.id;
        await processOrganizationFinance(orgId);
        results.organizationsProcessed++;
      } catch (err: any) {
        results.errors.push(`Erro na Org ${orgDoc.id}: ${err.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: now.toISOString(),
      summary: results,
      message: "Processamento financeiro concluído."
    });

  } catch (error: any) {
    console.error('[Finance Cron] Erro crítico no motor financeiro:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Processa os dados de BI de uma organização específica
 */
async function processOrganizationFinance(orgId: string) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // 1. Buscar Categorias para Mapeamento de Grupos
  const categoriesSnapshot = await db.collection('organizations').doc(orgId).collection('transactionCategories').get();
  const categoryMap: Record<string, any> = {};
  categoriesSnapshot.docs.forEach(doc => {
    categoryMap[doc.id] = doc.data();
  });

  // 2. Buscar Transações Realizadas (Últimos 2 meses para Real x Anterior)
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  
  const transactionsSnapshot = await db.collection('organizations').doc(orgId).collection('transactions')
    .where('date', '>=', twoMonthsAgo.getTime())
    .get();

  const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 3. Buscar Clientes Ativos para Projeção de Receita
  const clientsSnapshot = await db.collection('organizations').doc(orgId).collection('clients')
    .where('status', '==', 'Ativo')
    .get();
  
  const activeClients = clientsSnapshot.docs.map(doc => doc.data());
  const monthlyRecurringRevenue = activeClients.reduce((acc, client) => {
    return acc + (client.customMonthlyPrice || client.planPrice || 0);
  }, 0);

  // 4. Consolidar Dados por Mês (Realizado)
  const monthlyData: Record<string, any> = {};

  transactions.forEach((t: any) => {
    const tDate = new Date(t.date);
    const monthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        realizedIncome: 0,
        realizedExpense: 0,
        groups: {}
      };
    }

    const amount = Number(t.amount) || 0;
    const cat = categoryMap[t.categoryId];
    const groupName = cat?.group || (t.type === 'INCOME' ? 'Receita Bruta' : 'Despesas Operacionais');

    if (t.type === 'INCOME') {
      monthlyData[monthKey].realizedIncome += amount;
    } else {
      monthlyData[monthKey].realizedExpense += amount;
    }

    if (!monthlyData[monthKey].groups[groupName]) {
      monthlyData[monthKey].groups[groupName] = 0;
    }
    monthlyData[monthKey].groups[groupName] += amount;
  });

  // 5. Gerar Projeção para os próximos 6 meses
  const projections = [];
  for (let i = 0; i < 6; i++) {
    const projDate = new Date();
    projDate.setMonth(projDate.getMonth() + i);
    const monthKey = `${projDate.getFullYear()}-${String(projDate.getMonth() + 1).padStart(2, '0')}`;
    
    const realized = monthlyData[monthKey] || { realizedIncome: 0, realizedExpense: 0, groups: {} };
    
    // Projeção simples: Receita Recurrente + Histórico de Despesas (Média)
    const projectedIncome = i === 0 ? Math.max(realized.realizedIncome, monthlyRecurringRevenue) : monthlyRecurringRevenue;
    
    // Para despesas, usamos a média dos últimos meses se disponível, senão usamos o realizado do mês atual
    const projectedExpense = realized.realizedExpense || 0; 

    projections.push({
      id: monthKey,
      month: monthKey,
      realizedIncome: realized.realizedIncome,
      realizedExpense: realized.realizedExpense,
      projectedIncome,
      projectedExpense,
      groups: realized.groups,
      updatedAt: Date.now()
    });
  }

  // 6. Salvar Resultados no Firestore
  const batch = db.batch();
  const projectionsCol = db.collection('organizations').doc(orgId).collection('cashflow_projections');
  
  projections.forEach(proj => {
    const docRef = projectionsCol.doc(proj.id);
    batch.set(docRef, proj, { merge: true });
  });

  await batch.commit();
}
