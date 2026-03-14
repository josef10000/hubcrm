import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, onSnapshot, query, where, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Globe, CreditCard, CheckCircle, Clock, AlertCircle, ExternalLink, FileText, MessageSquare, Send, X, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function ClientPortal() {
  const { userId, clientId } = useParams<{ userId: string; clientId: string }>();
  const [client, setClient] = useState<any>(null);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [requestMessage, setRequestMessage] = useState('');
  const [requestCategory, setRequestCategory] = useState('Suporte Técnico');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [clientRequests, setClientRequests] = useState<any[]>([]);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestMessage.trim() || !userId || !clientId) return;

    setIsSubmittingRequest(true);
    try {
      await addDoc(collection(db, 'users', userId, 'supportRequests'), {
        clientId,
        clientName: client.name,
        category: requestCategory,
        message: requestMessage,
        status: 'aberto',
        createdAt: serverTimestamp()
      });
      setRequestMessage('');
      setRequestCategory('Suporte Técnico');
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error submitting request:", err);
      toast.error('Erro ao enviar solicitação. Tente novamente mais tarde.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  useEffect(() => {
    const fetchClientData = async () => {
      if (!userId || !clientId) {
        setError("Link inválido.");
        setLoading(false);
        return;
      }

      // Fetch Support Requests History
      const requestsRef = collection(db, 'users', userId, 'supportRequests');
      const q = query(requestsRef, where('clientId', '==', clientId));
      
      const unsubscribeRequests = onSnapshot(q, (snapshot) => {
        const loadedRequests: any[] = [];
        snapshot.forEach((doc) => {
          loadedRequests.push({ id: doc.id, ...doc.data() });
        });
        loadedRequests.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA; // Descending
        });
        setClientRequests(loadedRequests);
      });

      try {
        const docRef = doc(db, 'users', userId, 'clients', clientId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const clientData = docSnap.data();
          
          if (clientData.asaasCustomerId) {
            try {
              const paymentsRes = await fetch(`/api/asaas/payments?customer=${clientData.asaasCustomerId}`);
              
              let subscription = null;
              if (clientData.asaasSubscriptionId) {
                const subRes = await fetch(`/api/asaas/subscriptions/${clientData.asaasSubscriptionId}`);
                if (subRes.ok) {
                  const subData = await subRes.json();
                  subscription = subData.subscription;
                }
              }

              if (paymentsRes.ok) {
                const paymentsData = await paymentsRes.json();
                const payments = paymentsData.data || [];
                
                setPaymentsHistory(payments);

                if (payments.length > 0) {
                  // Sort payments by due date ascending to get the earliest one
                  const sortedPayments = [...payments].sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                  
                  let targetPayment = sortedPayments.find((p: any) => p.status === 'OVERDUE');
                  if (!targetPayment) {
                    targetPayment = sortedPayments.find((p: any) => p.status === 'PENDING');
                  }
                  if (!targetPayment) {
                    // If no overdue or pending, get the most recent payment (descending)
                    targetPayment = [...payments].sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0];
                  }
                  
                  const status = targetPayment.status;
                  
                  let newPaymentStatus = 'PENDING';
                  if (status === 'RECEIVED' || status === 'CONFIRMED') {
                    newPaymentStatus = 'RECEIVED';
                  } else if (status === 'OVERDUE') {
                    newPaymentStatus = 'OVERDUE';
                  }
                  
                  clientData.paymentStatus = newPaymentStatus;
                  clientData.invoiceUrl = targetPayment.invoiceUrl || clientData.invoiceUrl;
                  
                  clientData.currentDueDate = (status === 'PENDING' || status === 'OVERDUE') ? targetPayment.dueDate : null;
                  clientData.nextDueDate = subscription?.nextDueDate || clientData.nextDueDate;
                }
              }
            } catch (e) {
              console.error("Error fetching real-time Asaas data:", e);
            }
          }
          
          setClient(clientData);
        } else {
          setError("Cliente não encontrado.");
        }
      } catch (err: any) {
        console.error("Error fetching client:", err);
        setError("Não foi possível carregar os dados. Verifique se o link está correto.");
      } finally {
        setLoading(false);
      }
      
      return () => {
        unsubscribeRequests();
      };
    };

    const cleanup = fetchClientData();
    return () => {
      cleanup.then(unsub => unsub && unsub());
    };
  }, [userId, clientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Carregando seu portal...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="bg-white/10 border border-red-500/30 p-6 rounded-2xl max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-red-400 font-semibold mb-2">Ops!</h2>
          <p className="text-gray-300 text-sm mb-4">{error}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Em Desenvolvimento': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'Inadimplente': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'Cancelado': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ativo': return <CheckCircle className="w-5 h-5" />;
      case 'Em Desenvolvimento': return <Clock className="w-5 h-5" />;
      case 'Inadimplente': return <AlertCircle className="w-5 h-5" />;
      default: return <Globe className="w-5 h-5" />;
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Concluído</span>;
      case 'em_analise':
        return <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">Em Análise</span>;
      case 'aberto':
      default:
        return <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Aberto / Na Fila</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans selection:bg-primary-500/30">
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-center mb-4 text-white">Chamado aberto com sucesso! 🚀</h3>
            <p className="text-gray-400 text-center mb-8 leading-relaxed">
              Recebemos sua solicitação e nossa equipe fará a verificação em até <strong className="text-white">24 horas úteis</strong>. Você pode acompanhar o status logo abaixo no seu histórico.
            </p>
            <button 
              onClick={() => {
                setShowSuccessModal(false);
                document.getElementById('historico-chamados')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-primary-500/20"
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20">
            <Globe className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Olá, {client.name.split(' ')[0]}!</h1>
          <p className="text-gray-400">Bem-vindo ao seu Portal do Cliente</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-400" />
              Status do Projeto
            </h2>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(client.status)} mb-6`}>
              {getStatusIcon(client.status)}
              <span className="font-medium">{client.status}</span>
            </div>

            {client.deliveryDate && client.status !== 'Ativo' && client.status !== 'Cancelado' && (
              <div className="mt-2 mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm text-blue-400 font-medium mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Prevista de Entrega
                </p>
                <p className="text-lg font-bold text-white">
                  {new Date(client.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {client.siteLink && client.status === 'Ativo' && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Link do seu site:</p>
                <a 
                  href={client.siteLink.startsWith('http') ? client.siteLink : `https://${client.siteLink}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {client.siteLink}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Finance Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-primary-500/10 rounded-full blur-3xl"></div>
            
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-400" />
              Fatura Atual
            </h2>

            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-1">Plano contratado</p>
              <p className="text-xl font-medium">{client.plan}</p>
            </div>

            {client.currentDueDate && (
              <div className="mb-4 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                <p className="text-sm text-primary-400 font-medium mb-1">Fatura Atual (Pendente)</p>
                <p className="text-lg font-bold text-white">
                  Vencimento: {new Date(client.currentDueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {client.nextDueDate && (
              <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-sm text-gray-400 mb-1">Próxima Assinatura</p>
                <p className="text-lg font-medium">
                  {new Date(client.nextDueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {client.invoiceUrl && client.paymentStatus !== 'RECEIVED' ? (
              <a 
                href={client.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-full py-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors shadow-lg shadow-primary-500/20"
              >
                Pagar via PIX ou Cartão
              </a>
            ) : (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-sm text-gray-400">Nenhuma fatura em aberto no momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment History Card */}
        {paymentsHistory.length > 0 && (
          <div className="mt-6 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              Histórico de Pagamentos
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-sm">
                    <th className="pb-3 font-medium">Vencimento</th>
                    <th className="pb-3 font-medium">Valor</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Comprovante</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsHistory.map((payment: any) => (
                    <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 text-sm">
                        {new Date(payment.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 text-sm font-medium">
                        R$ {payment.value.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                          payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          payment.status === 'OVERDUE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' ? 'PAGO' :
                           payment.status === 'OVERDUE' ? 'VENCIDO' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {payment.invoiceUrl && (
                          <a 
                            href={payment.invoiceUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="hidden sm:inline">Acessar</span>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Project Stages */}
        {client.stages && client.stages.length > 0 && (
          <div className="mt-6 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              Progresso do Projeto
            </h2>
            <div className="space-y-4">
              {client.stages.map((stage: any, index: number) => {
                const isCurrent = !stage.completed && index === client.stages.findIndex((s: any) => !s.completed);
                return (
                  <div key={stage.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all gap-4 ${stage.completed ? 'bg-emerald-500/10 border-emerald-500/20' : isCurrent ? 'bg-primary-500/10 border-primary-500/30 shadow-[0_0_15px_rgba(242,125,38,0.1)]' : 'bg-black/20 border-white/5'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 mt-0.5 ${stage.completed ? 'bg-emerald-500/20 text-emerald-400' : isCurrent ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-gray-400'}`}>
                        {stage.completed ? <CheckCircle size={20} /> : index + 1}
                      </div>
                      <div>
                        <h3 className={`font-medium text-lg ${stage.completed ? 'text-emerald-400' : isCurrent ? 'text-primary-400' : 'text-white'}`}>{stage.name}</h3>
                        {stage.description && <p className="text-sm text-gray-400 mt-1 leading-relaxed">{stage.description}</p>}
                        {stage.approvedAt && <p className="text-xs text-emerald-500/70 mt-2 font-medium">Aprovado em: {new Date(stage.approvedAt).toLocaleString('pt-BR')}</p>}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 sm:ml-14 mt-2 sm:mt-0">
                      {stage.link && (
                        <a 
                          href={stage.link}
                          target="_blank"
                          rel="noreferrer"
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${stage.completed ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                          <ExternalLink size={16} />
                          Ver Material
                        </a>
                      )}
                      
                      {isCurrent && (
                        <button
                          onClick={async () => {
                            if (!userId || !clientId) return;
                            try {
                              const newStages = [...client.stages];
                              newStages[index].completed = true;
                              newStages[index].approvedAt = Date.now();
                              await updateDoc(doc(db, 'users', userId, 'clients', clientId), { stages: newStages });
                              toast.success('Etapa aprovada com sucesso!');
                            } catch (err) {
                              toast.error('Erro ao aprovar etapa.');
                            }
                          }}
                          className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Aprovar Etapa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Support Request Form */}
        <div className="mt-6 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-400" />
            Solicitar Suporte ou Alteração
          </h2>
          <p className="text-gray-400 text-sm mb-6">Precisa de alguma mudança no site ou ajuda com algo? Envie sua solicitação abaixo.</p>
          
          <form onSubmit={handleSubmitRequest}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">Categoria do Chamado</label>
              <select 
                value={requestCategory}
                onChange={(e) => setRequestCategory(e.target.value)}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              >
                <option value="Suporte Técnico" className="bg-[#0a0a0a] text-white">Suporte Técnico</option>
                <option value="Dúvida Financeira" className="bg-[#0a0a0a] text-white">Dúvida Financeira</option>
                <option value="Solicitação de Alteração" className="bg-[#0a0a0a] text-white">Solicitação de Alteração</option>
                <option value="Outros" className="bg-[#0a0a0a] text-white">Outros</option>
              </select>
            </div>
            
            <textarea 
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Descreva o que você precisa em detalhes..."
              className="w-full min-h-[120px] px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500 custom-scrollbar resize-none mb-4"
              required
            ></textarea>
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmittingRequest || !requestMessage.trim()}
                className="flex items-center space-x-2 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all font-medium shadow-xl shadow-primary-500/30 hover:shadow-2xl shadow-primary-500/50"
              >
                {isSubmittingRequest ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Enviar Solicitação
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Support Request History */}
        {clientRequests.length > 0 && (
          <div id="historico-chamados" className="mt-6 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-400" />
              Histórico de Chamados
            </h2>
            
            <div className="space-y-4">
              {clientRequests.map((req) => (
                <div key={req.id} className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden transition-all">
                  <div 
                    className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedRequest(expandedRequest === req.id ? null : req.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getRequestStatusBadge(req.status)}
                        <span className="text-sm font-medium text-gray-300">{req.category || 'Suporte'}</span>
                      </div>
                      <p className="text-white font-medium line-clamp-1">{req.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {req.createdAt?.toDate ? new Date(req.createdAt.toDate()).toLocaleString('pt-BR') : 'Recente'}
                      </p>
                    </div>
                    <div className="shrink-0 text-gray-500">
                      {expandedRequest === req.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                  
                  {expandedRequest === req.id && (
                    <div className="p-5 border-t border-white/5 bg-black/40">
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Sua Solicitação</p>
                        <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{req.message}</p>
                      </div>
                      
                      {req.reply && (
                        <div className="mt-4 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl relative">
                          <div className="absolute -left-2 top-6 w-4 h-4 bg-primary-500/20 rotate-45 border-l border-b border-primary-500/20"></div>
                          <p className="text-xs text-primary-400 uppercase tracking-wider font-bold mb-2">Resposta da Equipe</p>
                          <p className="text-white whitespace-pre-wrap text-sm leading-relaxed">{req.reply}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Support Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm mb-4">Prefere falar pelo WhatsApp?</p>
          <a 
            href="https://wa.me/5511952924208"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors font-medium"
          >
            Falar com o Suporte
          </a>
        </div>
      </div>
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}
