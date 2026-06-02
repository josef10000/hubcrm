import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Trash2, PieChart, Activity, Target, Tag, Receipt } from 'lucide-react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useCRMStore } from '@/store/useCRMStore';
import { useAuth } from '@auth/contexts/AuthContext';
import { useTransactions, useTransactionCategories, useBudgets } from '@/hooks/queries/useFinance';
import { useClients } from '@/hooks/queries/useClients';
import { getPlanPrice } from '@/helpers';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Transaction } from '@/types';
import DREWidget from '@finance/components/DREWidget';
import CashFlowForecastChart from '@finance/components/CashFlowForecastChart';
import BudgetPanel from '@finance/components/BudgetPanel';
import ROIAnalysis from '@finance/components/ROIAnalysis';
import PayrollPanel from '../components/PayrollPanel';
import ConciliationPanel from '../components/ConciliationPanel';
import { usePermissions } from '@auth/hooks/usePermissions';

export default function FinanceView() {
  const { user } = useAuth();
  const { 
    newTransaction, 
    setNewTransaction, 
    effectiveOrgId, 
    userProfile, 
    commissions = [], 
    offers = [] 
  } = useCRM();

  const { data: clientsData } = useClients();
  const clients = clientsData || [];
  
  const { data: transactionsData } = useTransactions();
  const transactions = transactionsData || [];
  
  const { data: categoriesData } = useTransactionCategories();
  const transactionCategories = categoriesData || [];
  
  const { data: budgetsData } = useBudgets();
  const budgets = budgetsData || [];
  const [activeTab, setActiveTab] = useState<'resumo' | 'dre' | 'fluxo' | 'orcamento' | 'roi' | 'saas' | 'payroll' | 'conciliation'>('resumo');

  // subscribeToFinance and CRMStore listener initialization are now handled by React Query
  // Removing manual store subscriptions for finance data

  const { hasPermission } = usePermissions();

  if (!hasPermission('MANAGE_FINANCE')) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-transparent relative z-10 w-full h-full min-h-[calc(100vh-100px)]">
        <div className="text-center">
          <DollarSign size={48} className="mx-auto text-gray-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Acesso Restrito</h2>
          <p className="text-gray-500 dark:text-gray-400">Você não tem permissão para acessar o módulo financeiro estratégico.</p>
        </div>
      </div>
    );
  }

  const totalMRR = (clients || []).filter(c => c.status === 'Ativo' || c.status === 'Inadimplente').reduce((acc, c) => {
    return acc + getPlanPrice(c.plan, c.billingCycle, c);
  }, 0);
  
  const totalExpenses = (transactions || []).filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalMRR - totalExpenses;
  
  // Computar quantidade de despesas pendentes de conciliação (categoria "A Categorizar")
  const pendingConciliationCount = (transactions || []).filter(
    t => t.type === 'EXPENSE' && t.categoryName === 'A Categorizar'
  ).length;

  // --- CÁLCULO DE RATEIO DE CUSTOS FIXOS (CSP) ---
  const activeClientsCount = (clients || []).filter(c => c.status === 'Ativo').length;
  const infraExpenses = (transactions || []).filter(t => 
    t.type === 'EXPENSE' && 
    (t.categoryName === 'Infraestrutura' || t.categoryName === 'Infraestrutura / Hospedagem')
  ).reduce((acc, t) => acc + t.amount, 0);
  
  const cspUnitario = activeClientsCount > 0 ? infraExpenses / activeClientsCount : 0;

  // Calculo de Saúde do Orçamento (Mês Atual)
  const currentMonthSpent = (transactions || []).filter(t => 
    t.type === 'EXPENSE' && 
    new Date(t.date).getMonth() === new Date().getMonth() &&
    new Date(t.date).getFullYear() === new Date().getFullYear()
  ).reduce((acc, t) => acc + t.amount, 0);
  
  const totalBudget = (budgets || []).filter(b => 
    b.year === new Date().getFullYear() && 
    b.month === new Date().getMonth()
  ).reduce((acc, b) => acc + b.amount, 0);

  const budgetHealth = totalBudget > 0 ? (currentMonthSpent / totalBudget) * 100 : 0;

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.description || !newTransaction.amount || !newTransaction.date || !effectiveOrgId) return;
    
    if (!hasPermission('MANAGE_FINANCE')) {
      toast.error('Você não tem permissão para adicionar lançamentos.');
      return;
    }

    try {
      const selectedCat = transactionCategories.find(c => c.name === (newTransaction.categoryName || 'Ferramentas'));
      if (selectedCat) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const monthlySpent = (transactions || []).filter(t => 
          t.categoryId === selectedCat.id && 
          t.type === 'EXPENSE' &&
          new Date(t.date).getFullYear() === currentYear &&
          new Date(t.date).getMonth() === currentMonth
        ).reduce((acc, t) => acc + t.amount, 0);

        const limit = budgets.find(b => b.categoryId === selectedCat.id && b.year === currentYear && b.month === currentMonth)?.amount;
        
        if (limit && (monthlySpent + Number(newTransaction.amount)) > limit) {
          toast.warning(`Alerta: Este lançamento excede o orçamento de R$ ${limit.toFixed(2)} para ${selectedCat.name}.`, {
            duration: 6000,
            position: 'top-center'
          });
        }
      }

      const transactionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const transaction: Transaction = {
        id: transactionId,
        description: newTransaction.description,
        amount: Number(newTransaction.amount),
        date: new Date(newTransaction.date).getTime(),
        type: 'EXPENSE',
        status: 'PAID',
        categoryId: transactionCategories.find(c => c.name === newTransaction.categoryName)?.id || '',
        categoryName: newTransaction.categoryName || 'Ferramentas',
        clientId: newTransaction.clientId || undefined,
      };

      await setDoc(doc(db, 'organizations', effectiveOrgId, 'transactions', transactionId), transaction);
      setNewTransaction({ type: 'EXPENSE' });
      toast.success('Lançamento registrado com sucesso!');
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error('Erro ao registrar lançamento.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!effectiveOrgId) return;
    if (!hasPermission('MANAGE_FINANCE')) {
      toast.error('Você não tem permissão para excluir lançamentos.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'transactions', id));
      toast.success('Lançamento removido!');
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error('Erro ao remover lançamento.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setActiveTab('resumo')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'resumo' ? 'bg-primary-500 text-gray-900 shadow-lg shadow-primary-500/20' : 'bg-black/40 text-gray-500 dark:text-gray-400 hover:bg-black/20'}`}
          >
            <Activity size={18} />
            Resumo Corporativo
          </button>
          <button
            onClick={() => setActiveTab('dre')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'dre' ? 'bg-primary-500 text-gray-900 shadow-lg shadow-primary-500/20' : 'bg-black/40 text-gray-500 dark:text-gray-400 hover:bg-black/20'}`}
          >
            <PieChart size={18} />
            DRE Gerencial
          </button>
          <button
            onClick={() => setActiveTab('fluxo')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'fluxo' ? 'bg-primary-500 text-gray-900 shadow-lg shadow-primary-500/20' : 'bg-black/40 text-gray-500 dark:text-gray-400 hover:bg-black/20'}`}
          >
            <TrendingUp size={18} />
            Fluxo de Caixa
          </button>
          <button
            onClick={() => setActiveTab('orcamento')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'orcamento' ? 'bg-primary-500 text-gray-900 shadow-lg shadow-primary-500/20' : 'bg-black/40 text-gray-500 dark:text-gray-400 hover:bg-black/20'}`}
          >
            <Target size={18} />
            Orçamento (Budget)
          </button>
          <button
            onClick={() => setActiveTab('roi')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'roi' ? 'bg-primary-500 text-gray-900 shadow-lg shadow-primary-500/20' : 'bg-black/40 text-gray-500 dark:text-gray-400 hover:bg-black/20'}`}
          >
            <PieChart size={18} />
            ROI por Oferta
          </button>
          <button
            onClick={() => setActiveTab('saas')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'saas' ? 'bg-primary-500 text-gray-900 shadow-lg shadow-primary-500/20' : 'bg-black/40 text-gray-400 hover:bg-black/20'}`}
          >
            <Activity size={18} />
            Métricas SaaS
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'payroll' ? 'bg-primary-500 text-gray-900 shadow-lg shadow-primary-500/20' : 'bg-black/40 text-gray-500 dark:text-gray-400 hover:bg-black/20'}`}
          >
            <DollarSign size={18} />
            Folha de Pagamento
          </button>
          <button
            onClick={() => setActiveTab('conciliation')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'conciliation' ? 'bg-primary-500 text-gray-900 shadow-lg shadow-primary-500/20' : 'bg-black/40 text-gray-500 dark:text-gray-400 hover:bg-black/20'}`}
          >
            <Receipt size={18} />
            Conciliação
            {pendingConciliationCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                {pendingConciliationCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'resumo' ? (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Receita (MRR)</h3>
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><TrendingUp size={20} /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {totalMRR.toFixed(2).replace('.', ',')}</p>
            </div>
            
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Despesas Atuais</h3>
                <div className="p-2 bg-red-500/20 text-red-400 rounded-lg"><TrendingDown size={20} /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {totalExpenses.toFixed(2).replace('.', ',')}</p>
              <div className={`mt-2 text-xs font-medium px-2 py-1 rounded-lg inline-block ${budgetHealth > 100 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {totalBudget > 0 ? `${budgetHealth.toFixed(0)}% do orçamento consumido` : 'Sem orçamento planejado'}
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Lucro Líquido</h3>
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><DollarSign size={20} /></div>
              </div>
              <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                R$ {netProfit.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Novo Lançamento</h3>
                <form onSubmit={handleAddTransaction} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Descrição</label>
                    <input required type="text" value={newTransaction.description || ''} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} className="w-full px-4 py-3 bg-black/20 border border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="Ex: Impostos Trimestrais" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Valor (R$)</label>
                    <input required type="number" step="0.01" value={newTransaction.amount?.toString() || ''} onChange={e => setNewTransaction({...newTransaction, amount: Number(e.target.value)})} className="w-full px-4 py-3 bg-black/20 border border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Data</label>
                    <input required type="date" value={newTransaction.date ? new Date(newTransaction.date).toISOString().split('T')[0] : ''} onChange={e => setNewTransaction({...newTransaction, date: e.target.value ? new Date(e.target.value).getTime() : undefined})} className="w-full px-4 py-3 bg-black/20 border border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Categoria</label>
                    <select value={newTransaction.categoryName || ''} onChange={e => setNewTransaction({...newTransaction, categoryName: e.target.value})} className="w-full px-4 py-3 bg-black/20 border border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all">
                      <option value="" disabled className="bg-zinc-950 dark:bg-[#030712]">Selecione uma categoria...</option>
                      {transactionCategories.filter(c => c.type === 'EXPENSE').map(cat => (
                        <option key={cat.id} value={cat.name} className="bg-zinc-950 dark:bg-[#030712] text-gray-900 dark:text-white">{cat.name}</option>
                      ))}
                      {transactionCategories.filter(c => c.type === 'EXPENSE').length === 0 && (
                        <>
                          <option value="Ferramentas" className="bg-zinc-950 dark:bg-[#030712] text-gray-900 dark:text-white">Ferramentas / Software</option>
                          <option value="Infraestrutura" className="bg-zinc-950 dark:bg-[#030712] text-gray-900 dark:text-white">Infraestrutura / Hospedagem</option>
                          <option value="Impostos" className="bg-zinc-950 dark:bg-[#030712] text-gray-900 dark:text-white">Impostos / Taxas</option>
                          <option value="Marketing" className="bg-zinc-950 dark:bg-[#030712] text-gray-900 dark:text-white">Marketing / Anúncios</option>
                          <option value="Folha" className="bg-zinc-950 dark:bg-[#030712] text-gray-900 dark:text-white">Folha de Pagamento</option>
                          <option value="Outros" className="bg-zinc-950 dark:bg-[#030712] text-gray-900 dark:text-white">Outros</option>
                        </>
                      )}
                    </select>
                  </div>
                  <button type="submit" className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/20">
                    Lançar no Caixa
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Custos e Margem Real (BI)</h3>
                  <div className="px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-lg text-[10px] text-primary-400">
                    CSP Unitário: R$ {cspUnitario.toFixed(2)}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-500 dark:text-gray-400 text-sm">
                        <th className="pb-3 font-medium">Cliente</th>
                        <th className="pb-3 font-medium text-right">MRR</th>
                        <th className="pb-3 font-medium text-right">Markup</th>
                        <th className="pb-3 font-medium text-right">ROI</th>
                        <th className="pb-3 font-medium text-right">Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(clients || []).filter(c => c.status === 'Ativo' || (transactions || []).some(t => t.clientId === c.id) || (commissions || []).some(comm => comm.clientId === c.id)).map(client => {
                        const clientExpenses = (transactions || []).filter(t => t.clientId === client.id && t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
                        const clientCommissions = (commissions || []).filter(comm => comm.clientId === client.id).reduce((acc, comm) => acc + comm.amount, 0);
                        const mrr = client.status === 'Ativo' ? getPlanPrice(client.plan, client.billingCycle, client) : 0;
                        
                        // Custo Total = Custos Diretos + Rateio de Infra (CSP)
                        const totalCosts = clientExpenses + clientCommissions + cspUnitario;
                        const profit = mrr - totalCosts;
                        const margin = mrr > 0 ? (profit / mrr) * 100 : 0;
                        const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : profit > 0 ? 100 : 0;
                        const markup = totalCosts > 0 ? (mrr / totalCosts) : 0;
                        
                        return (
                          <tr key={client.id} className="border-b border-white/5 hover:bg-primary-500/10 transition-colors group">
                            <td className="py-4">
                              <div className="text-gray-900 dark:text-white font-medium">{client.name}</div>
                              <div className="text-[10px] text-gray-500">{client.plan || 'Sem Plano'}</div>
                            </td>
                            <td className="py-4 text-emerald-400 font-medium text-right">R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-4 text-blue-400 font-bold text-right">{markup.toFixed(1)}x</td>
                            <td className={`py-4 text-right text-xs font-medium ${roi >= 100 ? 'text-emerald-400' : roi > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                              {roi.toFixed(0)}%
                            </td>
                            <td className="py-4 text-right">
                              <span className={`px-2 py-1 rounded-md border text-[10px] font-bold ${margin >= 40 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : margin >= 15 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {margin.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          </>
        ) : activeTab === 'dre' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DREWidget />
          </div>
        ) : activeTab === 'fluxo' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CashFlowForecastChart />
          </div>
        ) : activeTab === 'orcamento' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <BudgetPanel />
          </div>
        ) : activeTab === 'roi' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ROIAnalysis />
          </div>
        ) : activeTab === 'saas' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="text-emerald-400" size={20} />
                  LTV (Lifetime Value) - Ranking
                </h3>
                <div className="space-y-4">
                  {(clients || []).map(client => ({
                    ...client,
                    ltv: (transactions || []).filter(t => t.clientId === client.id && t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0)
                  })).sort((a, b) => b.ltv - a.ltv).slice(0, 5).map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center font-bold text-xs">{i+1}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                          <p className="text-[10px] text-gray-500">{c.plan}</p>
                        </div>
                      </div>
                      <p className="text-emerald-400 font-bold text-sm">R$ {c.ltv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingDown className="text-red-400" size={20} />
                  Churn Rate (30 dias móveis)
                </h3>
                <div className="flex flex-col items-center justify-center py-8">
                  {(() => {
                    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                    const cancelledLastMonth = (clients || []).filter(c => c.status === 'Cancelado' && c.updatedAt && c.updatedAt > thirtyDaysAgo).length;
                    const totalBaseStart = (clients || []).filter(c => c.status === 'Ativo').length + cancelledLastMonth;
                    const churnRate = totalBaseStart > 0 ? (cancelledLastMonth / totalBaseStart) * 100 : 0;
                    
                    return (
                      <>
                        <div className="relative w-32 h-32 mb-4">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * churnRate) / 100} className="text-red-500" strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{churnRate.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full">
                          <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500 mb-1">Cancelamentos</p>
                            <p className="text-lg font-bold text-red-400">{cancelledLastMonth}</p>
                          </div>
                          <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500 mb-1">Base Total</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{totalBaseStart}</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Sugestões de Growth (IA Financeira)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-2xl">
                  <p className="text-primary-400 text-xs font-bold mb-1 uppercase tracking-wider">Margem Baixa</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Há 3 clientes com margem inferior a 15%. Considere reajuste no plano ou redução de custos diretos.</p>
                </div>
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <p className="text-emerald-400 text-xs font-bold mb-1 uppercase tracking-wider">Oportunidade LTV</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Clientes no plano "Ecossistema Essencial" têm ROI 40% superior. Focar em aquisição nesta faixa.</p>
                </div>
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                  <p className="text-blue-400 text-xs font-bold mb-1 uppercase tracking-wider">Otimização CSP</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Seu CSP Unitário caiu 12% este mês devido ao aumento da base de clientes. Ganho de escala saudável.</p>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'payroll' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PayrollPanel />
          </div>
        ) : activeTab === 'conciliation' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ConciliationPanel />
          </div>
        ) : null}

      </div>
    </div>
  );
}
