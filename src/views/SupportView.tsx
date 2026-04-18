import React, { useState } from 'react';
import { MessageCircle, Clock, MessageSquare, CheckCircle, Trash2, Star, User, ArrowUp, ArrowDown, Minus, AlertTriangle, Plus, Phone } from 'lucide-react';
import SupportRequestModal from '../components/SupportRequestModal';
import { differenceInHours } from 'date-fns';
import { useCRM } from '../contexts/CRMContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import Pagination from '../components/common/Pagination';

const ITEMS_PER_PAGE = 15;

export default function SupportView() {
  const { user } = useAuth();
  const crm = useCRM();
  
  // 1. Extração e Blindagem dos Dados do Banco (Garante que nunca sejam nulos)
  const { 
    supportRequests: rawSupportRequests = [], 
    effectiveOrgId = '', 
    teamProfiles: rawTeamProfiles = [] 
  } = crm || {};

  const supportRequests = Array.isArray(rawSupportRequests) ? rawSupportRequests.filter(Boolean) : [];
  const teamProfiles = Array.isArray(rawTeamProfiles) ? rawTeamProfiles.filter(Boolean) : [];

  // 2. Estados Locais da Interface
  const [supportFilter, setSupportFilter] = useState<'all' | 'mine'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'sla'>('sla');
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRequests = [...supportRequests]
    .filter(req => supportFilter === 'all' || req.assignedTo === user?.uid)
    .sort((a, b) => {
      if (sortBy === 'recent') return 0;
      const slaA = getSlaStatus(a?.createdAt, a?.priority)?.remaining ?? 999;
      const slaB = getSlaStatus(b?.createdAt, b?.priority)?.remaining ?? 999;
      
      if (a?.status === 'concluido' && b?.status !== 'concluido') return 1;
      if (a?.status !== 'concluido' && b?.status === 'concluido') return -1;
      
      return slaA - slaB;
    });

  // Reset page when filtering or sorting
  React.useEffect(() => {
    setCurrentPage(1);
  }, [supportFilter, sortBy]);

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getSlaStatus = (createdAt: any, priority: string = 'baixa') => {
    if (!createdAt) return null;
    const createdDate = typeof createdAt.toDate === 'function' ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const hoursElapsed = differenceInHours(now, createdDate);
    
    let slaLimit = 24;
    if (priority === 'alta') slaLimit = 4;
    else if (priority === 'media') slaLimit = 12;

    const remaining = slaLimit - hoursElapsed;
    const isOverdue = remaining <= 0;

    return {
      remaining,
      isOverdue,
      text: isOverdue ? 'SLA Estourado' : `${Math.round(remaining)}h restantes`
    };
  };

  const handleUpdateSupport = async (requestId: string, data: any) => {
    if (!effectiveOrgId) return;
    try {
      await setDoc(doc(db, 'organizations', effectiveOrgId, 'supportRequests', requestId), data, { merge: true });
      toast.success('Chamado atualizado!');
    } catch (e) {
      toast.error('Erro ao atualizar chamado.');
    }
  };

  // 4. Cálculos Seguros
  const csatRequests = supportRequests.filter(r => r.csatScore);
  const avgCsat = csatRequests.length > 0 
    ? (csatRequests.reduce((acc, r) => acc + (Number(r.csatScore) || 0), 0) / csatRequests.length).toFixed(1)
    : null;

  const openRequests = supportRequests.filter(r => r.status !== 'concluido');
  const slaMetrics = {
    atrasados: 0,
    vencendoAgora: 0, 
    emAlerta: 0, 
    noPrazo: 0
  };

  openRequests.forEach(req => {
    if (!req.createdAt) return;
    const sla = getSlaStatus(req.createdAt, req.priority);
    if (!sla) return;
    if (sla.isOverdue) slaMetrics.atrasados++;
    else if (sla.remaining < 2) slaMetrics.vencendoAgora++;
    else if (sla.remaining < 6) slaMetrics.emAlerta++;
    else slaMetrics.noPrazo++;
  });

  return (
    <div className="w-full h-full overflow-y-auto p-6 bg-[#030712] custom-scrollbar">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Atendimento ao Cliente</h2>
            <p className="text-gray-500 dark:text-gray-400">Gerencie solicitações, SLAs e satisfação dos clientes.</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsNewRequestModalOpen(true)}
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-primary-500/20 active:scale-95 font-bold"
            >
              <Plus size={20} />
              Novo Chamado Interno
            </button>
            
            {avgCsat && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 px-6 rounded-2xl flex items-center gap-4 bg-gradient-to-br from-yellow-500/5 to-transparent">
                <div className="p-3 bg-yellow-500/20 text-yellow-500 rounded-xl">
                  <Star size={24} fill="currentColor" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Satisfação (CSAT)</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgCsat} <span className="text-sm font-normal text-gray-400">/ 5.0</span></p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SLA Summary Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-4 rounded-2xl">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Atrasados</p>
            <div className="flex items-center justify-between">
              <h3 className={`text-2xl font-bold ${slaMetrics.atrasados > 0 ? 'text-red-500' : 'text-gray-400'}`}>{slaMetrics.atrasados}</h3>
              <div className={`p-2 rounded-lg ${slaMetrics.atrasados > 0 ? 'bg-red-500/20 text-red-500' : 'bg-gray-500/10 text-gray-500'}`}>
                <AlertTriangle size={18} />
              </div>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-4 rounded-2xl">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Vencendo Agora (&lt;2h)</p>
            <div className="flex items-center justify-between">
              <h3 className={`text-2xl font-bold ${slaMetrics.vencendoAgora > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{slaMetrics.vencendoAgora}</h3>
              <div className={`p-2 rounded-lg ${slaMetrics.vencendoAgora > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-gray-500/10 text-gray-500'}`}>
                <Clock size={18} />
              </div>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-4 rounded-2xl">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Em Alerta (&lt;6h)</p>
            <div className="flex items-center justify-between">
              <h3 className={`text-2xl font-bold ${slaMetrics.emAlerta > 0 ? 'text-indigo-400' : 'text-gray-400'}`}>{slaMetrics.emAlerta}</h3>
              <div className={`p-2 rounded-lg ${slaMetrics.emAlerta > 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-500/10 text-gray-500'}`}>
                <Clock size={18} />
              </div>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-4 rounded-2xl">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">No Prazo</p>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-emerald-500">{slaMetrics.noPrazo}</h3>
              <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg">
                <CheckCircle size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Sorting */}
        <div className="flex justify-end gap-3 mb-6">
          {/* Smart View Filter */}
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-1 rounded-xl flex">
            <button 
              onClick={() => setSupportFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${supportFilter === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setSupportFilter('mine')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${supportFilter === 'mine' ? 'bg-primary-500 text-white shadow-xl shadow-primary-500/20' : 'text-gray-500 hover:text-white'}`}
            >
              Meus Chamados
            </button>
          </div>

          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-1 rounded-xl flex">
            <button 
              onClick={() => setSortBy('recent')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${sortBy === 'recent' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
            >
              Recentes
            </button>
            <button 
              onClick={() => setSortBy('sla')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${sortBy === 'sla' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
            >
              Prioridade SLA
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl">
import React from 'react';
import { LifeBuoy, Clock, Users, ArrowRightLeft, Star } from 'lucide-react';
import { useSupport } from '../hooks/useSupport';
import { SupportCard } from '../components/support/SupportCard';

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
              <p className="text-gray-500 dark:text-gray-400 font-medium italic">Suporte em tempo real & Gestão de SLA</p>
            </div>
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
              <span className="text-[10px] font-bold text-gray-400 uppercase font-black">SLA Atrasado</span>
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
              const isCritico = sla?.isOverdue && req.status !== 'concluido';
              
              return (
                            toast.error('Erro ao excluir chamado.');
                          }
                        }
                      }}
                      className="flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 px-4 py-2 rounded-xl transition-all font-medium"
                    >
                      <Trash2 size={18} aria-hidden="true" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            );
            })
          )}
        </div>

        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            const container = document.querySelector('.overflow-y-auto');
            if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          totalItems={filteredRequests.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </div>

      <SupportRequestModal 
        isOpen={isNewRequestModalOpen} 
        onClose={() => setIsNewRequestModalOpen(false)} 
      />
    </div>
  );
}
