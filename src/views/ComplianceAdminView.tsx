import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Shield, MessageSquare, Clock, Lock, User, Check, Play, Eye, Archive, Loader2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ComplianceTicket {
  id: string;
  protocolCode: string;
  category: 'complaint' | 'suggestion' | 'harassment' | 'other';
  title: string;
  description: string;
  isAnonymous: boolean;
  userId: string | null;
  userName: string;
  status: 'new' | 'investigating' | 'resolved' | 'archived';
  createdAt: number;
  updatedAt: number;
}

interface TicketMessage {
  id: string;
  senderType: 'reporter' | 'handler';
  senderName: string;
  content: string;
  createdAt: number;
}

export default function ComplianceAdminView() {
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<ComplianceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<ComplianceTicket | null>(null);
  
  // Estados do Chat
  const [chatMessages, setChatMessages] = useState<TicketMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Verificar permissão de acesso
  useEffect(() => {
    if (userProfile && !userProfile.isAdmin && userProfile.role !== 'admin' && userProfile.role !== 'rh') {
      // Verificação simples baseada em role ou se é dono. Se não tiver acesso, manda para home.
      // A rota do AppRouter também valida por permissão, mas blindamos aqui também.
      const hasAccess = userProfile.isAdmin || 
                        (typeof userProfile.role === 'string' && (userProfile.role.toLowerCase() === 'admin' || userProfile.role.toLowerCase() === 'rh'));
      
      if (!hasAccess) {
        toast.error('Acesso restrito ao RH e Administradores.');
        navigate('/');
      }
    }
  }, [userProfile, navigate]);

  // 2. Carregar todos os tickets da organização
  useEffect(() => {
    if (!effectiveOrgId) return;

    const ref = collection(db, 'organizations', effectiveOrgId, 'compliance_tickets');
    const q = query(ref, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ComplianceTicket));
      setTickets(list);
      setLoading(false);
      
      // Atualiza o ticket selecionado se ele sofrer mudanças remotas
      if (selectedTicket) {
        const updated = list.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    }, (err) => {
      console.error('Erro ao ler tickets de compliance:', err);
      toast.error('Erro ao carregar tickets da ouvidoria.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId, selectedTicket?.id]);

  // 3. Escutar mensagens do ticket selecionado
  useEffect(() => {
    if (!selectedTicket || !effectiveOrgId) return;

    const messagesRef = collection(db, 'organizations', effectiveOrgId, 'compliance_tickets', selectedTicket.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketMessage));
      setChatMessages(list);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedTicket?.id, effectiveOrgId]);

  // 4. Mudar Status do Ticket
  const handleChangeStatus = async (ticketId: string, newStatus: ComplianceTicket['status']) => {
    if (!effectiveOrgId) return;

    try {
      const docRef = doc(db, 'organizations', effectiveOrgId, 'compliance_tickets', ticketId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: Date.now()
      });
      toast.success('Status da manifestação atualizado!');
    } catch (err) {
      console.error('Erro ao mudar status:', err);
      toast.error('Erro ao atualizar status.');
    }
  };

  // 5. Enviar Resposta (RH)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedTicket || !effectiveOrgId) return;

    setSendingMessage(true);
    try {
      const messagesRef = collection(db, 'organizations', effectiveOrgId, 'compliance_tickets', selectedTicket.id, 'messages');
      await addDoc(messagesRef, {
        senderType: 'handler',
        senderName: userProfile?.displayName || 'Gestor de Ouvidoria',
        content: newMessageText.trim(),
        createdAt: Date.now()
      });

      const ticketRef = doc(db, 'organizations', effectiveOrgId, 'compliance_tickets', selectedTicket.id);
      await updateDoc(ticketRef, { updatedAt: Date.now() });

      setNewMessageText('');
    } catch (err) {
      console.error('Erro ao responder ticket:', err);
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusLabel = (status: ComplianceTicket['status']) => {
    switch (status) {
      case 'new': return { text: 'Recebido', color: 'bg-blue-500/20 text-blue-400 border-blue-500/20' };
      case 'investigating': return { text: 'Em Análise', color: 'bg-amber-500/20 text-amber-400 border-amber-500/20 animate-pulse' };
      case 'resolved': return { text: 'Resolvido', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' };
      case 'archived': return { text: 'Arquivado', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/20' };
    }
  };

  const getCategoryLabel = (cat: ComplianceTicket['category']) => {
    switch (cat) {
      case 'complaint': return 'Reclamação';
      case 'suggestion': return 'Sugestão';
      case 'harassment': return 'Denúncia de Assédio/Conduta';
      case 'other': return 'Outros';
    }
  };

  // Filtrar tickets na listagem
  const filteredTickets = tickets.filter(t => 
    statusFilter === 'todos' ? true : t.status === statusFilter
  );

  // Contadores
  const countNew = tickets.filter(t => t.status === 'new').length;
  const countInvestigating = tickets.filter(t => t.status === 'investigating').length;
  const countResolved = tickets.filter(t => t.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-[#07090e] text-white p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 border border-rose-500/20 shadow-xl shadow-rose-500/5">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">Painel de Ouvidoria & Linha Ética (Gestão)</h1>
              <p className="text-xs text-gray-500 mt-0.5">Gerenciamento, apuração de denúncias e diálogo seguro de compliance com os colaboradores.</p>
            </div>
          </div>

          {/* Filtros por Status */}
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 shrink-0 self-start">
            {['todos', 'new', 'investigating', 'resolved', 'archived'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                  statusFilter === status 
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {status === 'todos' ? 'Todos' : 
                 status === 'new' ? `Recebidos (${countNew})` : 
                 status === 'investigating' ? `Em Análise (${countInvestigating})` : 
                 status === 'resolved' ? `Resolvidos (${countResolved})` : 'Arquivados'}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Listagem de Tickets */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Lista de Manifestações</h2>
            
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-500">Carregando relatos...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-16 text-center bg-white/5 border border-white/10 rounded-[2.5rem] p-6 text-gray-500">
                <Shield className="w-10 h-10 text-gray-800 mx-auto mb-2" />
                <p className="text-xs">Nenhum ticket encontrado.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                {filteredTickets.map(ticket => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-5 rounded-3xl border transition-all text-left cursor-pointer relative overflow-hidden ${
                        isSelected 
                          ? 'bg-rose-500/5 border-rose-500/30' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-rose-500 font-mono tracking-wider">
                          {ticket.protocolCode}
                        </span>
                        <span className={`px-2 py-0.5 text-[8px] font-black border rounded uppercase tracking-wider ${
                          getStatusLabel(ticket.status)?.color
                        }`}>
                          {getStatusLabel(ticket.status)?.text}
                        </span>
                      </div>
                      
                      <h4 className="font-extrabold text-xs text-white truncate">{ticket.title}</h4>
                      
                      <div className="flex items-center justify-between mt-4 text-[9px] text-gray-500 font-medium">
                        <span className="truncate max-w-[120px]">{getCategoryLabel(ticket.category)}</span>
                        <span className="font-mono">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detalhes do Ticket & Chat */}
          <div className="lg:col-span-2">
            {!selectedTicket ? (
              <div className="h-[50vh] lg:h-full bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <MessageSquare className="w-12 h-12 text-gray-800 animate-pulse mb-4" />
                <h3 className="font-bold text-gray-400 text-lg">Nenhum relato selecionado</h3>
                <p className="text-xs text-gray-600 max-w-xs mx-auto mt-1">
                  Selecione uma manifestação à esquerda para visualizar os detalhes, atualizar o status e interagir de forma segura.
                </p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col h-[70vh]">
                
                {/* Header do Detalhe (Controles) */}
                <div className="p-6 border-b border-white/5 bg-zinc-950/20 flex flex-wrap items-center justify-between gap-4 shrink-0">
                  <div className="text-left">
                    <span className="text-[10px] font-black text-rose-500 font-mono tracking-wider block">
                      PROTOCOLO: {selectedTicket.protocolCode}
                    </span>
                    <h3 className="font-black text-white text-base truncate max-w-sm md:max-w-md">
                      {selectedTicket.title}
                    </h3>
                  </div>

                  {/* Ações de Status */}
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl">
                    <button
                      onClick={() => handleChangeStatus(selectedTicket.id, 'investigating')}
                      title="Mudar para Em Análise"
                      className={`p-2 rounded-xl transition-all ${
                        selectedTicket.status === 'investigating' 
                          ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20' 
                          : 'hover:bg-white/5 text-amber-500'
                      }`}
                    >
                      <Play size={14} className="fill-current" />
                    </button>
                    <button
                      onClick={() => handleChangeStatus(selectedTicket.id, 'resolved')}
                      title="Mudar para Resolvido"
                      className={`p-2 rounded-xl transition-all ${
                        selectedTicket.status === 'resolved' 
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                          : 'hover:bg-white/5 text-emerald-500'
                      }`}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleChangeStatus(selectedTicket.id, 'archived')}
                      title="Mudar para Arquivado"
                      className={`p-2 rounded-xl transition-all ${
                        selectedTicket.status === 'archived' 
                          ? 'bg-zinc-600 text-white shadow-lg' 
                          : 'hover:bg-white/5 text-zinc-400'
                      }`}
                    >
                      <Archive size={14} />
                    </button>
                  </div>
                </div>

                {/* Área Interna Dividida: Detalhes e Chat */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                  
                  {/* Relato Completo */}
                  <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/5 p-6 bg-zinc-950/10 flex flex-col justify-between overflow-y-auto custom-scrollbar shrink-0">
                    <div className="space-y-4 text-left">
                      <div>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">Remetente</span>
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5 mt-1">
                          {selectedTicket.isAnonymous ? (
                            <><Lock size={12} className="text-rose-500" /> Anônimo</>
                          ) : (
                            <><User size={12} className="text-gray-400" /> {selectedTicket.userName}</>
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">Categoria</span>
                        <span className="text-xs font-semibold text-white">{getCategoryLabel(selectedTicket.category)}</span>
                      </div>

                      <div>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">Criado em</span>
                        <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1 mt-1 font-mono">
                          <Clock size={12} /> {new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 text-left space-y-2 mt-6">
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">Conteúdo do Relato</span>
                      <p className="text-xs text-gray-300 leading-relaxed font-medium bg-black/20 border border-white/5 p-4 rounded-2xl max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                        {selectedTicket.description}
                      </p>
                    </div>
                  </div>

                  {/* Canal de Comunicação do RH */}
                  <div className="flex-1 flex flex-col h-full bg-black/10 overflow-hidden">
                    <div className="h-10 border-b border-white/5 px-6 flex items-center bg-zinc-950/10 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Histórico de Mensagens</span>
                    </div>

                    {/* Mensagens */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                      {chatMessages.length === 0 ? (
                        <div className="py-20 text-center text-gray-500">
                          <MessageSquare className="w-10 h-10 text-gray-800 mx-auto mb-2" />
                          <p className="text-xs">Nenhum diálogo estabelecido ainda.</p>
                          <p className="text-[10px] text-gray-600 mt-1">Envie uma resposta abaixo para iniciar o diálogo com o denunciante.</p>
                        </div>
                      ) : (
                        chatMessages.map(msg => {
                          const isReporter = msg.senderType === 'reporter';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isReporter ? 'items-start' : 'items-end'} space-y-1`}
                            >
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
                                <span className={isReporter ? 'text-zinc-300' : 'text-rose-400'}>
                                  {isReporter ? (selectedTicket.isAnonymous ? 'Denunciante (Anônimo)' : msg.senderName) : 'Você (RH / Gestão)'}
                                </span>
                                {!isReporter && (
                                  <span className="text-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-500 px-1 py-0.5 rounded uppercase font-black tracking-widest scale-90">
                                    RH
                                  </span>
                                )}
                                <span className="text-[9px] font-mono text-zinc-700">
                                  {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className={`text-xs max-w-md p-3 rounded-2xl border ${
                                !isReporter 
                                  ? 'bg-rose-500/5 border-rose-500/20 text-white rounded-tr-none'
                                  : 'bg-white/5 border-white/10 text-gray-300 rounded-tl-none'
                              } leading-relaxed break-all`}>
                                {msg.content}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input de Mensagem */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-zinc-950/20 flex gap-2 shrink-0">
                      <input
                        type="text"
                        value={newMessageText}
                        onChange={e => setNewMessageText(e.target.value)}
                        placeholder="Escreva uma resposta para o manifestante..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-rose-500 transition-all font-medium text-white placeholder-gray-600"
                      />
                      <button
                        type="submit"
                        disabled={sendingMessage || !newMessageText.trim()}
                        className="p-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-rose-500/20 cursor-pointer flex items-center justify-center"
                      >
                        {sendingMessage ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </form>

                  </div>

                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
