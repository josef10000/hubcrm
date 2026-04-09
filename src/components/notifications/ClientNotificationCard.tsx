import React, { useState } from 'react';
import { Mail, Clock, CheckCircle2, AlertCircle, Send, Loader2, Calendar, UserCheck, FileText, AlertTriangle, ChevronDown, ChevronUp, Bell, BellOff } from 'lucide-react';
import { Client } from '../../types';
import { useCRM } from '../../contexts/CRMContext';
import { toast } from 'sonner';

interface ClientNotificationCardProps {
  client: Client;
}

export default function ClientNotificationCard({ client }: ClientNotificationCardProps) {
  const { triggerManualEmail, isEmailLoading, toggleAsaasNotifications } = useCRM();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleSendEmail = async (type: 'WELCOME' | 'INVOICE' | 'OVERDUE' | 'WELCOME_SUBSCRIPTION' | 'WELCOME_LINK') => {
    try {
      const success = await triggerManualEmail(client.id, type);
      if (success) {
        toast.success(`E-mail enviado com sucesso!`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao disparar e-mail');
    }
  };

  const emailOptions = [
    {
      type: 'WELCOME_SUBSCRIPTION' as const,
      title: 'Vindas (Assin.)',
      icon: UserCheck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      type: 'WELCOME_LINK' as const,
      title: 'Vindas (Link)',
      icon: Send,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      type: 'INVOICE' as const,
      title: 'Fatura/Link',
      icon: FileText,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
    },
    {
      type: 'OVERDUE' as const,
      title: 'Atraso',
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    }
  ];

  const sortedHistory = [...(client.emailHistory || [])].sort((a, b) => b.sentAt - a.sentAt);

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary-500/5 group">
      {/* Header do Card */}
      <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-400/10 flex items-center justify-center text-primary-500 font-bold border border-primary-500/20">
            {client.name[0].toUpperCase()}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white leading-tight">{client.name}</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">{client.plan}</p>
          </div>
        </div>

        {/* Toggle Asaas */}
        <button 
          onClick={() => toggleAsaasNotifications(client.id, !client.asaasNotificationsEnabled)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
            client.asaasNotificationsEnabled 
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
            : 'bg-gray-500/10 text-gray-500 border-gray-500/20 opacity-60'
          }`}
        >
          {client.asaasNotificationsEnabled ? <Bell size={12} /> : <BellOff size={12} />}
          {client.asaasNotificationsEnabled ? 'ASAAS ATIVO' : 'ASAAS OFF'}
        </button>
      </div>

      {/* Ações Rápidas */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-2">
          {emailOptions.map((opt) => {
            const isLoading = isEmailLoading === `${client.id}:${opt.type}`;
            return (
              <button
                key={opt.type}
                onClick={() => handleSendEmail(opt.type)}
                disabled={!!isEmailLoading}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all hover:scale-[1.05] active:scale-95 group/btn ${
                  isLoading 
                  ? 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-50' 
                  : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-primary-500/50 hover:bg-white dark:hover:bg-white/10 shadow-sm'
                }`}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin text-primary-500 mb-1" />
                ) : (
                  <opt.icon size={16} className={`${opt.color} mb-1 transition-transform group-hover/btn:scale-110`} />
                )}
                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
                  {isLoading ? '...' : opt.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Botão Ver Histórico */}
        <button 
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="w-full mt-4 flex items-center justify-between px-4 py-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border border-dashed border-gray-200 dark:border-white/10 rounded-xl"
        >
          <span className="flex items-center gap-2">
            <Clock size={12} />
            HISTÓRICO DE ENVIOS
          </span>
          {isHistoryOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {/* Lista de Histórico (Collapsible) */}
        {isHistoryOpen && (
          <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
            {sortedHistory.length > 0 ? (
              <div className="max-h-[150px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
                {sortedHistory.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 flex items-center justify-between group/log">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {log.status === 'sent' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{log.subject}</p>
                        <p className="text-[8px] text-gray-500 uppercase">{new Date(log.sentAt).toLocaleDateString('pt-BR')} • {new Date(log.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl opacity-40">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Nenhum envio registrado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
