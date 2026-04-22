import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, Loader2, Calendar, LayoutGrid, Image as ImageIcon } from 'lucide-react';
import { parseMentions } from '../../helpers/chatHelpers';
import { useCRM } from '../../contexts/CRMContext';
import { ChatMessage } from '../../types/chat.types';
import MentionSuggestions from './MentionSuggestions';
import { uploadImageToImgBB } from '../../lib/imgbb';
import { toast } from 'sonner';
import EmojiPicker from './EmojiPicker';

import { PollCreatorModal } from './PollCreatorModal';
import { ApprovalCreatorModal } from './ApprovalCreatorModal';
import { BarChart2, CheckCircle2 } from 'lucide-react';
import { ClientSelectorModal } from './ClientSelectorModal';
import { Client } from '../../types';

interface MessageInputProps {
  onSend: (
    text: string, 
    mentions: string[], 
    attachments: string[], 
    replyTo: ChatMessage['replyTo'] | null, 
    members: string[], 
    type: "text" | "poll" | "approval", 
    poll?: ChatMessage['poll'],
    approval?: ChatMessage['approval']
  ) => void;
  onTyping: (isTyping: boolean) => void;
  replyTo: ChatMessage['replyTo'] | null;
  onCancelReply: () => void;
  editingMessage: ChatMessage | null;
  onCancelEdit: () => void;
  onUpdate: (messageId: string, text: string) => void;
  members: string[];
  parentMessageId?: string; // Para enviar mensagens em Threads
}

export default function MessageInput({ 
  onSend, onTyping, replyTo, onCancelReply, editingMessage, onCancelEdit, onUpdate, members 
}: MessageInputProps) {
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const { teamProfiles } = useCRM();
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout|null>(null);

  // Focus e carregar texto ao editar
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      textareaRef.current?.focus();
    } else {
      setText('');
    }
  }, [editingMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !uploading) return;

    if (editingMessage) {
      onUpdate(editingMessage.id, text);
      onCancelEdit();
    } else {
      const mentions = parseMentions(text, teamProfiles.map(p => ({ uid: p.uid, displayName: p.displayName })));
      onSend(text, mentions, [], replyTo, members, "text");
    }
    
    setText('');
    onTyping(false);
    setShowMentions(false);
  };

  const handleCreatePoll = (question: string, options: string[]) => {
    const pollData = {
      question,
      options: options.map(opt => ({
        id: crypto.randomUUID(),
        text: opt,
        votes: []
      }))
    };

    onSend('', [], [], null, members, 'poll', pollData);
  };

  const handleCreateApproval = (question: string, type: 'discount' | 'holiday' | 'expense' | 'other', value?: any) => {
    const approvalData: ChatMessage['approval'] = {
      question,
      type,
      status: 'pending',
      value
    };

    onSend('', [], [], null, members, 'approval', undefined, approvalData);
  };

  const handleSelectClient = (client: Client) => {
    const clientCardData: ChatMessage['richPreview'] = {
      title: client.name,
      description: client.notes || "Sem observações adicionais.",
      url: `/dashboard`, // No CRM atual, clicamos e abre o modal via estado global ou busca
      status: client.status,
      value: client.planPrice ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.planPrice) : 'N/A'
    };

    onSend(`Vinculei a ficha de ${client.name}`, [], [], null, members, 'client_card', undefined, undefined);
    // Nota: O onSend precisa aceitar richPreview ou tratamos internamente no hook. 
    // Vou ajustar o onSend para ser mais flexível se necessário.
    setIsClientModalOpen(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const id = toast.loading('Enviando anexo...');
    try {
      const url = await uploadImageToImgBB(file);
      onSend('[Anexo]', [], [url], null, members, "text");
      toast.success('Anexo enviado!', { id });
    } catch (error) {
      toast.error('Erro ao enviar anexo.', { id });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    
    // Lógica de Menções
    const cursorPos = e.target.selectionStart;
    const lastAtPos = val.lastIndexOf('@', cursorPos - 1);
    
    if (lastAtPos !== -1) {
      const textAfterAt = val.slice(lastAtPos + 1, cursorPos);
      if (!textAfterAt.includes(' ')) {
        setShowMentions(true);
        setMentionQuery(textAfterAt);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleMentionSelect = (member: { uid: string; displayName: string }) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const lastAtPos = text.lastIndexOf('@', cursorPos - 1);
    
    const beforeAt = text.slice(0, lastAtPos);
    const afterAt = text.slice(cursorPos);
    const mentionText = `@${member.displayName} `;
    
    setText(beforeAt + mentionText + afterAt);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setShowMentions(false);
      setIsEmojiOpen(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const cursorPos = textareaRef.current?.selectionStart || text.length;
    const before = text.slice(0, cursorPos);
    const after = text.slice(cursorPos);
    setText(before + emoji + after);
    
    // Devolve o foco ao textarea após 10ms
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="p-4 pb-4 bg-white dark:bg-black/20 border-t border-gray-100 dark:border-white/10 relative">
      {/* Indicador de Resposta */}
      {replyTo && (
        <div className="absolute bottom-full left-0 right-0 bg-gray-50 dark:bg-white/5 p-3 flex justify-between items-center border-t border-gray-200 dark:border-white/10 animate-in slide-in-from-bottom">
          <div className="flex-1">
            <span className="text-xs font-bold text-primary-500 uppercase block mb-1">Respondendo a {replyTo.senderName}</span>
            <p className="text-sm text-gray-500 break-words line-clamp-1 italic leading-tight">"{replyTo.text}"</p>
          </div>
          <button onClick={onCancelReply} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      )}

      {/* Indicador de Edição */}
      {editingMessage && (
        <div className="absolute bottom-full left-0 right-0 bg-amber-50 dark:bg-amber-500/10 p-3 flex justify-between items-center border-t border-amber-200 dark:border-amber-500/20 animate-in slide-in-from-bottom">
          <div className="flex-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase block mb-1">Editando mensagem</span>
            <p className="text-sm text-amber-700 dark:text-amber-400 break-words line-clamp-1 italic leading-tight">"{editingMessage.text}"</p>
          </div>
          <button onClick={onCancelEdit} className="p-1 hover:bg-amber-200 dark:hover:bg-white/10 rounded-full transition-colors">
            <X size={16} className="text-amber-600" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-6xl mx-auto">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
        />
        
        <button 
          type="button" 
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-xl transition-all disabled:opacity-50"
          title="Anexar arquivo"
        >
          {uploading ? <Loader2 size={20} className="animate-spin text-primary-500" /> : <Paperclip size={20} />}
        </button>

        <button 
          type="button" 
          onClick={() => setIsPollModalOpen(true)}
          className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-xl transition-all"
          title="Criar Enquete"
        >
          <BarChart2 size={20} />
        </button>

        <button 
          type="button" 
          onClick={() => setIsApprovalModalOpen(true)}
          className="p-2.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
          title="Solicitar Aprovação"
        >
          <CheckCircle2 size={20} />
        </button>

        <button 
          type="button" 
          onClick={() => setIsClientModalOpen(true)}
          className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
          title="Vincular Cliente CRM"
        >
          <LayoutGrid size={20} />
        </button>

        <button 
          type="button" 
          className="p-2.5 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all"
          title="GIFs e Stickers"
        >
          <ImageIcon size={20} />
        </button>

        <button 
          type="button" 
          className={`p-2.5 rounded-xl transition-all ${scheduledDate ? 'text-primary-500 bg-primary-500/10' : 'text-gray-400 hover:text-primary-500 hover:bg-primary-500/10'}`}
          title="Agendar Mensagem"
        >
          <Calendar size={20} />
        </button>

        <div className="flex-1 relative">
          {showMentions && (
            <MentionSuggestions 
              query={mentionQuery} 
              members={teamProfiles.map(p => ({ uid: p.uid, displayName: p.displayName, photoURL: p.photoURL }))} 
              onSelect={handleMentionSelect} 
              onClose={() => setShowMentions(false)} 
            />
          )}
          <textarea 
            ref={textareaRef}
            rows={1}
            placeholder="Escreva uma mensagem..."
            className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 pr-12 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all dark:text-white resize-none max-h-32 custom-scrollbar"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
          <button 
            type="button" 
            onClick={() => setIsEmojiOpen(!isEmojiOpen)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500 transition-colors"
          >
            <Smile size={20} />
          </button>

          <EmojiPicker 
            isOpen={isEmojiOpen} 
            onSelect={handleEmojiSelect} 
            onClose={() => setIsEmojiOpen(false)} 
          />
        </div>

        <button 
          type="submit" 
          disabled={!text.trim() || uploading}
          className={`p-3 rounded-2xl shadow-lg transition-all ${
            text.trim() && !uploading
              ? editingMessage 
                ? 'bg-amber-500 text-white shadow-amber-500/20 hover:scale-105 active:scale-95'
                : 'bg-primary-500 text-white shadow-primary-500/20 hover:scale-105 active:scale-95' 
              : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
          }`}
        >
          {editingMessage ? <CheckCircle2 size={20} /> : <Send size={20} />}
        </button>
      </form>

      <PollCreatorModal 
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onSelect={handleCreatePoll}
      />

      <ApprovalCreatorModal 
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onSelect={handleCreateApproval}
      />

      <ClientSelectorModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSelect={handleSelectClient}
      />
    </div>
  );
}
