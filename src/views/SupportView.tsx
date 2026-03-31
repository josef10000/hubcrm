import React from 'react';
import { MessageCircle, Clock, MessageSquare, CheckCircle, Trash2 } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function SupportView() {
  const { user, supportRequests, replyingTo, setReplyingTo, replyMessage, setReplyMessage } = useCRM();

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Chamados de Suporte</h2>
            <p className="text-gray-500 dark:text-gray-400">Gerencie as solicitações feitas pelos clientes no Portal.</p>
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
            supportRequests.map((req) => (
              <div key={req.id} className={`bg-gray-100 dark:bg-white/5 backdrop-blur-xl border ${req.status === 'concluido' ? 'border-emerald-500/30 opacity-70' : 'border-gray-200 dark:border-white/10'} p-6 rounded-3xl shadow-lg transition-all`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{String(req.clientName || 'Cliente Desconhecido')}</h3>
                      <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30">
                        {req.status === 'concluido' ? 'Concluído' : req.status === 'em_analise' ? 'Em Análise' : 'Aberto'}
                      </span>
                      {req.category && (
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                          {String(req.category)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Enviado em: {req.createdAt && typeof req.createdAt.toDate === 'function' ? req.createdAt.toDate().toLocaleString('pt-BR') : 'Data desconhecida'}
                    </p>
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
                              if (!user) return;
                              try {
                                await setDoc(doc(db, 'users', user.uid, 'supportRequests', req.id), { 
                                  reply: replyMessage,
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
                          if (!user) return;
                          try {
                            await setDoc(doc(db, 'users', user.uid, 'supportRequests', req.id), { status: 'em_analise' }, { merge: true });
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
                          if (!user) return;
                          try {
                            await setDoc(doc(db, 'users', user.uid, 'supportRequests', req.id), { status: 'concluido' }, { merge: true });
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
                        if (!user) return;
                        if (window.confirm('Tem certeza que deseja excluir este chamado?')) {
                          try {
                            await deleteDoc(doc(db, 'users', user.uid, 'supportRequests', req.id));
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
    </div>
  );
}
