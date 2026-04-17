import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Search, User, MessageSquare, AlertTriangle, 
  CheckCircle, BookOpen, Copy, ExternalLink, 
  History, Send, Info, Clock, ShieldAlert,
  Hash, Globe, Phone, Mail
} from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { toast } from 'sonner';
import { Client, WikiArticle } from '../types';

interface SupportRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClientId?: string;
}

export default function SupportRequestModal({ isOpen, onClose, initialClientId }: SupportRequestModalProps) {
  const { 
    clients, supportRequests, wikiArticles, 
    handleCreateSupportRequest, handleAddClientLog, handleSaveClient 
  } = useCRM();

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    initialClientId ? clients.find(c => c.id === initialClientId) || null : null
  );
  const [category, setCategory] = useState('Suporte Técnico');
  const [priority, setPriority] = useState<'baixa' | 'media' | 'alta'>('media');
  const [message, setMessage] = useState('');
  const [whatsappContext, setWhatsappContext] = useState('');
  const [isNoteOnly, setIsNoteOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wiki State
  const [wikiSearch, setWikiSearch] = useState('');

  // Editing Client State (Temporal)
  const [clientEmail, setClientEmail] = useState('');
  const [clientSite, setClientSite] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');

  // Sync temporal state when client changes
  React.useEffect(() => {
    if (selectedClient) {
      setClientEmail(selectedClient.email || '');
      setClientSite(selectedClient.siteLink || '');
      setClientWhatsapp(selectedClient.whatsapp || '');
    }
  }, [selectedClient]);

  // Sync selected client when initialClientId changes or modal opens
  React.useEffect(() => {
    if (isOpen && initialClientId) {
      const client = clients.find(c => c.id === initialClientId);
      if (client) setSelectedClient(client);
    }
  }, [isOpen, initialClientId, clients]);

  // Filters
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.whatsapp.includes(searchQuery) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [clients, searchQuery]);

  const filteredWiki = useMemo(() => {
    if (!wikiSearch.trim()) return wikiArticles.slice(0, 3);
    return wikiArticles.filter(a => {
      const cats = a.categories || [];
      return a.title.toLowerCase().includes(wikiSearch.toLowerCase()) ||
             cats.some(c => c.toLowerCase().includes(wikiSearch.toLowerCase()));
    }).slice(0, 5);
  }, [wikiArticles, wikiSearch]);

  const existingTicket = useMemo(() => {
    if (!selectedClient) return null;
    return supportRequests.find(r => r.clientId === selectedClient.id && r.status !== 'concluido');
  }, [selectedClient, supportRequests]);

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast.error('Selecione um cliente.');
      return;
    }
    if (!message.trim() && !isNoteOnly) {
      toast.error('Descreva o problema ou solicitação.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Atualizar dados do cliente se mudaram
      const dataChanged = 
        clientEmail !== (selectedClient.email || '') ||
        clientSite !== (selectedClient.siteLink || '') ||
        clientWhatsapp !== (selectedClient.whatsapp || '');

      if (dataChanged) {
        await handleSaveClient({
          id: selectedClient.id,
          email: clientEmail,
          siteLink: clientSite,
          whatsapp: clientWhatsapp
        });
      }

      if (isNoteOnly) {
        // Apenas registrar na timeline
        await handleAddClientLog(selectedClient.id, `[Interação WhatsApp] ${message}`);
      } else {
        // Criar chamado
        await handleCreateSupportRequest({
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          category,
          priority,
          message,
          whatsappContext,
          origin: 'whatsapp'
        });
      }

      onClose();
      // Reset form
      setSearchQuery('');
      setSelectedClient(null);
      setMessage('');
      setWhatsappContext('');
    } catch (e) {
      // toast is handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto pt-20 md:pt-4">
      <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[85vh]">
        
        {/* Left Side: Form */}
        <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Phone className="text-primary-500" /> Atendimento Ativo
                {initialClientId && selectedClient && (
                  <span className="text-primary-400 hidden sm:inline"> - {selectedClient.name}</span>
                )}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {initialClientId && selectedClient 
                  ? `Registrando atendimento para ${selectedClient.name}`
                  : 'Abra chamados ou registre notas rapidamente.'
                }
              </p>
            </div>
            <button 
              onClick={() => {
                onClose();
                // Reset states after animation
                setTimeout(() => {
                  setSelectedClient(null);
                  setMessage('');
                  setWhatsappContext('');
                  setIsNoteOnly(false);
                }, 300);
              }}
              className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Cliente Search / Display - Hidden if initialClientId is provided */}
            {!initialClientId && (
              <div className="relative">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Cliente</label>
                {!selectedClient ? (
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nome, WhatsApp ou e-mail..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-primary-500/50 transition-all font-medium"
                    />
                    {filteredClients.length > 0 && (
                      <div className="absolute top-full left-0 w-full bg-[#1a1a1a] border border-white/10 rounded-2xl mt-2 overflow-hidden shadow-2xl z-20">
                        {filteredClients.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedClient(c);
                              setSearchQuery('');
                            }}
                            className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                          >
                            <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500">
                               <User size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-white">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.whatsapp} • {c.email || 'Sem e-mail'}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                         <User size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">{selectedClient.name}</p>
                        <div className="flex gap-2 mt-1">
                          {selectedClient.status === 'Ativo' ? (
                            <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Ativo</span>
                          ) : selectedClient.status === 'Inadimplente' ? (
                            <span className="bg-red-500/20 text-red-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Inadimplente</span>
                          ) : null}
                          {selectedClient.stages?.some(s => !s.completed) && (
                            <span className="bg-blue-500/20 text-blue-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Em Onboarding</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedClient(null)}
                      className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5"
                    >
                      Trocar
                    </button>
                  </div>
                )}
              </div>
            )}

            {selectedClient && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-500">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <input 
                      type="text" 
                      value={clientWhatsapp}
                      onChange={e => setClientWhatsapp(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-300 outline-none focus:border-white/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <input 
                      type="email" 
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-300 outline-none focus:border-white/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {existingTicket && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex gap-4 animate-bounce-short">
                <AlertTriangle className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-500 uppercase tracking-widest">Atenção: Chamado em Aberto</p>
                  <p className="text-xs text-amber-200/70 mt-1">Este cliente já possui um chamado aberto: <span className="font-bold italic">"{existingTicket.message.substring(0, 40)}..."</span></p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Categoria</label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white outline-none focus:border-primary-500/50 appearance-none font-medium"
                >
                  <option value="Suporte Técnico">Suporte Técnico</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Dúvida / Wiki">Dúvida / Wiki</option>
                  <option value="Bug / Erro">Bug / Erro</option>
                  <option value="Sugestão">Sugestão / Melhoria</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Prioridade</label>
                <div className="flex gap-2">
                  {(['baixa', 'media', 'alta'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                        priority === p 
                          ? p === 'alta' ? 'bg-red-500/20 border-red-500 text-red-500 shadow-lg shadow-red-500/10' :
                            p === 'media' ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/10' :
                            'bg-blue-500/20 border-blue-500 text-blue-500 shadow-lg shadow-blue-500/10'
                          : 'bg-white/5 border-white/5 text-gray-500'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500">
                  Descrição do Problema <span className="text-primary-500 lowercase font-medium ml-1">(obrigatório)</span>
                </label>
                <button 
                  onClick={() => setIsNoteOnly(!isNoteOnly)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isNoteOnly ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                >
                  <History size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Apenas Registrar Nota</span>
                </button>
              </div>
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={isNoteOnly ? "O que foi conversado no WhatsApp?" : "O que o cliente relatou ou o que precisa ser feito?"}
                className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white outline-none focus:border-primary-500/50 transition-all placeholder-gray-600 custom-scrollbar resize-none"
              ></textarea>
            </div>

            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
              <label className="text-xs font-black uppercase tracking-widest text-gray-600 mb-2 block flex items-center gap-2">
                <History size={14} /> Draft: Resumo / Contexto WhatsApp (Interno)
              </label>
              <textarea 
                value={whatsappContext}
                onChange={e => setWhatsappContext(e.target.value)}
                placeholder="Cole aqui o trecho da conversa ou observações internas que não devem ir no chamado público..."
                className="w-full min-h-[80px] bg-transparent text-gray-400 text-xs outline-none placeholder-gray-700 custom-scrollbar resize-none"
              ></textarea>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedClient}
              className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-[0.98] ${
                isNoteOnly 
                  ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20' 
                  : 'bg-primary-500 hover:bg-primary-600 text-white shadow-primary-500/20'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  {isNoteOnly ? 'Registrar Interação' : 'Abrir Chamado Agora'}
                  <Send size={20} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Wiki & Search */}
        <div className="w-full md:w-[300px] bg-black/40 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          <div>
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <BookOpen size={18} className="text-primary-400" /> Wiki Hub
            </h3>
            <p className="text-gray-500 text-xs">Busca rápida de manuais e manuais.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text" 
              value={wikiSearch}
              onChange={e => setWikiSearch(e.target.value)}
              placeholder="Pesquisar guia..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-primary-500/30"
            />
          </div>

          <div className="space-y-3">
             {filteredWiki.map(article => (
                <div 
                  key={article.id}
                  className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase text-primary-500 tracking-tighter">
                      {(article.categories || [])[0] || 'Geral'}
                    </span>
                    <div className="flex gap-1">
                       <button 
                         onClick={() => {
                           const url = `${window.location.origin}/wiki?id=${article.id}`;
                           navigator.clipboard.writeText(url);
                           toast.success('Link do artigo copiado!');
                         }}
                         className="p-1.5 bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                         title="Copiar Link"
                       >
                         <Copy size={12} />
                       </button>
                       <button 
                          onClick={() => {
                            navigator.clipboard.writeText(article.title);
                            toast.success('Título copiado!');
                          }}
                          className="p-1.5 bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                          title="Copiar Título"
                       >
                         <ExternalLink size={12} />
                       </button>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-gray-200 leading-tight group-hover:text-primary-400 transition-colors">
                     {article.title}
                  </p>
                </div>
             ))}
             {filteredWiki.length === 0 && (
               <div className="text-center py-10">
                 <p className="text-gray-600 text-xs italic">Nenhum guia encontrado.</p>
               </div>
             )}
          </div>

          <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4">
            <div className="p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10">
              <div className="flex items-center gap-2 mb-2 text-primary-400">
                <Info size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Dica Premium</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed italic">
                Sempre atualize o e-mail do cliente se ele enviar um novo pelo WhatsApp. Isso garante que as faturas cheguem ao destino certo!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
