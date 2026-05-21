import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Calendar, Filter, User, ArrowRight, MessageSquare, Image, BarChart2, CheckCircle2 } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { ChatMessage } from '@/types/chat.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMessage: (messageId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMessage
}) => {
  const messages = useChatStore(state => state.messages);
  const chats = useChatStore(state => state.chats);
  const activeChatId = useChatStore(state => state.activeChatId);

  const [queryText, setQueryText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSenderId, setSelectedSenderId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Escutar tecla ESC para fechar o modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lista única de remetentes no chat ativo para filtrar
  const senders = useMemo(() => {
    const map = new Map<string, string>();
    messages.forEach(m => {
      if (m.senderId && m.senderName) {
        map.set(m.senderId, m.senderName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [messages]);

  // Filtragem local extremamente otimizada e inteligente das mensagens
  const filteredMessages = useMemo(() => {
    if (!isOpen) return [];

    return messages.filter(msg => {
      // 1. Filtro de Texto
      if (queryText.trim() !== '') {
        const textMatch = msg.text?.toLowerCase().includes(queryText.toLowerCase());
        const senderMatch = msg.senderName?.toLowerCase().includes(queryText.toLowerCase());
        if (!textMatch && !senderMatch) return false;
      }

      // 2. Filtro de Tipo
      if (selectedType !== 'all') {
        if (selectedType === 'media' && (!msg.attachments || msg.attachments.length === 0)) return false;
        if (selectedType === 'poll' && msg.type !== 'poll') return false;
        if (selectedType === 'approval' && msg.type !== 'approval') return false;
        if (selectedType === 'text' && (msg.type && msg.type !== 'text')) return false;
      }

      // 3. Filtro de Remetente
      if (selectedSenderId !== 'all' && msg.senderId !== selectedSenderId) return false;

      // 4. Filtro de Datas
      if (msg.createdAt) {
        const msgTime = msg.createdAt.toMillis ? msg.createdAt.toMillis() : 0;
        if (startDate) {
          const start = new Date(startDate).getTime();
          if (msgTime < start) return false;
        }
        if (endDate) {
          // Adiciona 23h59m59s para abranger todo o dia final
          const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1;
          if (msgTime > end) return false;
        }
      }

      return !msg.isDeleted;
    });
  }, [messages, queryText, selectedType, selectedSenderId, startDate, endDate, isOpen]);

  if (!isOpen) return null;

  const currentChatName = chats.find(c => c.id === activeChatId)?.name || 'Conversa';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Caixa do Modal com Design Premium */}
      <div className="relative w-full max-w-2xl h-[85vh] sm:h-[650px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
        
        {/* Cabeçalho */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
              Buscar Mensagens
            </h3>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Pesquisando no chat: <span className="font-medium text-violet-500">{currentChatName}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Pesquisa */}
        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/40 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-400" />
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Pesquise por palavras, frases ou remetentes..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 transition-all"
                autoFocus
              />
              {queryText && (
                <button
                  onClick={() => setQueryText('')}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all ${
                showFilters || selectedType !== 'all' || selectedSenderId !== 'all' || startDate || endDate
                  ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/40 text-violet-600 dark:text-violet-400'
                  : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>

          {/* Painel Expandível de Filtros Avançados */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/40 animate-slide-down">
              
              {/* Filtro por Tipo */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Tipo
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full p-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="all">Qualquer tipo</option>
                  <option value="text">Apenas texto</option>
                  <option value="media">Mídia / Anexos</option>
                  <option value="poll">Enquetes</option>
                  <option value="approval">Aprovações</option>
                </select>
              </div>

              {/* Filtro por Remetente */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" /> Remetente
                </label>
                <select
                  value={selectedSenderId}
                  onChange={(e) => setSelectedSenderId(e.target.value)}
                  className="w-full p-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="all">Qualquer membro</option>
                  {senders.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Datas */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Período
                </label>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-1.5 text-[11px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none"
                  />
                  <span className="text-zinc-400 text-xs">à</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-1.5 text-[11px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none"
                  />
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Corpo dos Resultados */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl text-zinc-400">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nenhum resultado encontrado
                </h4>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs leading-relaxed">
                  Tente ajustar os termos da sua pesquisa ou limpe os filtros para expandir a busca.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 px-1 mb-2">
                {filteredMessages.length} {filteredMessages.length === 1 ? 'MENSAGEM ENCONTRADA' : 'MENSAGENS ENCONTRADAS'}
              </div>

              {filteredMessages.map((msg) => {
                const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
                const formattedDate = format(msgDate, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });

                return (
                  <button
                    key={msg.id}
                    onClick={() => {
                      onSelectMessage(msg.id);
                      onClose();
                    }}
                    className="w-full flex items-start gap-3 p-3.5 text-left rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-950 hover:border-violet-500/20 hover:shadow-sm transition-all group"
                  >
                    {/* Avatar */}
                    {msg.senderPhotoURL ? (
                      <img
                        src={msg.senderPhotoURL}
                        alt={msg.senderName}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-zinc-100 dark:border-zinc-800"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {msg.senderName?.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {msg.senderName}
                        </span>
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                          {formattedDate}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-400 break-words line-clamp-2 leading-relaxed">
                        {msg.text}
                      </p>

                      {/* Tags de tipo de anexo */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded">
                            <Image className="w-2.5 h-2.5" /> Anexo
                          </span>
                        )}
                        {msg.type === 'poll' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">
                            <BarChart2 className="w-2.5 h-2.5" /> Enquete
                          </span>
                        )}
                        {msg.type === 'approval' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Aprovação
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all self-center flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
