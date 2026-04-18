import React, { useState } from 'react';
import { Clock, MessageSquare, CheckCircle, Trash2, User, Phone } from 'lucide-react';

interface SupportCardProps {
  req: any;
  sla: any;
  isCritico: boolean;
  teamProfiles: any[];
  onUpdate: (id: string, data: any) => void;
  onReply: (id: string, message: string, status: string) => void;
  onDelete: (id: string) => void;
}

export function SupportCard({ req, sla, isCritico, teamProfiles, onUpdate, onReply, onDelete }: SupportCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyMessage, setReplyMessage] = useState(req.reply || '');

  const handleSendReply = () => {
    if (!replyMessage.trim()) return;
    onReply(req.id, replyMessage, req.status);
    setIsReplying(false);
  };

  return (
    <div className={`bg-gray-100 dark:bg-white/5 backdrop-blur-xl border transition-all duration-500 p-6 rounded-3xl shadow-lg ${
      req.status === 'concluido' ? 'border-emerald-500/30 opacity-70' : 
      isCritico ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20' : 
      'border-gray-200 dark:border-white/10'
    }`}>
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
            {req?.origin === 'whatsapp' && (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30">
                <Phone size={10} />
                WhatsApp
              </span>
            )}
            
            <div className="flex items-center gap-1.5 ml-2">
              <select 
                value={req.priority || 'baixa'}
                onChange={(e) => onUpdate(req.id, { priority: e.target.value })}
                className={`text-[10px] font-bold uppercase p-1 px-2 rounded-lg bg-black/20 border border-white/10 outline-none cursor-pointer ${
                  req.priority === 'alta' ? 'text-red-400' : req.priority === 'media' ? 'text-amber-400' : 'text-indigo-400'
                }`}
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>

            {req.status !== 'concluido' && (
              <div className={`flex items-center gap-1.5 ml-auto text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${
                isCritico ? 'bg-red-500 text-white border-red-600 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                sla?.remaining < 2 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' :
                sla?.remaining < 6 ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
              }`}>
                <Clock size={12} />
                {sla?.text}
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Enviado em: {req.createdAt && typeof req.createdAt.toDate === 'function' ? req.createdAt.toDate().toLocaleString('pt-BR') : 'Data desconhecida'}
          </p>

          <div className="flex items-center gap-2 mb-4 bg-black/20 p-2 rounded-xl border border-white/5 w-fit">
            <User size={14} className="text-gray-500" />
            <select 
              value={req.assignedTo || ''}
              onChange={(e) => {
                const staff = teamProfiles.find(p => p.uid === e.target.value);
                onUpdate(req.id, { 
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

          {req.reply && (
            <div className="bg-primary-500/10 p-4 rounded-xl border border-primary-500/20 text-gray-900 dark:text-white whitespace-pre-wrap mb-4 relative">
              <div className="absolute -top-2 left-6 w-4 h-4 bg-primary-500/10 rotate-45 border-l border-t border-primary-500/20"></div>
              <p className="text-xs text-primary-500 dark:text-primary-400 font-bold uppercase tracking-wider mb-2">Sua Resposta</p>
              {String(req.reply)}
            </div>
          )}

          {isReplying && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Escreva sua resposta para o cliente..."
                className="w-full min-h-[100px] px-4 py-3 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500 custom-scrollbar resize-none mb-3"
              ></textarea>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsReplying(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendReply}
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
              onClick={() => onUpdate(req.id, { status: 'em_analise' })}
              className="flex items-center justify-center space-x-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 px-4 py-2 rounded-xl transition-all font-medium"
            >
              <Clock size={18} />
              <span>Analisar</span>
            </button>
          )}
          
          {req.status !== 'concluido' && (
            <button 
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center justify-center space-x-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 px-4 py-2 rounded-xl transition-all font-medium"
            >
              <MessageSquare size={18} />
              <span>Responder</span>
            </button>
          )}

          {req.status !== 'concluido' && (
            <button 
              onClick={() => onUpdate(req.id, { status: 'concluido' })}
              className="flex items-center justify-center space-x-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 px-4 py-2 rounded-xl transition-all font-medium"
            >
              <CheckCircle size={18} />
              <span>Concluir</span>
            </button>
          )}
          <button 
            onClick={() => onDelete(req.id)}
            className="flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 px-4 py-2 rounded-xl transition-all font-medium"
          >
            <Trash2 size={18} />
            <span>Excluir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
