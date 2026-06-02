import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDocs, query, where, onSnapshot, orderBy, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Shield, Megaphone, Send, Key, MessageSquare, Check, Lock, User, PlusCircle, Loader2, ArrowRight, Clock, HelpCircle } from 'lucide-react';

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

export default function ComplianceOuvidoriaView() {
  const { user, userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();

  const [activeTab, setActiveTab] = useState<'create' | 'track'>('create');
  
  // Estados de Criação
  const [category, setCategory] = useState<'complaint' | 'suggestion' | 'harassment' | 'other'>('suggestion');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<{ protocol: string; id: string } | null>(null);

  // Estados de Acompanhamento
  const [trackProtocol, setTrackProtocol] = useState('');
  const [trackingTicket, setTrackingTicket] = useState<ComplianceTicket | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<TicketMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Escutar mensagens do chat quando um ticket está aberto para acompanhamento
  useEffect(() => {
    if (!trackingTicket || !effectiveOrgId) return;

    const messagesRef = collection(db, 'organizations', effectiveOrgId, 'compliance_tickets', trackingTicket.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketMessage));
      setChatMessages(list);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [trackingTicket, effectiveOrgId]);

  // Enviar Manifestação
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !effectiveOrgId) return;

    setSubmitting(true);
    const generatedProtocol = 'ETH-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const cleanUserId = isAnonymous ? null : (user?.uid || null);
    const cleanUserName = isAnonymous ? 'Colaborador Anônimo' : (userProfile?.displayName || 'Colaborador');

    try {
      const ticketsRef = collection(db, 'organizations', effectiveOrgId, 'compliance_tickets');
      const docRef = await addDoc(ticketsRef, {
        protocolCode: generatedProtocol,
        category,
        title: title.trim(),
        description: description.trim(),
        isAnonymous,
        userId: cleanUserId,
        userName: cleanUserName,
        status: 'new',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Atualizar o ID no próprio documento para facilidade de leitura posterior
      await updateDoc(docRef, { id: docRef.id });

      // Salvar localmente os protocolos acessíveis pelo navegador para o funcionário
      const savedProtocols = JSON.parse(localStorage.getItem('hub_ombuds_protocols') || '[]');
      savedProtocols.push({ id: docRef.id, protocol: generatedProtocol, title: title.trim() });
      localStorage.setItem('hub_ombuds_protocols', JSON.stringify(savedProtocols));

      setCreatedTicket({ protocol: generatedProtocol, id: docRef.id });
      toast.success('Manifestação enviada com sucesso!');
      
      // Limpar formulário
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error('Erro ao enviar manifestação:', err);
      toast.error('Não foi possível enviar a manifestação.');
    } finally {
      setSubmitting(false);
    }
  };

  // Buscar e Acompanhar Ticket por Protocolo
  const handleTrackTicket = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackProtocol.trim() || !effectiveOrgId) return;

    setTrackingLoading(true);
    try {
      const ticketsRef = collection(db, 'organizations', effectiveOrgId, 'compliance_tickets');
      const q = query(ticketsRef, where('protocolCode', '==', trackProtocol.trim().toUpperCase()));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const ticketDoc = snap.docs[0];
        setTrackingTicket({ id: ticketDoc.id, ...ticketDoc.data() } as ComplianceTicket);
        toast.success('Protocolo localizado!');
      } else {
        toast.error('Código de protocolo não localizado ou inválido.');
        setTrackingTicket(null);
      }
    } catch (err) {
      console.error('Erro ao buscar protocolo:', err);
      toast.error('Ocorreu um erro ao localizar o protocolo.');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Enviar Mensagem no Chat de Acompanhamento
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !trackingTicket || !effectiveOrgId) return;

    setSendingMessage(true);
    try {
      const messagesRef = collection(db, 'organizations', effectiveOrgId, 'compliance_tickets', trackingTicket.id, 'messages');
      await addDoc(messagesRef, {
        senderType: 'reporter',
        senderName: trackingTicket.isAnonymous ? 'Anônimo' : (userProfile?.displayName || 'Colaborador'),
        content: newMessageText.trim(),
        createdAt: Date.now()
      });

      // Atualiza o updatedAt do ticket
      const ticketRef = doc(db, 'organizations', effectiveOrgId, 'compliance_tickets', trackingTicket.id);
      await updateDoc(ticketRef, { updatedAt: Date.now() });

      setNewMessageText('');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      toast.error('Não foi possível enviar a mensagem.');
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

  return (
    <div className="min-h-screen bg-[#07090e] text-white p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 border border-rose-500/20 shadow-xl shadow-rose-500/5">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">Canal de Ouvidoria & Linha Ética</h1>
              <p className="text-xs text-gray-500 mt-0.5">Espaço seguro para manifestações, sugestões e denúncias com garantia de anonimato legal.</p>
            </div>
          </div>

          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 self-start">
            <button
              onClick={() => { setActiveTab('create'); setCreatedTicket(null); }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'create' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              Nova Manifestação
            </button>
            <button
              onClick={() => { setActiveTab('track'); }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'track' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              Acompanhar Protocolo
            </button>
          </div>
        </div>

        {/* Informações de Compliance Legal */}
        <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl flex items-start gap-3">
          <HelpCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            <strong className="text-white">Conformidade com a Lei nº 14.457/2022:</strong> Este canal protege a identidade do denunciante. Se você optar por enviar como <strong className="text-rose-400">Anônimo</strong>, o sistema **não** salvará seu nome, e-mail ou dados de usuário no banco de dados. A única forma de acompanhar as respostas da empresa é salvando o código de protocolo fornecido.
          </p>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        {activeTab === 'create' ? (
          createdTicket ? (
            /* Tela de Sucesso ao Criar Ticket */
            <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -z-10 rounded-full" />
              
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                <Check size={28} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black">Manifestação Enviada!</h2>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Sua manifestação foi registrada de forma segura. Guarde o protocolo abaixo para acompanhar o andamento.
                </p>
              </div>

              <div className="bg-black/40 border border-white/5 p-6 rounded-2xl max-w-md mx-auto space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Seu Protocolo de Acompanhamento</span>
                <span className="text-3xl font-black text-rose-500 font-mono tracking-wider">{createdTicket.protocol}</span>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl max-w-md mx-auto text-left flex items-start gap-2.5">
                <Lock size={16} className="shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed">
                  <strong className="font-bold">Atenção:</strong> Como este ticket foi enviado de forma anônima, **não** temos como recuperar seu protocolo caso você o perca. Copie e salve este código em local seguro.
                </p>
              </div>

              <button
                onClick={() => {
                  setTrackProtocol(createdTicket.protocol);
                  setActiveTab('track');
                  handleTrackTicket();
                }}
                className="px-6 py-3 bg-white text-zinc-950 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all shadow-md active:scale-95 inline-flex items-center gap-1.5"
              >
                Acompanhar agora <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            /* Formulário de Criação */
            <form onSubmit={handleCreateTicket} className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 space-y-6 shadow-2xl">
              <h2 className="text-xl font-bold flex items-center gap-2 border-b border-white/5 pb-4">
                <Megaphone className="text-rose-500" size={20} /> Nova Manifestação
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Tipo de Manifestação</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all font-semibold"
                  >
                    <option value="suggestion">Sugestão / Melhoria</option>
                    <option value="complaint">Reclamação Interna</option>
                    <option value="harassment">Denúncia de Assédio ou Conduta Inadequada</option>
                    <option value="other">Outros Assuntos</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Identificação</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAnonymous(true)}
                      className={`p-3 border rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all ${
                        isAnonymous 
                          ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Lock size={14} /> Anônimo
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAnonymous(false)}
                      className={`p-3 border rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all ${
                        !isAnonymous 
                          ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <User size={14} /> Identificar-se
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Título do Relato</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Sugestão de melhoria nos benefícios ou Conduta inadequada na equipe..."
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Descrição Detalhada</label>
                <textarea
                  required
                  rows={6}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Por favor, relate o ocorrido de forma detalhada. Se possível, inclua datas, horários e o contexto completo do caso..."
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all font-medium leading-relaxed resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-2xl font-bold uppercase tracking-wider shadow-xl shadow-rose-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Enviando Relato...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Enviar Manifestação
                  </>
                )}
              </button>
            </form>
          )
        ) : (
          /* Acompanhamento por Protocolo */
          <div className="space-y-6">
            {!trackingTicket ? (
              /* Formulário de Busca */
              <form onSubmit={handleTrackTicket} className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 text-center space-y-6 shadow-2xl max-w-lg mx-auto">
                <div className="inline-flex p-4 bg-rose-500/10 rounded-3xl text-rose-500 shadow-xl border border-rose-500/20">
                  <Key size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Acompanhar Manifestação</h2>
                  <p className="text-xs text-gray-500 mt-1">Informe o código de 6 dígitos do seu protocolo.</p>
                </div>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    required
                    value={trackProtocol}
                    onChange={e => setTrackProtocol(e.target.value)}
                    placeholder="Ex: ETH-ABC123"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-xl font-black text-center font-mono tracking-widest text-rose-500 placeholder-gray-700 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={trackingLoading}
                    className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-2xl font-bold uppercase tracking-wider shadow-xl shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {trackingLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                    Acessar Canal do Protocolo
                  </button>
                </div>
              </form>
            ) : (
              /* Chat / Detalhes do Ticket */
              <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row h-[70vh] overflow-hidden">
                {/* Coluna Esquerda: Detalhes do Ticket */}
                <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 p-6 bg-zinc-950/20 flex flex-col justify-between shrink-0">
                  <div className="space-y-6">
                    <button
                      onClick={() => setTrackingTicket(null)}
                      className="text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer font-bold uppercase tracking-widest"
                    >
                      &larr; Voltar para Busca
                    </button>

                    <div className="space-y-1">
                      <span className="text-[9px] text-gray-500 font-mono font-bold tracking-widest">PROTOCOLO</span>
                      <h3 className="text-xl font-black text-rose-500 font-mono">{trackingTicket.protocolCode}</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">Categoria</span>
                        <span className="text-xs font-semibold text-white">{getCategoryLabel(trackingTicket.category)}</span>
                      </div>

                      <div>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">Status</span>
                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-black border rounded-lg uppercase tracking-wider ${
                          getStatusLabel(trackingTicket.status)?.color
                        }`}>
                          {getStatusLabel(trackingTicket.status)?.text}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">Envio</span>
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5 mt-1">
                          {trackingTicket.isAnonymous ? (
                            <><Lock size={12} className="text-rose-500" /> Anônimo</>
                          ) : (
                            <><User size={12} className="text-gray-400" /> {trackingTicket.userName}</>
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">Relatado em</span>
                        <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1 mt-1 font-mono">
                          <Clock size={12} /> {new Date(trackingTicket.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <h4 className="font-extrabold text-sm truncate">{trackingTicket.title}</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed mt-1 overflow-y-auto max-h-24 custom-scrollbar">
                      {trackingTicket.description}
                    </p>
                  </div>
                </div>

                {/* Coluna Direita: Chat Reativo */}
                <div className="flex-1 flex flex-col h-full bg-black/20 overflow-hidden">
                  <div className="h-12 border-b border-white/5 px-6 flex items-center gap-2 bg-zinc-950/20 shrink-0">
                    <MessageSquare size={16} className="text-rose-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Canal de Comunicação Seguro</span>
                  </div>

                  {/* Mensagens do Chat */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {chatMessages.length === 0 ? (
                      <div className="py-20 text-center text-gray-500">
                        <MessageSquare className="w-10 h-10 text-gray-800 mx-auto mb-2" />
                        <p className="text-xs">Nenhuma mensagem enviada.</p>
                        <p className="text-[10px] text-gray-600 mt-1">O RH analisará o relato e poderá responder aqui.</p>
                      </div>
                    ) : (
                      chatMessages.map(msg => {
                        const isMe = msg.senderType === 'reporter';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                          >
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
                              <span className={isMe ? 'text-rose-400' : 'text-zinc-300'}>
                                {isMe ? 'Você (Manifestante)' : msg.senderName}
                              </span>
                              {!isMe && (
                                <span className="text-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-500 px-1 py-0.5 rounded uppercase font-black tracking-widest scale-90">
                                  Geral / RH
                                </span>
                              )}
                              <span className="text-[9px] font-mono text-zinc-700">
                                {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className={`text-xs max-w-md p-3 rounded-2xl border ${
                              isMe 
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
                      placeholder="Responda ou envie novas informações..."
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
            )}
          </div>
        )}

      </div>
    </div>
  );
}
