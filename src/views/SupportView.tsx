import React from 'react';
import { MessageCircle, Clock, MessageSquare, CheckCircle, Trash2, Star, User, ArrowUp, ArrowDown, Minus, AlertCircle, Plus, Smartphone } from 'lucide-react';
import SupportRequestModal from '../components/SupportRequestModal';
import { differenceInHours } from 'date-fns';
import { useCRM } from '../contexts/CRMContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function SupportView() {
  const { user } = useAuth();
  const { supportRequests, replyingTo, setReplyingTo, replyMessage, setReplyMessage, effectiveOrgId, teamProfiles } = useCRM();
  const [sortBy, setSortBy] = React.useState<'recent' | 'sla'>('recent');
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = React.useState(false);


  const csatRequests = supportRequests.filter(r => r.csatScore);
  const avgCsat = csatRequests.length > 0 
    ? (csatRequests.reduce((acc, r) => acc + (Number(r.csatScore) || 0), 0) / csatRequests.length).toFixed(1)
    : null;

  // Monitoramento de SLA para o Resumo
  const openRequests = supportRequests.filter(r => r.status !== 'concluido');
  const slaMetrics = {
    atrasados: 0,
    vencendoAgora: 0, // < 2h
    emAlerta: 0, // < 6h
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


  const handleUpdateSupport = async (requestId: string, data: any) => {
    if (!effectiveOrgId) return;
    try {
      await setDoc(doc(db, 'organizations', effectiveOrgId, 'supportRequests', requestId), data, { merge: true });
      toast.success('Chamado atualizado!');
    } catch (e) {
      toast.error('Erro ao atualizar chamado.');
    }
  };

  const getSlaStatus = (createdAt: any, priority?: string) => {
    if (!createdAt) return null;
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const hoursPast = differenceInHours(new Date(), date);
    
    // SLA Definitions
    const slaLimits = {
      'alta': 4,
      'media': 24,
      'baixa': 72
    };
    
    const limit = slaLimits[priority as keyof typeof slaLimits] || 24;
    const remaining = limit - hoursPast;
    
    return {
      remaining,
      isOverdue: remaining < 0,
      text: remaining < 0 ? `Atrasado ${Math.abs(remaining)}h` : `${remaining}h restantes`
    };
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
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
                <AlertCircle size={18} />
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
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Em Alerta (<6h)</p>
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
        <div className="flex justify-end gap-2 mb-6">
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-1 rounded-xl flex">
            <button 
              onClick={() => setSortBy('recent')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${sortBy === 'recent' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              Recentes
            </button>
            <button 
              onClick={() => setSortBy('sla')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${sortBy === 'sla' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              Prioridade SLA
            </button>
          </div>
        </div>


        <div className="space-y-4">
          {supportRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl">
              <MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum chamado aberto</h3>
              <p className="text-gray-500 dark:text-gray-400">Seus clientes ainda não enviaram nenhuma solicitação.</p>
            </div>
          ) : (
            [...supportRequests].sort((a, b) => {
              if (sortBy === 'recent') return 0; // Already sorted by date in context
              const slaA = getSlaStatus(a.createdAt, a.priority)?.remaining || 999;
              const slaB = getSlaStatus(b.createdAt, b.priority)?.remaining || 999;
              
              // Concluidos sempre pro final
              if (a.status === 'concluido' && b.status !== 'concluido') return 1;
              if (a.status !== 'concluido' && b.status === 'concluido') return -1;
              
              return slaA - slaB;
            }).map((req) => (

              <div key={req.id} className={`bg-gray-100 dark:bg-white/5 backdrop-blur-xl border ${req.status === 'concluido' ? 'border-emerald-500/30 opacity-70' : 'border-gray-200 dark:border-white/10'} p-6 rounded-3xl shadow-lg transition-all`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{String(req.clientName || 'Cliente Desconhecido')}</h3>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                        req.status === 'concluido' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                        req.status === 'resolvido' ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 
                        req.status === 'em_analise' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
                        'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {req.status === 'concluido' ? 'Concluído' : req.status === 'resolvido' ? 'Resolvido' : req.status === 'em_analise' ? 'Em Análise' : 'Aberto'}
                      </span>
                      {req.origin === 'whatsapp' && (
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30">
                          <Smartphone size={10} />
                          WhatsApp
                        </span>
                      )}
                      {req.category && (
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20">
                          {String(req.category)}
                        </span>
                      )}

                      {/* Display Priority */}
                      <div className="flex items-center gap-1.5 ml-2">
                        <select 
                          value={req.priority || 'baixa'}
                          onChange={(e) => handleUpdateSupport(req.id, { priority: e.target.value })}
                          className={`text-[10px] font-bold uppercase p-1 px-2 rounded-lg bg-black/20 border border-white/10 outline-none cursor-pointer ${
                            req.priority === 'alta' ? 'text-red-400' : req.priority === 'media' ? 'text-amber-400' : 'text-indigo-400'
                          }`}
                        >
                          <option value="alta">Alta</option>
                          <option value="media">Média</option>
                          <option value="baixa">Baixa</option>
                        </select>
                      </div>

                      {/* SLA Info */}
                      {req.status !== 'concluido' && (
                        <div className={`flex items-center gap-1.5 ml-auto text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${
                          (() => {
                            const sla = getSlaStatus(req.createdAt, req.priority);
                            if (!sla) return '';
                            if (sla.isOverdue) return 'bg-red-500/20 text-red-500 border-red-500/30 animate-pulse';
                            if (sla.remaining < 2) return 'bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
                            if (sla.remaining < 6) return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
                            return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
                          })()
                        }`}>
                          <Clock size={12} />
                          {getSlaStatus(req.createdAt, req.priority)?.text}
                        </div>
                      )}

                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Enviado em: {req.createdAt && typeof req.createdAt.toDate === 'function' ? req.createdAt.toDate().toLocaleString('pt-BR') : 'Data desconhecida'}
                    </p>

                    {/* Assignment Selector */}
                    <div className="flex items-center gap-2 mb-4 bg-black/20 p-2 rounded-xl border border-white/5 w-fit">
                      <User size={14} className="text-gray-500" />
                      <select 
                        value={req.assignedTo || ''}
                        onChange={(e) => {
                          const staff = teamProfiles.find(p => p.uid === e.target.value);
                          handleUpdateSupport(req.id, { 
                            assignedTo: e.target.value,
                            assignedName: staff?.displayName || 'Desconhecido'
                          });
                        }}
                        className="text-xs bg-transparent border-none outline-none text-gray-300 cursor-pointer min-w-[150px]"
                      >
                        <option value="">Não atribuído</option>
                        {teamProfiles.map(staff => (
                          <option key={staff.uid} value={staff.uid} className="bg-[#0a0a0a]">{staff.displayName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-white dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-200 whitespace-pre-wrap mb-4">
                      {String(req.message || '')}
                    </div>

                    {req.csatScore && (
                      <div className="mb-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex gap-4 items-start">
                        <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg">
                          <Star size={16} fill="currentColor" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-1">Feedback do Cliente ({req.csatScore}/5)</p>
                          <p className="text-sm text-gray-300 italic">"{req.csatComment || 'Sem comentários adicionais.'}"</p>
                        </div>
                      </div>
                    )}

                    {req.reply && (
                      <div className="bg-primary-500/10 p-4 rounded-xl border border-primary-500/20 text-gray-900 dark:text-white whitespace-pre-wrap mb-4 relative">
                        <div className="absolute -top-2 left-6 w-4 h-4 bg-primary-500/10 rotate-45 border-l border-t border-primary-500/20"></div>
                        <p className="text-xs text-primary-500 dark:text-primary-400 font-bold uppercase tracking-wider mb-2">Sua Resposta</p>
                        {String(req.reply)}
                      </div>
                    )}

                    {replyingTo === req.id && (
                      <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                        <textarea
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Escreva sua resposta para o cliente..."
                          className="w-full min-h-[100px] px-4 py-3 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500 custom-scrollbar resize-none mb-3"
                        ></textarea>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyMessage('');
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={async () => {
                              if (!replyMessage.trim()) return;
                              if (!effectiveOrgId) return;
                              try {
                                await setDoc(doc(db, 'organizations', effectiveOrgId, 'supportRequests', req.id), { 
                                  reply: replyMessage,
                                  repliedAt: serverTimestamp(),
                                  status: req.status === 'aberto' ? 'em_analise' : req.status
                                }, { merge: true });
                                toast.success('Resposta enviada com sucesso!');
                                setReplyingTo(null);
                                setReplyMessage('');
                              } catch (e) {
                                toast.error('Erro ao enviar resposta.');
                              }
                            }}
                            className="px-4 py-2 text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                          >
                            Enviar Resposta
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                    {req.status === 'aberto' && (
                      <button 
                        onClick={async () => {
                          if (!effectiveOrgId) return;
                          try {
                            await setDoc(doc(db, 'organizations', effectiveOrgId, 'supportRequests', req.id), { status: 'em_analise' }, { merge: true });
                            toast.success('Chamado em análise!');
                          } catch (e) {
                            toast.error('Erro ao atualizar chamado.');
                          }
                        }}
                        className="flex items-center justify-center space-x-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 px-4 py-2 rounded-xl transition-all font-medium"
                      >
                        <Clock size={18} />
                        <span>Analisar</span>
                      </button>
                    )}
                    
                    {req.status !== 'concluido' && (
                      <button 
                        onClick={() => {
                          setReplyingTo(replyingTo === req.id ? null : req.id);
                          setReplyMessage(req.reply || '');
                        }}
                        className="flex items-center justify-center space-x-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 px-4 py-2 rounded-xl transition-all font-medium"
                      >
                        <MessageSquare size={18} />
                        <span>Responder</span>
                      </button>
                    )}

                    {req.status !== 'concluido' && (
                      <button 
                        onClick={async () => {
                          if (!effectiveOrgId) return;
                          try {
                            await setDoc(doc(db, 'organizations', effectiveOrgId, 'supportRequests', req.id), { status: 'concluido' }, { merge: true });
                            toast.success('Chamado marcado como concluído!');
                          } catch (e) {
                            toast.error('Erro ao atualizar chamado.');
                          }
                        }}
                        className="flex items-center justify-center space-x-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 px-4 py-2 rounded-xl transition-all font-medium"
                      >
                        <CheckCircle size={18} />
                        <span>Concluir</span>
                      </button>
                    )}
                    <button 
                      onClick={async () => {
                        if (!effectiveOrgId) return;
                        if (window.confirm('Tem certeza que deseja excluir este chamado?')) {
                          try {
                            await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'supportRequests', req.id));
                            toast.success('Chamado excluído!');
                          } catch (e) {
                            toast.error('Erro ao excluir chamado.');
                          }
                        }
                      }}
                      className="flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 px-4 py-2 rounded-xl transition-all font-medium"
                    >
                      <Trash2 size={18} />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <SupportRequestModal 
        isOpen={isNewRequestModalOpen} 
        onClose={() => setIsNewRequestModalOpen(false)} 
      />
    </div>
  );
}
