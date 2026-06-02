import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { useCRM } from '@crm/contexts/CRMContext';
import { useTransactionCategories } from '@/hooks/queries/useFinance';
import { Check, AlertCircle, Sparkles, Receipt, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PendingTransaction {
  id: string;
  description: string;
  amount: number;
  date: number;
  type: 'EXPENSE';
  status: string;
  categoryName: string;
}

export default function ConciliationPanel() {
  const { effectiveOrgId } = useCRM();
  const { data: categories } = useTransactionCategories();
  
  const [pendingTxs, setPendingTxs] = useState<PendingTransaction[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // 1. Carregar lançamentos a categorizar
  useEffect(() => {
    if (!effectiveOrgId) return;

    setLoading(true);
    const txsRef = collection(db, 'organizations', effectiveOrgId, 'transactions');
    const q = query(txsRef, where('type', '==', 'EXPENSE'), where('categoryName', '==', 'A Categorizar'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendingTransaction));
      // Ordenar por data mais recente
      list.sort((a, b) => b.date - a.date);
      setPendingTxs(list);
      setLoading(false);
    }, (err) => {
      console.error('[ConciliationPanel] Erro ao ouvir transações:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  // 2. Executar a categorização do item
  const handleCategorize = async (txId: string) => {
    const selectedCategory = selectedCategories[txId];
    if (!selectedCategory) {
      toast.error('Selecione uma categoria válida para confirmar.');
      return;
    }

    setSavingId(txId);
    try {
      const txRef = doc(db, 'organizations', effectiveOrgId!, 'transactions', txId);
      
      // Atualizar a categoria no documento do Firestore
      await updateDoc(txRef, {
        categoryName: selectedCategory,
        updatedAt: Date.now()
      });

      toast.success('Lançamento categorizado e inteligência de auto-categorização alimentada!');
      
      // Limpar seleção do estado
      setSelectedCategories(prev => {
        const next = { ...prev };
        delete next[txId];
        return next;
      });
    } catch (err) {
      console.error('[ConciliationPanel] Erro ao categorizar:', err);
      toast.error('Erro ao atualizar categoria do lançamento.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-primary-500 mr-2" />
        <span className="text-sm text-gray-400">Carregando conciliações pendentes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/40 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
        <div className="text-left space-y-1">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Receipt className="text-primary-500" size={20} />
            Conciliação Bancária (Asaas)
          </h2>
          <p className="text-xs text-gray-400">
            Abaixo estão listados os débitos reais capturados do seu extrato Asaas que não foram classificados de forma automática.
          </p>
        </div>
        <div className="px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-2xl flex items-center gap-2 text-xs font-semibold text-primary-400">
          <Sparkles size={14} />
          O robô contábil aprenderá suas escolhas para as próximas despesas similares.
        </div>
      </div>

      {pendingTxs.length === 0 ? (
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-400">
            <Check size={24} />
          </div>
          <h3 className="text-base font-bold text-white">Tudo concilado!</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Não há transações do Asaas pendentes de classificação no momento. Suas despesas estão 100% integradas à DRE.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pendingTxs.map((tx) => {
            const dateStr = new Date(tx.date).toLocaleDateString('pt-BR');
            const amountFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount);
            
            // Sugestões rápidas de categorização baseado no texto
            const cleanDesc = tx.description.toLowerCase();
            let suggestedCategory = '';
            
            if (cleanDesc.includes('aws') || cleanDesc.includes('amazon')) suggestedCategory = 'Hospedagem / Servidores';
            else if (cleanDesc.includes('google') || cleanDesc.includes('gsuite') || cleanDesc.includes('workspace')) suggestedCategory = 'Ferramentas / SaaS';
            else if (cleanDesc.includes('tarifa') || cleanDesc.includes('taxa') || cleanDesc.includes('mensalidade conta')) suggestedCategory = 'Tarifas Bancárias';
            else if (cleanDesc.includes('pix enviado') || cleanDesc.includes('ted enviado')) suggestedCategory = 'Transferências';

            return (
              <div 
                key={tx.id} 
                className="bg-black/30 border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex-1 space-y-3 text-left">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 bg-white/5 border border-white/5 rounded-lg text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={10} />
                      {dateStr}
                    </span>
                    <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-400 font-black uppercase tracking-wider">
                      Extrato Asaas
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white select-all">{tx.description}</h4>
                    <p className="text-[10px] text-gray-500">ID Externo: {tx.id.replace('asaas_tx_', '')}</p>
                  </div>
                </div>

                {/* Bloco de Valor e Ações */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 min-w-[320px]">
                  <div className="text-right sm:pr-4 sm:border-r border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] uppercase font-black text-gray-500 tracking-wider">Valor do Débito</p>
                    <p className="text-lg font-black text-red-400">{amountFormatted}</p>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="block text-[9px] font-black text-gray-500 uppercase text-left tracking-wider">Categoria Contábil</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedCategories[tx.id] || ''}
                        onChange={(e) => setSelectedCategories(prev => ({ ...prev, [tx.id]: e.target.value }))}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary-500 outline-none"
                      >
                        <option value="" className="bg-[#030712] text-gray-500">Selecionar...</option>
                        {categories?.map((cat: any) => (
                          <option key={cat.id} value={cat.name} className="bg-[#030712] text-white">
                            {cat.name}
                          </option>
                        ))}
                        {/* Fallback de categorias operacionais comuns se a lista não carregar */}
                        {(!categories || categories.length === 0) && (
                          <>
                            <option value="Hospedagem / Servidores" className="bg-[#030712] text-white">Hospedagem / Servidores</option>
                            <option value="Ferramentas / SaaS" className="bg-[#030712] text-white">Ferramentas / SaaS</option>
                            <option value="Tarifas Bancárias" className="bg-[#030712] text-white">Tarifas Bancárias</option>
                            <option value="Impostos" className="bg-[#030712] text-white">Impostos</option>
                            <option value="Marketing & Anúncios" className="bg-[#030712] text-white">Marketing & Anúncios</option>
                            <option value="Serviços Terceirizados" className="bg-[#030712] text-white">Serviços Terceirizados</option>
                          </>
                        )}
                      </select>

                      <button
                        onClick={() => handleCategorize(tx.id)}
                        disabled={savingId === tx.id || !selectedCategories[tx.id]}
                        className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/20 text-gray-900 disabled:text-gray-500 rounded-xl font-bold text-xs flex items-center justify-center transition-all shadow-md shadow-primary-500/10"
                      >
                        {savingId === tx.id ? <Loader2 className="animate-spin" size={14} /> : 'Confirmar'}
                      </button>
                    </div>
                    {suggestedCategory && !selectedCategories[tx.id] && (
                      <p className="text-[10px] text-gray-500 text-left">
                        💡 Sugestão:{' '}
                        <button 
                          onClick={() => setSelectedCategories(prev => ({ ...prev, [tx.id]: suggestedCategory }))}
                          className="text-primary-400 hover:underline font-semibold"
                        >
                          {suggestedCategory}
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
