import React, { useState } from 'react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Trash2, Tag, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { TransactionCategory, TransactionType } from '@/types';

export default function CategoryManager() {
  const { user } = useAuth();
  const { transactionCategories, effectiveOrgId } = useCRM();
  const { confirm } = useDialog();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<TransactionType>('EXPENSE');
  const [newGroup, setNewGroup] = useState<any>('Despesas Operacionais');

  const incomes = transactionCategories.filter(c => c.type === 'INCOME');
  const expenses = transactionCategories.filter(c => c.type === 'EXPENSE');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

    try {
      const catId = newName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(7);
      const newCat: TransactionCategory = {
        id: catId,
        name: newName.trim(),
        type: newType,
        group: newGroup,
        isCustom: true
      };

      await setDoc(doc(db, 'organizations', effectiveOrgId, 'transactionCategories', catId), newCat);
      toast.success('Categoria criada com sucesso!');
      setNewName('');
      setIsAdding(false);
    } catch (err) {
      toast.error('Erro ao criar categoria.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const ok = await confirm({
      title: 'Excluir Categoria',
      message: 'Tem certeza que deseja excluir esta categoria? Ela não será mais exibida para novas transações.',
      confirmText: 'Sim, excluir',
      variant: 'danger'
    });
    if (ok) {
      try {
        await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'transactionCategories', id));
        toast.success('Categoria excluída.');
      } catch (err) {
        toast.error('Erro ao excluir categoria.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Plano de Contas (Categorias)</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie as categorias de receitas e despesas para classificar suas transações no DRE.</p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl transition-colors font-medium"
          >
            <Plus size={18} /> Nova Categoria
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleCreate} className="mb-8 p-4 bg-gray-50 dark:bg-black/40 rounded-2xl border border-gray-200 dark:border-white/10 flex flex-col md:flex-row items-end gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Nome da Categoria</label>
              <input
                type="text"
                required
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Marketing Digital"
                className="w-full bg-white dark:bg-black/60 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white"
                autoFocus
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tipo</label>
              <div className="flex items-center gap-2 bg-white dark:bg-black/60 border border-gray-200 dark:border-white/10 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setNewType('INCOME')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${newType === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('EXPENSE')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${newType === 'EXPENSE' ? 'bg-red-500/10 text-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Despesa
                </button>
              </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Grupo DRE</label>
              <select
                value={newGroup}
                onChange={e => setNewGroup(e.target.value)}
                className="w-full bg-white dark:bg-black/60 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white"
              >
                <option value="Receita Bruta">Receita Bruta</option>
                <option value="Deduções">Deduções</option>
                <option value="CMV">CMV (Custos Diretos)</option>
                <option value="Despesas Operacionais">Despesas Operacionais</option>
                <option value="Despesas Não-Operacionais">Despesas Não-Operacionais</option>
                <option value="Impostos">Impostos</option>
                <option value="Investimentos">Investimentos</option>
              </select>
            </div>
            <button type="submit" className="w-full md:w-auto px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
              Salvar
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Receitas */}
          <div>
             <h4 className="flex items-center gap-2 font-bold text-emerald-500 mb-4 pb-2 border-b border-gray-100 dark:border-white/10">
               <ArrowUpCircle size={18} /> Receitas ({incomes.length})
             </h4>
             {incomes.length === 0 ? (
               <p className="text-gray-400 text-sm">Nenhuma cadastrada.</p>
             ) : (
               <div className="space-y-2">
                 {incomes.map(cat => (
                   <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl group hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10">
                     <div className="flex items-center gap-3">
                       <Tag size={16} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                       <span className="text-gray-800 dark:text-gray-200 font-medium">{cat.name}</span>
                     </div>
                     <button onClick={() => handleDelete(cat.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                       <Trash2 size={16} />
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>

          {/* Despesas */}
          <div>
             <h4 className="flex items-center gap-2 font-bold text-red-500 mb-4 pb-2 border-b border-gray-100 dark:border-white/10">
               <ArrowDownCircle size={18} /> Despesas ({expenses.length})
             </h4>
             {expenses.length === 0 ? (
               <p className="text-gray-400 text-sm">Nenhuma cadastrada.</p>
             ) : (
               <div className="space-y-2">
                 {expenses.map(cat => (
                   <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl group hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10">
                     <div className="flex items-center gap-3">
                       <Tag size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                       <span className="text-gray-800 dark:text-gray-200 font-medium">{cat.name}</span>
                     </div>
                     <button onClick={() => handleDelete(cat.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                       <Trash2 size={16} />
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
