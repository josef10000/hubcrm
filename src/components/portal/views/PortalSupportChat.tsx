import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  User, 
  MessageCircle, 
  MoreVertical, 
  Info,
  Clock,
  CheckCheck,
  Smile
} from 'lucide-react';
import { usePortalChat } from '../../../hooks/usePortalChat';
import { useParams } from 'react-router-dom';

interface PortalSupportChatProps {
  client: any;
}

export default function PortalSupportChat({ client }: PortalSupportChatProps) {
  const { orgId, clientId } = useParams<{ orgId: string; clientId: string }>();
  const [message, setMessage] = useState('');
  const { messages, sendMessage, loading } = usePortalChat(orgId, clientId, client.assignedTo);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim()) return;
    
    const success = await sendMessage(message, client.name);
    if (success) setMessage('');
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const consultant = client.consultant;

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="px-8 py-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-primary-500/20 overflow-hidden">
              {consultant?.photoURL ? (
                <img src={consultant.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="text-white" />
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0a] ${consultant?.presenceStatus === 'online' ? 'bg-emerald-500' : 'bg-gray-500'}`} />
          </div>
          <div>
            <h3 className="font-bold text-white leading-tight">{consultant?.displayName || 'Suporte HubCRM'}</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {consultant?.presenceStatus === 'online' ? 'Disponível Agora' : 'Consultor Offline'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <Info size={20} />
          </button>
          <button className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mb-4"
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-10">
            <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 border border-white/10">
              <MessageCircle className="text-primary-400 w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Inicie uma conversa</h4>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              Dúvidas sobre seu projeto ou financeiro? Mande uma mensagem e nosso time te ajudará em instantes.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, index) => {
              const isMe = msg.senderId === clientId;
              return (
                <motion.div
                  key={msg.id || index}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] md:max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                    <div className={`
                      p-4 rounded-3xl text-sm leading-relaxed shadow-xl
                      ${isMe 
                        ? 'bg-primary-500 text-white rounded-tr-none' 
                        : 'bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-tl-none'}
                    `}>
                      {msg.text}
                    </div>
                    <div className={`flex items-center gap-2 mt-2 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      {isMe && <CheckCheck size={12} className="text-primary-400" />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-white/10 bg-black/20">
        <form 
          onSubmit={handleSend}
          className="relative flex items-center gap-4 bg-white/5 border border-white/10 rounded-[2rem] p-2 pr-4 focus-within:border-primary-500/50 transition-all shadow-inner"
        >
          <button type="button" className="p-3 text-gray-500 hover:text-white transition-colors">
            <Smile size={22} />
          </button>
          <input 
            type="text" 
            placeholder="Digite sua mensagem aqui..."
            className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-white placeholder:text-gray-600"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!message.trim()}
            className={`
              w-12 h-12 rounded-2xl flex items-center justify-center transition-all
              ${message.trim() 
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-105 active:scale-95' 
                : 'bg-white/5 text-gray-600 cursor-not-allowed'}
            `}
          >
            <Send size={20} className={message.trim() ? 'fill-current' : ''} />
          </button>
        </form>
        <p className="text-[10px] text-center text-gray-600 mt-4 font-medium uppercase tracking-widest flex items-center justify-center gap-2">
          <Clock size={10} />
          Tempo médio de resposta: 15 minutos
        </p>
      </div>
    </div>
  );
}
