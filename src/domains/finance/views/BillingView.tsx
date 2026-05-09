import React, { useState } from 'react';
import { CreditCard, AlertTriangle, UserCheck, Activity, CheckCircle, Trash2, TrendingDown } from 'lucide-react';
import { useCRM } from '@crm/contexts/CRMContext';
import { getPlanPrice } from '@/helpers';
import BankReconciliation from '@/components/finance/BankReconciliation';
import CategoryManager from '@/components/finance/CategoryManager';

export default function BillingView() {
  const { clients, commissions, handlePayCommission, handleDeleteCommission } = useCRM();
  const [activeTab, setActiveTab] = useState<'inadimplencia' | 'comissoes' | 'conciliacao' | 'categorias'>('inadimplencia');

  // Cálculo de Inadimplência
  const delinquentClients = clients.filter(c => c.status === 'Inadimplente' || c.paymentStatus === 'OVERDUE');
  const totalOverdue = delinquentClients.reduce((acc, c) => acc + getPlanPrice(c.plan, c.billingCycle, c), 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setActiveTab('inadimplencia')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'inadimplencia' ? 'bg-emerald-500 text-gray-900 shadow-lg shadow-emerald-500/20' : 'bg-black/40 text-gray-400 hover:bg-black/20'}`}
          >
            <AlertTriangle size={18} />
            Inadimplência
          </button>
          <button
            onClick={() => setActiveTab('comissoes')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'comissoes' ? 'bg-emerald-500 text-gray-900 shadow-lg shadow-emerald-500/20' : 'bg-black/40 text-gray-400 hover:bg-black/20'}`}
          >
            <UserCheck size={18} />
            Comissões
          </button>
          <button
            onClick={() => setActiveTab('conciliacao')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'conciliacao' ? 'bg-emerald-500 text-gray-900 shadow-lg shadow-emerald-500/20' : 'bg-black/40 text-gray-400 hover:bg-black/20'}`}
          >
            <Activity size={18} />
            Conciliação OFX
          </button>
          <button
            onClick={() => setActiveTab('categorias')}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'categorias' ? 'bg-emerald-500 text-gray-900 shadow-lg shadow-emerald-500/20' : 'bg-black/40 text-gray-400 hover:bg-black/20'}`}
          >
            <Activity size={18} />
            Categorias
          </button>
        </div>

        {activeTab === 'inadimplencia' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl shadow-xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-500/20 text-red-500 rounded-2xl">
                    <TrendingDown size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-500">Total Inadimplente</h3>
                    <p className="text-sm text-red-400/70">Receita pausada por falta de pagamento</p>
                  </div>
                </div>
                <p className="text-4xl font-black text-red-500">R$ {totalOverdue.toFixed(2).replace('.', ',')}</p>
              </div>

              <div className="bg-black/40 dark:bg-zinc-950/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-8 rounded-3xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Métrica de Recuperação</h3>
                <div className="flex items-end gap-2 text-3xl font-bold text-emerald-500">
                  {delinquentClients.length} <span className="text-sm text-gray-500 mb-1 font-normal">clientes em atraso</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-white/5 h-2 rounded-full mt-4 overflow-hidden">
                  <div className="bg-red-500 h-full w-[15%]" />
                </div>
              </div>
            </div>

            <div className="bg-black/40 dark:bg-zinc-950/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Lista de Inadimplência Crítica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {delinquentClients.map(c => (
                  <div key={c.id} className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between group hover:bg-red-500/10 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                        <p className="text-[10px] text-red-400 uppercase font-black">R$ {getPlanPrice(c.plan, c.billingCycle, c).toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>
                    <button className="p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-red-500/20">
                      Cobrança
                    </button>
                  </div>
                ))}
                {delinquentClients.length === 0 && (
                  <div className="col-span-full py-12 text-center">
                    <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
                    <p className="text-gray-500">Parabéns! Inadimplência está em 0%.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'comissoes' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg">
                <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-1">A Pagar</h3>
                <p className="text-3xl font-bold text-yellow-500">
                  R$ {commissions.filter(c => c.status === 'PENDING').reduce((acc, c) => acc + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-2">{commissions.filter(c => c.status === 'PENDING').length} comissões pendentes</p>
              </div>
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg">
                <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-1">Total Pago</h3>
                <p className="text-3xl font-bold text-emerald-500">
                  R$ {commissions.filter(c => c.status === 'PAID').reduce((acc, c) => acc + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-2">Repassado aos vendedores</p>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Gestão de Comissões</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-500 dark:text-gray-400 text-sm">
                      <th className="pb-3 font-medium">Data</th>
                      <th className="pb-3 font-medium">Vendedor</th>
                      <th className="pb-3 font-medium">Cliente/Oferta</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Valor</th>
                      <th className="pb-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">Nenhuma comissão registrada.</td>
                      </tr>
                    ) : (
                      commissions.map(comm => (
                        <tr key={comm.id} className="border-b border-white/5 hover:bg-emerald-500/5 transition-colors group">
                          <td className="py-4 text-gray-500 text-xs">{new Date(comm.date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-4 font-medium text-gray-900 dark:text-white">{comm.userName}</td>
                          <td className="py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{comm.clientName}</div>
                            <div className="text-[10px] text-gray-500 uppercase">{comm.offerName}</div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${comm.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                              {comm.status === 'PAID' ? 'Pago' : 'Pendente'}
                            </span>
                          </td>
                          <td className="py-4 font-bold text-gray-900 dark:text-white text-right">R$ {comm.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {comm.status === 'PENDING' && (
                                <button 
                                  onClick={() => handlePayCommission(comm.id)}
                                  className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                  title="Marcar como Pago"
                                >
                                  <CheckCircle size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteCommission(comm.id)}
                                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
