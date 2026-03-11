import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Globe, CreditCard, CheckCircle, Clock, AlertCircle, ExternalLink, FileText, MessageSquare, Send } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function ClientPortal() {
  const { userId, clientId } = useParams<{ userId: string; clientId: string }>();
  const [client, setClient] = useState<any>(null);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestMessage.trim() || !userId || !clientId) return;

    setIsSubmittingRequest(true);
    try {
      await addDoc(collection(db, 'users', userId, 'supportRequests'), {
        clientId,
        clientName: client.name,
        message: requestMessage,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Solicitação enviada com sucesso! Entraremos em contato em breve.');
      setRequestMessage('');
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
                  let targetPayment = payments.find((p: any) => p.status === 'OVERDUE');
                  if (!targetPayment) {
                    targetPayment = payments.find((p: any) => p.status === 'PENDING');
                  }
                  if (!targetPayment) {
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
    };

    fetchClientData();
  }, [userId, clientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans selection:bg-orange-500/30">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
            <Globe className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Olá, {client.name.split(' ')[0]}!</h1>
          <p className="text-gray-400">Bem-vindo ao seu Portal do Cliente</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-400" />
              Status do Projeto
            </h2>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(client.status)} mb-6`}>
              {getStatusIcon(client.status)}
              <span className="font-medium">{client.status}</span>
            </div>

            {client.siteLink && client.status === 'Ativo' && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Link do seu site:</p>
                <a 
                  href={client.siteLink.startsWith('http') ? client.siteLink : `https://${client.siteLink}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
                >
                  {client.siteLink}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Finance Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
            
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-400" />
              Fatura Atual
            </h2>

            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-1">Plano contratado</p>
              <p className="text-xl font-medium">{client.plan}</p>
            </div>

            {client.currentDueDate && (
              <div className="mb-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <p className="text-sm text-orange-400 font-medium mb-1">Fatura Atual (Pendente)</p>
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
                className="flex items-center justify-center w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors shadow-lg shadow-orange-500/20"
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
              <FileText className="w-5 h-5 text-orange-400" />
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
                            className="inline-flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300 transition-colors"
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

        {/* Support Request Form */}
        <div className="mt-6 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-400" />
            Solicitar Suporte ou Alteração
          </h2>
          <p className="text-gray-400 text-sm mb-6">Precisa de alguma mudança no site ou ajuda com algo? Envie sua solicitação abaixo.</p>
          
          <form onSubmit={handleSubmitRequest}>
            <textarea 
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Descreva o que você precisa..."
              className="w-full min-h-[120px] px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-gray-500 custom-scrollbar resize-none mb-4"
              required
            ></textarea>
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmittingRequest || !requestMessage.trim()}
                className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all font-medium shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)]"
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

        {/* Support Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm mb-4">Prefere falar pelo WhatsApp?</p>
          <a 
            href="https://wa.me/5511952924208"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors font-medium"
          >
            Falar com o Suporte
          </a>
        </div>
      </div>
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}
