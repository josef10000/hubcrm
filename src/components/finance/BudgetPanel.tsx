import React, { useMemo, useState, useEffect } from 'react';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Target, TrendingDown, Edit2, Check } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';

export default function BudgetPanel() {
  const { user } = useAuth();
  const { transactions, transactionCategories } = useCRM();
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0 to 11

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'budgets'), (snap) => {
      const loaded: Record<string, number> = {};
      snap.forEach(d => {
        const bd = d.data();
        // Assuming ID format: `catId_year_month` or just storing a single active limit `catId` for simplicity
        if (bd.year === currentYear && bd.categoryId) {
           // Simplify: We just read the amount for this year/month combination
           if (bd.month === currentMonth || bd.period === 'MONTHLY') {
             loaded[bd.categoryId] = bd.amount;
           }
        }
      });
      setBudgets(loaded);
    });
    return () => unsubscribe();
  }, [user, currentYear, currentMonth]);

  const handleSaveBudget = async (categoryId: string) => {
    if (!user) return;
    try {
      const amount = parseFloat(editAmount.replace(',', '.'));
      if (isNaN(amount)) return;

      const docId = `${categoryId}_${currentYear}_${currentMonth}`;
      await setDoc(doc(db, 'users', user.uid, 'budgets', docId), {
        id: docId,
        categoryId,
        amount,
        period: 'MONTHLY',
        year: currentYear,
        month: currentMonth
      }, { merge: true });

      toast.success('Limite de orçamento atualizado!');
      setEditingCatId(null);
    } catch (e) {
      toast.error('Erro ao salvar limite.');
    }
  };

  // Aggregate current month expenses by category
  const expensesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      if (t.type === 'EXPENSE' && date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        if (!data[t.categoryId]) data[t.categoryId] = 0;
        data[t.categoryId] += t.amount;
      }
    });
    return data;
  }, [transactions, currentYear, currentMonth]);

  // Combine with categories
  const budgetData = useMemo(() => {
    return transactionCategories.filter(cat => cat.type === 'EXPENSE').map(cat => {
      const spent = expensesByCategory[cat.id] || 0;
      const limit = budgets[cat.id] || 0; // Default 0 means no limit defined visually, but we can set it to 0
      const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : spent > 0 ? 100 : 0;
      const isOverBudget = limit > 0 ? spent > limit : false;

      return {
        ...cat,
        spent,
        limit,
        percentage,
        isOverBudget
      };
    }).sort((a, b) => b.percentage - a.percentage); // highest percentage first
  }, [transactionCategories, expensesByCategory, budgets]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Orçamento vs Realizado</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Controle de limites de gastos por Centro de Custo neste mês.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-black/40 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10">
            <Target className="text-primary-500" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Mês Atual</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {budgetData.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              Nenhuma categoria de despesa castrada. Cadastre no plano de contas para definir limites.
            </div>
          ) : (
            budgetData.map(cat => (
              <div key={cat.id} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{cat.name}</span>
                    {cat.isOverBudget && <AlertCircle size={16} className="text-red-500" />}
                  </div>
                  <div className="text-sm flex items-center gap-2">
                    <span className={`font-bold ${cat.isOverBudget ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                      R$ {cat.spent.toFixed(2)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400"> / </span>
                    {editingCatId === cat.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={e => setEditAmount(e.target.value)}
                          className="w-20 px-2 py-0.5 border border-gray-300 dark:border-white/20 bg-white dark:bg-black/40 rounded text-gray-900 dark:text-white text-right outline-none focus:border-primary-500"
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleSaveBudget(cat.id)}
                        />
                        <button onClick={() => handleSaveBudget(cat.id)} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded">
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group-hover:text-primary-500 transition-colors cursor-pointer" onClick={() => { setEditingCatId(cat.id); setEditAmount(String(cat.limit)); }}>
                        <span className="text-gray-500 dark:text-gray-400">
                          {cat.limit > 0 ? `R$ ${cat.limit.toFixed(2)}` : 'Não definido'}
                        </span>
                        <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative">
                  <div 
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out ${
                      cat.percentage >= 100 ? 'bg-red-500' : 
                      cat.percentage >= 80 ? 'bg-yellow-400' : 
                      'bg-emerald-400'
                    }`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                  {cat.limit > 0 && <div className="absolute left-[80%] top-0 h-full w-[2px] bg-black/10 dark:bg-white/20 z-10" title="Alerta 80%" />}
                </div>
                
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className={`${cat.percentage >= 100 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                    {cat.limit > 0 ? `${cat.percentage.toFixed(1)}% utilizado` : 'Sem limite definido (Gasto livre)'}
                  </span>
                  {cat.limit > 0 ? (
                    cat.isOverBudget ? (
                      <span className="text-red-500 font-medium flex items-center gap-1">
                        <TrendingDown size={12} /> Estourou orçamento em R$ {(cat.spent - cat.limit).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-medium">
                        R$ {(cat.limit - cat.spent).toFixed(2)} restante
                      </span>
                    )
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
