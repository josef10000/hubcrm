import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Trash2, PieChart, Activity, Target, Tag } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { useAuth } from '../contexts/AuthContext';
import { getPlanPrice } from '../helpers';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Expense, Transaction, Budget, TransactionCategory } from '../types';
import DRETable from '../components/finance/DRETable';
import DREChart from '../components/finance/DREChart';
import CashFlowProjected from '../components/finance/CashFlowProjected';
import BudgetPanel from '../components/finance/BudgetPanel';
import BankReconciliation from '../components/finance/BankReconciliation';
import CategoryManager from '../components/finance/CategoryManager';

export default function FinanceView() {
  const { user } = useAuth();
  const { clients, expenses, newExpense, setNewExpense, transactionCategories, budgets, transactions } = useCRM();
  const [activeTab, setActiveTab] = useState<'resumo' | 'dre' | 'fluxo' | 'orcamento' | 'conciliacao' | 'categorias'>('resumo');

  const totalMRR = clients.filter(c => c.status === 'Ativo' || c.status === 'Inadimplente').reduce((acc, c) => {
    return acc + getPlanPrice(c.plan, c.billingCycle, c);
  }, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalMRR - totalExpenses;

  // Calculo de Saúde do Orçamento (Mês Atual)
  const currentMonthSpent = transactions.filter(t => 
    t.type === 'EXPENSE' && 
    new Date(t.date).getMonth() === new Date().getMonth() &&
    new Date(t.date).getFullYear() === new Date().getFullYear()
  ).reduce((acc, t) => acc + t.amount, 0);
  
  const totalBudget = budgets.filter(b => 
    b.year === new Date().getFullYear() && 
    b.month === new Date().getMonth()
  ).reduce((acc, b) => acc + b.amount, 0);

  const budgetHealth = totalBudget > 0 ? (currentMonthSpent / totalBudget) * 100 : 0;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount || !newExpense.date || !user) return;

    try {
      // 1. Budget Security Check
      const selectedCat = transactionCategories.find(c => c.name === (newExpense.category || 'Ferramentas'));
      if (selectedCat) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        
        // Calculate current spending for this category this month
        const monthlySpent = transactions.filter(t => 
          t.categoryId === selectedCat.id && 
          t.type === 'EXPENSE' &&
          new Date(t.date).getFullYear() === currentYear &&
          new Date(t.date).getMonth() === currentMonth
        ).reduce((acc, t) => acc + t.amount, 0);

        // Find limit
        const limit = budgets.find(b => b.categoryId === selectedCat.id && b.year === currentYear && b.month === currentMonth)?.amount;
        
        if (limit && (monthlySpent + Number(newExpense.amount)) > limit) {
          toast.warning(`Alerta: Esta despesa excede o orçamento de R$ ${limit.toFixed(2)} para ${selectedCat.name}.`, {
            duration: 6000,
            position: 'top-center'
          });
        }
      }

      const expenseId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const expense: Expense = {
        id: expenseId,
        description: newExpense.description,
        amount: Number(newExpense.amount),
        date: new Date(newExpense.date).getTime(),
        category: newExpense.category || 'Ferramentas',
        clientId: newExpense.clientId || undefined
      };

      await setDoc(doc(db, 'users', user.uid, 'expenses', expenseId), expense);
      setNewExpense({ category: 'Ferramentas' });
      toast.success('Despesa adicionada com sucesso!');
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error('Erro ao adicionar despesa.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
      toast.success('Despesa removida!');
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error('Erro ao remover despesa.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('resumo')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${activeTab === 'resumo' ? 'bg-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
          >
            <Activity size={18} />
            Resumo Operacional
          </button>
          <button
            onClick={() => setActiveTab('dre')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${activeTab === 'dre' ? 'bg-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
          >
            <PieChart size={18} />
            DRE Gerencial
          </button>
          <button
            onClick={() => setActiveTab('fluxo')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${activeTab === 'fluxo' ? 'bg-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
          >
            <TrendingUp size={18} />
            Fluxo de Caixa
          </button>
          <button
            onClick={() => setActiveTab('orcamento')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${activeTab === 'orcamento' ? 'bg-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
          >
            <Target size={18} />
            Orçamento (Budget)
          </button>
          <button
            onClick={() => setActiveTab('conciliacao')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${activeTab === 'conciliacao' ? 'bg-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
          >
            <Activity size={18} />
            Conciliação OFX
          </button>
          <button
            onClick={() => setActiveTab('categorias')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${activeTab === 'categorias' ? 'bg-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
          >
            <Tag size={18} />
            Categorias
          </button>
        </div>

        {activeTab === 'resumo' ? (
          <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium">Receita (MRR)</h3>
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><TrendingUp size={20} /></div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {totalMRR.toFixed(2).replace('.', ',')}</p>
          </div>
          
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium">Despesas</h3>
              <div className="p-2 bg-red-500/20 text-red-400 rounded-lg"><TrendingDown size={20} /></div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {totalExpenses.toFixed(2).replace('.', ',')}</p>
            <div className={`mt-2 text-xs font-medium px-2 py-1 rounded-lg inline-block ${budgetHealth > 100 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {totalBudget > 0 ? `${budgetHealth.toFixed(0)}% do orçamento consumido` : 'Sem orçamento planejado'}
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
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
            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Nova Despesa</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Descrição</label>
                  <input required type="text" value={newExpense.description || ''} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="Ex: Hospedagem AWS" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Valor (R$)</label>
                  <input required type="number" step="0.01" value={newExpense.amount?.toString() || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Data</label>
                  <input required type="date" value={newExpense.date ? new Date(newExpense.date).toISOString().split('T')[0] : ''} onChange={e => setNewExpense({...newExpense, date: e.target.value ? new Date(e.target.value).getTime() : undefined})} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Categoria</label>
                  <select value={newExpense.category || ''} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all">
                    <option value="" disabled className="bg-white dark:bg-[#030712]">Selecione uma categoria...</option>
                    {transactionCategories.filter(c => c.type === 'EXPENSE').length > 0 ? (
                      transactionCategories.filter(c => c.type === 'EXPENSE').map(cat => (
                        <option key={cat.id} value={cat.name} className="bg-white dark:bg-[#030712] text-gray-900 dark:text-white">{cat.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="Ferramentas" className="bg-white dark:bg-[#030712] text-gray-900 dark:text-white">Ferramentas / Software</option>
                        <option value="Infraestrutura" className="bg-white dark:bg-[#030712] text-gray-900 dark:text-white">Infraestrutura / Hospedagem</option>
                        <option value="Impostos" className="bg-white dark:bg-[#030712] text-gray-900 dark:text-white">Impostos / Taxas</option>
                        <option value="Marketing" className="bg-white dark:bg-[#030712] text-gray-900 dark:text-white">Marketing / Anúncios</option>
                        <option value="Outros" className="bg-white dark:bg-[#030712] text-gray-900 dark:text-white">Outros</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Cliente (Opcional)</label>
                  <select value={newExpense.clientId || ''} onChange={e => setNewExpense({...newExpense, clientId: e.target.value})} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all">
                    <option value="" className="bg-[#030712] text-white">Nenhum (Custo Geral)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#030712] text-white">{c.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/20">
                  Adicionar Despesa
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg h-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Histórico de Despesas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm">
                      <th className="pb-3 font-medium">Data</th>
                      <th className="pb-3 font-medium">Descrição</th>
                      <th className="pb-3 font-medium">Categoria</th>
                      <th className="pb-3 font-medium">Cliente</th>
                      <th className="pb-3 font-medium text-right">Valor</th>
                      <th className="pb-3 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">Nenhuma despesa registrada.</td>
                      </tr>
                    ) : (
                      expenses.map(expense => (
                        <tr key={expense.id} className="border-b border-white/5 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 transition-colors group">
                          <td className="py-4 text-gray-600 dark:text-gray-300 text-sm">{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-4 text-gray-900 dark:text-white font-medium">{expense.description}</td>
                          <td className="py-4 text-gray-500 dark:text-gray-400 text-sm">
                            <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-md border border-white/5">{expense.category}</span>
                          </td>
                          <td className="py-4 text-gray-500 dark:text-gray-400 text-sm">
                            {expense.clientId ? clients.find(c => c.id === expense.clientId)?.name || 'Desconhecido' : '-'}
                          </td>
                          <td className="py-4 text-red-400 font-medium text-right">
                            - R$ {expense.amount.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-4 text-right">
                            <button onClick={() => handleDeleteExpense(expense.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Custos e Margem por Cliente</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm">
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium text-right">Receita (MRR)</th>
                    <th className="pb-3 font-medium text-right">Custos</th>
                    <th className="pb-3 font-medium text-right">Lucro</th>
                    <th className="pb-3 font-medium text-right">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.filter(c => c.status === 'Ativo' || expenses.some(e => e.clientId === c.id)).map(client => {
                    const clientExpenses = expenses.filter(e => e.clientId === client.id).reduce((acc, e) => acc + e.amount, 0);
                    const mrr = client.status === 'Ativo' ? getPlanPrice(client.plan, client.billingCycle, client) : 0;
                    const profit = mrr - clientExpenses;
                    const margin = mrr > 0 ? (profit / mrr) * 100 : 0;
                    
                    return (
                      <tr key={client.id} className="border-b border-white/5 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 transition-colors group">
                        <td className="py-4 text-gray-900 dark:text-white font-medium">{client.name}</td>
                        <td className="py-4 text-emerald-400 font-medium text-right">R$ {mrr.toFixed(2).replace('.', ',')}</td>
                        <td className="py-4 text-red-400 font-medium text-right">R$ {clientExpenses.toFixed(2).replace('.', ',')}</td>
                        <td className={`py-4 font-medium text-right ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>R$ {profit.toFixed(2).replace('.', ',')}</td>
                        <td className="py-4 text-gray-500 dark:text-gray-400 text-sm text-right">
                          <span className={`px-2 py-1 rounded-md border ${margin >= 50 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : margin >= 20 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
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
        </>
        ) : activeTab === 'dre' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DREChart />
            <DRETable />
          </div>
        ) : activeTab === 'fluxo' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CashFlowProjected />
          </div>
        ) : activeTab === 'orcamento' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <BudgetPanel />
          </div>
        ) : activeTab === 'conciliacao' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <BankReconciliation />
          </div>
        ) : activeTab === 'categorias' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CategoryManager />
          </div>
        ) : null}

      </div>
    </div>
  );
}
