import React from 'react';
import { Mail, Clock, CheckCircle2, AlertCircle, Send, Loader2, Calendar, UserCheck, FileText, AlertTriangle } from 'lucide-react';
import { Client } from '../../types';
import { useCRM } from '../../contexts/CRMContext';
import { toast } from 'sonner';

interface EmailsTabProps {
  client: Client;
}

export default function EmailsTab({ client }: EmailsTabProps) {
  const { triggerManualEmail, isEmailLoading } = useCRM();

  const handleSendEmail = async (type: 'WELCOME' | 'INVOICE' | 'OVERDUE') => {
    try {
      const success = await triggerManualEmail(client.id, type);
      if (success) {
        toast.success(`E-mail de ${type === 'WELCOME' ? 'Boas-vindas' : type === 'INVOICE' ? 'Fatura' : 'Atraso'} enviado com sucesso!`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao disparar e-mail');
    }
  };

  const emailOptions = [
    {
      type: 'WELCOME' as const,
      title: 'E-mail de Boas-vindas',
      description: 'Envia as instruções iniciais e confirmação de cadastro.',
      icon: UserCheck,
      color: 'text-primary-500',
      bgColor: 'bg-primary-500/10',
      borderColor: 'border-primary-500/20'
    },
    {
      type: 'INVOICE' as const,
      title: 'Fatura e Link de Pagamento',
      description: 'Envia o boleto/PIX e o link para pagamento da fatura atual.',
      icon: FileText,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20'
    },
    {
      type: 'OVERDUE' as const,
      title: 'Lembrete de Inadimplência',
      description: 'Aviso amigável sobre fatura em atraso (Overdue).',
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20'
    }
  ];

  const sortedHistory = [...(client.emailHistory || [])].sort((a, b) => b.sentAt - a.sentAt);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Seção de Disparo Manual */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Send size={18} className="text-primary-500" />
          Central de Disparos Manuais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {emailOptions.map((opt) => {
            const isLoading = isEmailLoading === `${client.id}:${opt.type}`;
            return (
              <div 
                key={opt.type}
                className={`p-5 rounded-2xl border ${opt.borderColor} ${opt.bgColor} backdrop-blur-sm flex flex-col justify-between transition-all hover:scale-[1.02] active:scale-[0.98] group`}
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl ${opt.bgColor} border ${opt.borderColor} flex items-center justify-center mb-3 shadow-lg`}>
                    <opt.icon className={opt.color} size={20} />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-1">{opt.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
                <button
                  onClick={() => handleSendEmail(opt.type)}
                  disabled={!!isEmailLoading}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isLoading 
                    ? 'bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed' 
                    : 'bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail size={14} />
                      Disparar Agora
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seção de Histórico */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock size={18} className="text-gray-400" />
          Histórico de Envios
        </h3>
        <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-inner">
          {sortedHistory.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
              {sortedHistory.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      log.type === 'WELCOME' ? 'bg-primary-500/10 text-primary-500' :
                      log.type === 'INVOICE' ? 'bg-indigo-500/10 text-indigo-400' :
                      log.type === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {log.type === 'WELCOME' ? <UserCheck size={16} /> :
                       log.type === 'INVOICE' ? <FileText size={16} /> :
                       log.type === 'OVERDUE' ? <AlertTriangle size={16} /> :
                       <Mail size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{log.subject}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                        <Calendar size={10} />
                        {new Date(log.sentAt).toLocaleString('pt-BR')}
                        <span className="opacity-30">•</span>
                        <span>Para: {log.recipient}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {log.status === 'sent' ? (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 size={10} />
                        Enviado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle size={10} />
                        Falhou
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-200 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                <Mail size={24} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Nenhum e-mail enviado ainda.</p>
              <p className="text-xs text-gray-600 dark:text-gray-500 mt-1 italic">Use a central acima para disparar o primeiro.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
