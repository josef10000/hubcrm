import React from 'react';
import { LifeBuoy, Clock, Users, ArrowRightLeft, Star, CheckCircle } from 'lucide-react';
import { useSupport } from '../hooks/useSupport';
import { SupportCard } from '../components/support/SupportCard';
import SupportRequestModal from '../components/SupportRequestModal';
import { useState } from 'react';

export default function SupportView() {
  const {
    requests,
    metrics,
    teamProfiles,
    supportFilter,
    setSupportFilter,
    sortBy,
    setSortBy,
    updateRequest,
    submitReply,
    removeRequest,
    getSlaStatus
  } = useSupport();

  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-700">
      {/* Header & Stats Section */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-primary-500/20 to-violet-500/20 rounded-2xl border border-primary-500/20 shadow-xl shadow-primary-500/10">
              <LifeBuoy className="w-8 h-8 text-primary-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Central de Atendimento</h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium italic">Suporte em tempo real &amp; Gestão de SLA</p>
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => setIsNewRequestModalOpen(true)}
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-primary-500/20 active:scale-95 font-bold"
            >
              Novo Chamado Interno
            </button>
          </div>
        </div>

        {/* Global Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-[2]">
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Média CSAT</span>
            </div>
            <p className="text-2xl font-black text-amber-500">{metrics.avgCsat || 'N/A'}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-1 text-red-500">
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">SLA Atrasado</span>
            </div>
            <p className="text-2xl font-black text-red-500">{metrics.slaMetrics.atrasados}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-1 text-blue-500">
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Em Aberto</span>
            </div>
            <p className="text-2xl font-black text-blue-500">{requests.filter(r => r.status !== 'concluido').length}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-1 text-emerald-500">
              <CheckCircle size={16} />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Resolvidos</span>
            </div>
            <p className="text-2xl font-black text-emerald-500">{requests.filter(r => r.status === 'concluido').length}</p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-gray-100 dark:bg-black/20 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-white/5 shadow-inner">
        <div className="flex gap-1 bg-white dark:bg-black/40 p-1 rounded-2xl border border-gray-300 dark:border-white/10 shadow-sm">
          <button 
            onClick={() => setSupportFilter('all')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${supportFilter === 'all' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Todos os Chamados
          </button>
          <button 
            onClick={() => setSupportFilter('mine')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${supportFilter === 'mine' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Meus Atendimentos
          </button>
        </div>

        <div className="flex items-center gap-3 px-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={14} className="text-gray-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Ordenar por:</span>
          </div>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-xs font-bold text-gray-900 dark:text-gray-200 outline-none cursor-pointer border-none focus:ring-0"
          >
            <option value="sla" className="bg-gray-100 dark:bg-[#0a0a0a]">Urgência (SLA)</option>
            <option value="recent" className="bg-gray-100 dark:bg-[#0a0a0a]">Mais Recentes</option>
          </select>
        </div>
      </div>

      {/* Requests Grid/List */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-gray-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
              <LifeBuoy className="w-12 h-12 text-gray-300 dark:text-white/10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Tudo em dia!</h2>
            <p className="text-gray-500 dark:text-gray-400">Não há nenhum chamado de suporte pendente no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {requests.map((req) => {
              const sla = getSlaStatus(req.createdAt, req.priority);
              const isCritico = !!(sla?.isOverdue && req.status !== 'concluido');
              
              return (
                <SupportCard 
                  key={req.id}
                  req={req}
                  sla={sla}
                  isCritico={isCritico}
                  teamProfiles={teamProfiles}
                  onUpdate={updateRequest}
                  onReply={submitReply}
                  onDelete={removeRequest}
                />
              );
            })}
          </div>
        )}
      </div>

      <SupportRequestModal 
        isOpen={isNewRequestModalOpen} 
        onClose={() => setIsNewRequestModalOpen(false)} 
      />
    </div>
  );
}
