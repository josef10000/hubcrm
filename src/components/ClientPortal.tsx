import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, getDocs, addDoc, collection, serverTimestamp, onSnapshot, query, where, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getPlanPrice, getSetupPrice, calculateDiscount } from '../helpers';
import { Globe, CreditCard, CheckCircle, Clock, AlertCircle, ExternalLink, FileText, MessageSquare, Send, X, ChevronDown, ChevronUp, Calendar, Users, Copy, HelpCircle, Search, ShoppingCart, Star } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import SupportSatisfactionModal from './SupportSatisfactionModal';

export default function ClientPortal() {
  const { orgId, clientId } = useParams<{ orgId: string; clientId: string }>();
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
  
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState('');
  const [isSubmittingNPS, setIsSubmittingNPS] = useState(false);
  const [npsSubmitted, setNpsSubmitted] = useState(false);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [showCsatModal, setShowCsatModal] = useState(false);
  const [pendingCsatRequestId, setPendingCsatRequestId] = useState<string | null>(null);

  const [globalAnnouncement, setGlobalAnnouncement] = useState<{title: string, message: string, type: string, isActive: boolean} | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);

  const faqData = [
    {
      category: 'Financeiro',
      questions: [
        { q: 'Como acesso minha fatura ou boleto?', a: 'Você pode acessar sua fatura atual clicando no botão "Pagar Mensalidade" aqui no portal. Ele te levará diretamente para o ambiente seguro do Asaas, onde você pode gerar o código PIX ou pagar via Cartão de Crédito.' },
        { q: 'Quais são as formas de pagamento aceitas?', a: 'Aceitamos PIX (compensação imediata), Cartão de Crédito (recorrente) e Cartão de Débito.' },
        { q: 'Já paguei, mas o status ainda aparece como "Pendente". O que fazer?', a: 'Pagamentos via PIX são atualizados em poucos minutos. No Cartão de Crédito ou Débito, o processamento pode levar até 24h. Se após esse prazo o status não mudar, envie uma mensagem pelo formulário de suporte abaixo.' }
      ]
    },
    {
      category: 'Meu Site',
      questions: [
        { q: 'Como solicito uma alteração no meu site?', a: 'Use o formulário "Solicitar Suporte ou Alteração" no final desta página. Descreva o que precisa ser mudado e nossa equipe receberá sua solicitação imediatamente.' },
        { q: 'Quanto tempo demora para meu site ficar pronto?', a: 'A entrega do site é agendada individualmente. Trabalhamos com uma estimativa de entrega em 3 dias úteis após o recebimento de todo o conteúdo, mas este prazo é uma previsão e pode variar conforme a demanda e complexidade.' },
        { q: 'Posso mudar meu plano?', a: 'Sim! Você pode migrar entre os planos Ecossistema Essencial e Profissional a qualquer momento. Para migrar, basta entrar em contato com nosso suporte.' },
        { q: 'O que preciso para mudar para o plano Profissional?', a: 'Para o plano Profissional, é necessário adquirir um domínio próprio (ex: seunome.com.br). Recomendamos a compra através do site oficial registro.br (https://registro.br/). Após a compra, basta nos enviar os dados de acesso e nós cuidaremos de toda a migração e configuração para você.' }
      ]
    },
    {
      category: 'Programa de Indicações',
      questions: [
        { q: 'Como funciona o bônus de indicação?', a: 'Para cada amigo que fechar um projeto conosco através do seu link, você ganha R$ 100,00 de desconto na sua próxima mensalidade (se escolher o modelo de desconto) ou uma comissão em dinheiro (se escolher o modelo de comissão). O bônus é validado assim que o seu indicado realizar o primeiro pagamento.' },
        { q: 'O que são os níveis Bronze, Prata e Ouro?', a: 'São níveis de reconhecimento! Bronze é o nível inicial. Prata (3+ indicações) te dá o selo de Parceiro Oficial. Ouro (6+ indicações) te torna um Embaixador com suporte prioritário.' },
        { q: 'Existe um limite para os bônus?', a: 'Não há limite para o número de indicações que você pode fazer! Quanto mais você indicar, mais bônus ou descontos você acumula. O desconto mensal é limitado a 50% do valor da sua mensalidade, mas o saldo excedente pode ser usado em faturas futuras ou convertido em comissão.' }
      ]
    },
    {
      category: 'Suporte Geral',
      questions: [
        { q: 'Qual o horário de atendimento?', a: 'Nosso suporte funciona de segunda a sexta, das 09h às 18h. Chamados abertos fora desse horário ou em feriados serão respondidos no próximo dia útil.' }
      ]
    }
  ];

  const handleNPSSubmit = async () => {
    if (npsScore === null || !orgId || !clientId) return;
    
    setIsSubmittingNPS(true);
    try {
      await updateDoc(doc(db, 'organizations', orgId, 'clients', clientId), {
        npsScore,
        npsComment,
        npsSubmittedAt: serverTimestamp()
      });
      setNpsSubmitted(true);
      toast.success('Obrigado pelo seu feedback! Isso nos ajuda a crescer.');
    } catch (err) {
      console.error("Error submitting NPS:", err);
      toast.error('Erro ao enviar feedback.');
    } finally {
      setIsSubmittingNPS(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestMessage.trim() || !orgId || !clientId) return;

    setIsSubmittingRequest(true);
    try {
      await addDoc(collection(db, 'organizations', orgId, 'supportRequests'), {
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
    if (!orgId || !clientId) {
      setError("Link inválido.");
      setLoading(false);
      return;
    }

    // Fetch Support Requests History
    const requestsRef = collection(db, 'organizations', orgId, 'supportRequests');
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

      // Check for completed requests without CSAT
      const pendingCsat = loadedRequests.find(r => r.status === 'concluido' && !r.csatScore);
      if (pendingCsat) {
        setPendingCsatRequestId(pendingCsat.id);
        setShowCsatModal(true);
      }
    });

    // Fetch Global Announcement
    const globalRef = doc(db, 'organizations', orgId, 'settings', 'global');
    const unsubscribeGlobal = onSnapshot(globalRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.announcement && data.announcement.isActive) {
          setGlobalAnnouncement(data.announcement);
        } else {
          setGlobalAnnouncement(null);
        }
      }
    });

    // Fetch Services
    const servicesRef = collection(db, 'organizations', orgId, 'services');
    const unsubscribeServices = onSnapshot(servicesRef, (snapshot) => {
      const loadedServices: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive) {
          loadedServices.push({ id: doc.id, ...data });
        }
      });
      setServices(loadedServices.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
    });

    // Fetch Offers
    const offersRef = collection(db, 'organizations', orgId, 'offers');
    const unsubscribeOffers = onSnapshot(offersRef, (snapshot) => {
      const loadedOffers: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.active) {
          loadedOffers.push({ id: doc.id, ...data });
        }
      });
      setOffers(loadedOffers);
    });

    // Fetch Client Data
    const docRef = doc(db, 'organizations', orgId, 'clients', clientId);
    const unsubscribeClient = onSnapshot(docRef, async (docSnap) => {
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
                clientData.invoiceUrl = targetPayment.invoiceUrl || targetPayment.bankSlipUrl || clientData.invoiceUrl;
                
                clientData.currentDueDate = (status === 'PENDING' || status === 'OVERDUE') ? targetPayment.dueDate : null;
                clientData.nextDueDate = subscription?.nextDueDate || clientData.nextDueDate;
              }
            }
          } catch (e) {
            console.error("Error fetching real-time Asaas data:", e);
          }
        }
        
        setClient(clientData);
        setLoading(false);
      } else {
        setError("Cliente não encontrado.");
        setLoading(false);
      }
    }, (err) => {
      console.error("Error fetching client:", err);
      setError("Não foi possível carregar os dados.");
      setLoading(false);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeClient();
      unsubscribeGlobal();
      unsubscribeServices();
      unsubscribeOffers();
    };
  }, [orgId, clientId]);

  const handleUpdateRewardType = async (type: 'commission' | 'discount') => {
    if (!orgId || !clientId || !client) return;
    try {
      let discount = 0;

      const clientsRef = collection(db, 'organizations', orgId, 'clients');
      const q = query(clientsRef, where('referredBy', '==', clientId));
      const querySnapshot = await getDocs(q);
      const referredClients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      if (type === 'discount') {
        discount = calculateDiscount(client, referredClients);
      }

      // Update Asaas subscription if applicable
      if (client.asaasSubscriptionId) {
        const monthlyValue = getPlanPrice(client.plan, client.billingCycle, client.customMonthlyPrice, client.customSetupPrice) - discount;

        await fetch('/api/asaas/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionId: client.asaasSubscriptionId,
            updatePendingPayments: true,
            value: monthlyValue
          })
        });
      }

      await updateDoc(doc(db, 'organizations', orgId, 'clients', clientId), {
        referralRewardType: type,
        currentDiscount: discount
      });
      toast.success('Modelo de recompensa atualizado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar modelo.');
    }
  };

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
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6 md:p-12 font-sans selection:bg-primary-500/30">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]"></div>
      </div>

        {globalAnnouncement && (
        <div className={`mb-8 p-4 rounded-2xl border flex items-start gap-4 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500 ${
          globalAnnouncement.type === 'info' ? 'bg-blue-500/10 border-blue-500/30 text-blue-100' :
          globalAnnouncement.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-100' :
          globalAnnouncement.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' :
          'bg-primary-500/10 border-primary-500/30 text-primary-100'
        }`}>
          <div className={`p-2 rounded-xl shrink-0 ${
            globalAnnouncement.type === 'info' ? 'bg-blue-500/20 text-blue-400' :
            globalAnnouncement.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
            globalAnnouncement.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
            'bg-primary-500/20 text-primary-400'
          }`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">{globalAnnouncement.title}</h3>
            <p className="text-sm opacity-90 leading-relaxed whitespace-pre-wrap">{globalAnnouncement.message}</p>
          </div>
        </div>
      )}

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

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10 md:mb-16">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary-500/20 transform hover:scale-105 transition-transform duration-300">
              <Globe className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">{client.name.split(' ')[0]}</span>!</h1>
          <p className="text-gray-400 text-sm md:text-base">Bem-vindo ao seu Portal do Cliente exclusivo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* Status Card */}
          <div className="group bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl hover:border-white/20 transition-all duration-300">
            <h2 className="text-base md:text-lg font-semibold mb-6 flex items-center gap-2 text-gray-200">
              <div className="p-1.5 bg-primary-500/10 rounded-lg">
                <Globe className="w-4 h-4 md:w-5 md:h-5 text-primary-400" />
              </div>
              Status do Projeto
            </h2>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(client.status)} mb-6 shadow-sm`}>
              {getStatusIcon(client.status)}
              <span className="font-semibold text-sm">{client.status}</span>
            </div>

            {client.deliveryDate && client.status !== 'Ativo' && client.status !== 'Cancelado' && (
              <div className="mt-2 mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Previsão de Entrega
                </p>
                <p className="text-xl font-black text-white">
                  {new Date(client.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {client.siteLink && client.status === 'Ativo' && (
              <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Link do seu site:</p>
                <a 
                  href={client.siteLink.startsWith('http') ? client.siteLink : `https://${client.siteLink}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between group/link"
                >
                  <span className="text-primary-400 font-medium truncate mr-2">{client.siteLink}</span>
                  <div className="p-2 bg-primary-500/10 rounded-lg group-hover/link:bg-primary-500/20 transition-colors">
                    <ExternalLink className="w-4 h-4 text-primary-400" />
                  </div>
                </a>
              </div>
            )}
          </div>

          {/* Finance Card */}
          <div className="group bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden hover:border-white/20 transition-all duration-300">
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-primary-500/10 rounded-full blur-3xl group-hover:bg-primary-500/20 transition-colors duration-500"></div>
            
            <h2 className="text-base md:text-lg font-semibold mb-6 flex items-center gap-2 text-gray-200">
              <div className="p-1.5 bg-primary-500/10 rounded-lg">
                <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-primary-400" />
              </div>
              Fatura Atual
            </h2>

            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Plano contratado</p>
              <p className="text-xl font-bold text-white">{client.plan}</p>
            </div>

            {client.currentDueDate && (
              <div className="mb-4 p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl">
                <p className="text-xs text-primary-400 font-bold uppercase tracking-wider mb-1">Fatura Pendente</p>
                <p className="text-xl font-black text-white">
                  Vencimento: {new Date(client.currentDueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {client.nextDueDate && (
              <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Próxima Renovação</p>
                <p className="text-lg font-bold text-white/90">
                  {new Date(client.nextDueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {client.invoiceUrl && client.paymentStatus !== 'RECEIVED' ? (
              <a 
                href={client.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-full py-4 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                Pagar via PIX ou Cartão
              </a>
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-sm text-gray-500 font-medium">Nenhuma fatura em aberto no momento.</p>
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

        {/* Project Stages - Only show if not all are completed */}
        {client.stages && client.stages.length > 0 && !client.stages.every((s: any) => s.completed) && (
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
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${stage.completed ? 'bg-white/5 text-gray-300 hover:bg-primary-500/20' : 'bg-white/10 text-white hover:bg-primary-500/30'}`}
                        >
                          <ExternalLink size={16} />
                          Ver Material
                        </a>
                      )}
                      
                      {isCurrent && (
                        <button
                          onClick={async () => {
                            if (!orgId || !clientId) return;
                            try {
                              const newStages = [...client.stages];
                              newStages[index].completed = true;
                              newStages[index].approvedAt = Date.now();
                              await updateDoc(doc(db, 'organizations', orgId, 'clients', clientId), { stages: newStages });
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

        {/* NPS Survey - Automatic when project is finished */}
        {client.stages && client.stages.length > 0 && client.stages.every((s: any) => s.completed) && !client.npsScore && !npsSubmitted && (
          <div className="mt-6 bg-gradient-to-br from-primary-500/20 to-primary-600/5 backdrop-blur-xl border border-primary-500/30 p-8 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Projeto Concluído! 🥳</h2>
                <p className="text-gray-400 text-sm">Como foi sua experiência conosco?</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6 leading-relaxed">
              Ficamos muito felizes em entregar seu projeto! De 0 a 10, qual a probabilidade de você nos recomendar a um amigo ou colega?
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => setNpsScore(score)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border font-bold transition-all flex items-center justify-center ${
                    npsScore === score 
                      ? 'bg-primary-500 border-primary-500 text-white scale-110 shadow-lg shadow-primary-500/30' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-primary-500/50 hover:text-primary-400'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>

            {npsScore !== null && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-400 mb-2">O que mais você gostaria de nos dizer? (Opcional)</label>
                <textarea 
                  value={npsComment}
                  onChange={(e) => setNpsComment(e.target.value)}
                  placeholder="Seu feedback nos ajuda a melhorar..."
                  className="w-full min-h-[100px] px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500 custom-scrollbar resize-none mb-4"
                ></textarea>
                
                <button
                  onClick={handleNPSSubmit}
                  disabled={isSubmittingNPS}
                  className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isSubmittingNPS ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar Avaliação
                      <CheckCircle size={18} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Referral Program - Indique e Ganhe */}
        <div className="mt-6 bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 backdrop-blur-xl border border-emerald-500/30 p-8 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Indique e Ganhe! 💸</h2>
              <p className="text-gray-400 text-sm">Escolha como quer ser recompensado</p>
            </div>
          </div>

          <p className="text-gray-300 mb-6 leading-relaxed">
            Indique um amigo para criar o site com a gente. Você pode escolher: ou ganhar comissão quando indicar alguém, ou receber desconto mensal enquanto o cliente estiver ativo.
          </p>

          <div className="bg-black/20 border border-white/5 rounded-2xl p-4 mb-6">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4">Escolha seu Modelo de Recompensa</h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleUpdateRewardType('commission')}
                className={`flex-1 p-4 rounded-xl border text-left transition-all relative overflow-hidden ${client?.referralRewardType === 'commission' ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
              >
                {client?.referralRewardType === 'commission' && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                    ATIVO
                  </div>
                )}
                <div className={`font-bold mb-1 ${client?.referralRewardType === 'commission' ? 'text-emerald-400' : 'text-gray-300'}`}>Comissão (Dinheiro)</div>
                <div className="text-xs opacity-80 mb-3">Pago após o cliente pagar. Pagamento único. Sem limite de indicações.</div>
                <ul className="text-xs space-y-1.5 opacity-90">
                  <li className="flex justify-between"><span>Plano Ecossistema Essencial:</span> <span className="font-bold text-emerald-400">R$ 100</span></li>
                  <li className="flex justify-between"><span>Plano Profissional:</span> <span className="font-bold text-emerald-400">R$ 250</span></li>
                </ul>
              </button>
              <button
                onClick={() => {
                  if (client?.billingCycle === 'YEARLY' || client?.isCombo) {
                    toast.error('O modelo de desconto mensal não está disponível para planos anuais ou combos.');
                    return;
                  }
                  handleUpdateRewardType('discount');
                }}
                disabled={client?.billingCycle === 'YEARLY' || client?.isCombo}
                className={`flex-1 p-4 rounded-xl border text-left transition-all relative overflow-hidden ${(client?.billingCycle === 'YEARLY' || client?.isCombo) ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/5' : (client?.referralRewardType === 'discount' || !client?.referralRewardType ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10')}`}
              >
                {(client?.referralRewardType === 'discount' || !client?.referralRewardType) && !(client?.billingCycle === 'YEARLY' || client?.isCombo) && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                    ATIVO
                  </div>
                )}
                <div className={`font-bold mb-1 ${client?.referralRewardType === 'discount' || !client?.referralRewardType ? 'text-emerald-400' : 'text-gray-300'}`}>Desconto Mensal</div>
                <div className="text-xs opacity-80 mb-3">
                  {client?.billingCycle === 'YEARLY' || client?.isCombo 
                    ? 'Indisponível para planos anuais.' 
                    : 'R$ 100 de desconto por indicação. Válido enquanto o cliente estiver ativo.'}
                </div>
                <ul className="text-xs space-y-1.5 opacity-90">
                  <li className="flex items-start gap-1"><CheckCircle size={12} className="mt-0.5 shrink-0 text-emerald-400" /> <span>Limitado a 50% da sua mensalidade</span></li>
                  <li className="flex items-start gap-1"><CheckCircle size={12} className="mt-0.5 shrink-0 text-emerald-400" /> <span>O valor nunca será inferior ao limite mínimo</span></li>
                </ul>
              </button>
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Seu Link de Indicação</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/5 px-4 py-3 rounded-xl text-emerald-400 font-mono text-sm truncate">
                {`${window.location.origin}/onboarding/${orgId}?ref=${clientId}`}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/onboarding/${orgId}?ref=${clientId}`);
                  toast.success('Link de indicação copiado!');
                }}
                className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                <Copy size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
              <p className="text-xs text-gray-500 uppercase mb-1">Indicações (Total)</p>
              <p className="text-2xl font-bold text-white">{client?.referralCount || 0}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
              <p className="text-xs text-gray-500 uppercase mb-1">
                {client?.referralRewardType === 'commission' ? 'Bônus Acumulado' : 'Desconto Mensal Atual'}
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                R$ {client?.referralRewardType === 'commission' ? (client?.referralBalance || 0) : (client?.currentDiscount || 0)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Planos Disponíveis */}
        <div className="mt-8 bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] -z-10 group-hover:bg-primary-500/10 transition-colors duration-700"></div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
                <ShoppingCart className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary-400">Upgrade de Experiência</span>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Planos e Upgrades</h2>
              <p className="text-gray-400 text-sm mt-2 max-w-md">Conheça nossas opções para escalar o seu negócio digital com tecnologia de ponta.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {offers.map((offer) => {
              const isCurrentPlan = client.offerId === offer.id || client.plan === offer.name;
              return (
                <div 
                  key={offer.id}
                  className={`p-8 rounded-[2rem] border flex flex-col h-full transition-all duration-500 relative group/card ${
                    isCurrentPlan 
                      ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/50 shadow-xl shadow-emerald-500/10' 
                      : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{offer.name}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {offer.type === 'SUBSCRIPTION' ? 'Plano de assinatura recorrente.' : 'Pagamento único para o seu projeto.'}
                    </p>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-3">
                      {offer.setupPrice > 0 && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Setup</span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-white">R$ {offer.setupPrice.toLocaleString('pt-BR')}</span>
                            </div>
                          </div>
                          <div className="h-px bg-white/5 w-full"></div>
                        </>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                          {offer.type === 'SUBSCRIPTION' ? 'Mensal' : 'Total'}
                        </span>
                        <div className="text-right">
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="text-xl font-bold text-white">R$ {(offer.price || 0).toLocaleString('pt-BR')}</span>
                            {offer.type === 'SUBSCRIPTION' && <span className="text-gray-500 text-[10px]">/mês</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {offer.description?.split('\n').map((feature: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-gray-300 group-hover/card:text-white transition-colors">
                        <div className="p-0.5 rounded-full bg-emerald-500/20 mt-0.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        </div>
                        {feature}
                      </li>
                    )) || (
                      <li className="flex items-start gap-3 text-xs text-gray-300 italic opacity-50">
                        Consulte detalhes com nosso suporte.
                      </li>
                    )}
                  </ul>

                  {isCurrentPlan ? (
                    <div className="w-full py-4 text-center rounded-2xl bg-emerald-500/10 text-emerald-400 font-bold text-sm border border-emerald-500/20 backdrop-blur-sm">
                      Seu Plano Ativo
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        window.open(`https://wa.me/5511952924208?text=Olá! Gostaria de mais informações sobre o upgrade para o plano: ${offer.name}`, '_blank');
                      }}
                      className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10 hover:border-white/20 active:scale-[0.98]"
                    >
                      Solicitar Upgrade
                    </button>
                  )}
                </div>
              );
            })}

            {/* Personalizado (Show if active or if custom prices are set) */}
            {(client.plan === 'Personalizado' || client.customMonthlyPrice !== undefined || client.customSetupPrice !== undefined) && (
              <div className={`p-8 rounded-[2rem] border flex flex-col h-full transition-all duration-500 relative group/card ${client.plan === 'Personalizado' ? 'bg-primary-500/10 border-primary-500/30 ring-1 ring-primary-500/50 shadow-xl shadow-primary-500/10' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Plano sob consulta</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">Plano com condições especiais negociadas diretamente com nossa equipe. Ideal para agências ou projetos complexos.</p>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Setup</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-white">Sob Consulta</span>
                      </div>
                    </div>
                    <div className="h-px bg-white/5 w-full"></div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Mensal</span>
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-xl font-bold text-white">Sob Consulta</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-px bg-white/5 w-full"></div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Anual</span>
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-xl font-bold text-white">Sob Consulta</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-start gap-3 text-xs text-gray-300">
                    <div className="p-0.5 rounded-full bg-emerald-500/20 mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </div>
                    Recursos personalizados conforme contrato
                  </li>
                  <li className="flex items-start gap-3 text-xs text-gray-300">
                    <div className="p-0.5 rounded-full bg-emerald-500/20 mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </div>
                    Suporte prioritário dedicado
                  </li>
                </ul>

                {client.plan === 'Personalizado' ? (
                  <div className="w-full py-4 text-center rounded-2xl bg-emerald-500/10 text-emerald-400 font-bold text-sm border border-emerald-500/20 backdrop-blur-sm">
                    Seu Plano Ativo
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      window.open(`https://wa.me/5511952924208?text=Olá! Gostaria de saber mais sobre o Plano sob consulta e como ele funciona.`, '_blank');
                    }}
                    className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10"
                  >
                    Entrar em Contato
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Support Request Form */}
        <div className="mt-8 bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group" id="support-form">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary-500/5 blur-[100px] -z-10 group-hover:bg-primary-500/10 transition-colors duration-700"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
                <MessageSquare className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary-400">Canal Direto</span>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Solicitar Suporte</h2>
              <p className="text-gray-400 text-sm mt-2 max-w-md">Precisa de alguma mudança no site ou ajuda com algo? Nossa equipe está pronta para ajudar.</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmitRequest} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Categoria do Chamado</label>
                <div className="relative group/select">
                  <select 
                    value={requestCategory}
                    onChange={(e) => setRequestCategory(e.target.value)}
                    className="w-full px-5 py-4 bg-black/40 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-primary-500/50 outline-none transition-all appearance-none cursor-pointer hover:border-white/20"
                  >
                    <option value="Suporte Técnico" className="bg-[#030712] text-white">Suporte Técnico</option>
                    <option value="Dúvida Financeira" className="bg-[#030712] text-white">Dúvida Financeira</option>
                    <option value="Solicitação de Alteração" className="bg-[#030712] text-white">Solicitação de Alteração</option>
                    <option value="Outros" className="bg-[#030712] text-white">Outros</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover/select:text-white transition-colors">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>
              
              <div className="hidden md:flex items-center justify-center p-6 rounded-2xl bg-primary-500/5 border border-primary-500/10">
                <div className="text-center">
                  <p className="text-[10px] text-primary-400 font-bold uppercase tracking-wider mb-1">Tempo Médio de Resposta</p>
                  <p className="text-xl font-bold text-white">Até 4 horas úteis</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Descrição do Pedido</label>
              <textarea 
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Descreva o que você precisa em detalhes para que possamos ser mais assertivos..."
                className="w-full min-h-[160px] px-5 py-4 bg-black/40 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder-gray-600 custom-scrollbar resize-none hover:border-white/20"
                required
              ></textarea>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-gray-500 text-[10px] font-medium">
                <AlertCircle size={14} className="text-primary-500" />
                <span>Anexos podem ser enviados após a abertura do chamado via WhatsApp.</span>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmittingRequest || !requestMessage.trim()}
                className="w-full sm:w-auto flex items-center justify-center space-x-3 bg-gradient-to-r from-primary-600 to-primary-400 hover:from-primary-500 hover:to-primary-300 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-2xl transition-all font-bold shadow-xl shadow-primary-500/20 hover:shadow-primary-500/40 active:scale-[0.98]"
              >
                {isSubmittingRequest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Solicitação</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Support Request History */}
        {clientRequests.length > 0 && (
          <div id="historico-chamados" className="mt-8 bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] -z-10 group-hover:bg-primary-500/10 transition-colors duration-700"></div>
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
                  <Clock className="w-3.5 h-3.5 text-primary-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary-400">Linha do Tempo</span>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Histórico de Chamados</h2>
              </div>
            </div>
            
            <div className="space-y-4">
              {clientRequests.map((req) => (
                <div key={req.id} className={`group/item border transition-all duration-300 rounded-[1.5rem] overflow-hidden ${expandedRequest === req.id ? 'bg-white/[0.06] border-white/20 shadow-xl' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                  <div 
                    className="p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    onClick={() => setExpandedRequest(expandedRequest === req.id ? null : req.id)}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        {getRequestStatusBadge(req.status)}
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{req.category || 'Suporte'}</span>
                      </div>
                      <p className="text-sm text-white font-medium line-clamp-1 group-hover/item:text-primary-400 transition-colors">
                        {req.message}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Aberto em</p>
                        <p className="text-xs text-gray-300 font-mono">
                          {req.createdAt?.toDate ? new Date(req.createdAt.toDate()).toLocaleDateString('pt-BR') : 'Recente'}
                        </p>
                      </div>
                      <div className={`p-2 rounded-full transition-all duration-300 ${expandedRequest === req.id ? 'bg-primary-500 text-white rotate-180' : 'bg-white/5 text-gray-500 group-hover/item:bg-white/10 group-hover/item:text-white'}`}>
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>
                  
                  {expandedRequest === req.id && (
                    <div className="px-6 pb-6 pt-2 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="h-px bg-white/10 w-full"></div>
                      
                      <div className="space-y-2">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Sua Solicitação</p>
                        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {req.message}
                        </div>
                      </div>

                      {req.reply && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
                            <p className="text-[10px] text-primary-400 uppercase font-bold tracking-widest">Resposta da Equipe</p>
                          </div>
                          <div className="p-5 rounded-2xl bg-primary-500/5 border border-primary-500/10 text-sm text-white leading-relaxed whitespace-pre-wrap relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500/30 rounded-full"></div>
                            {req.reply}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-[9px] text-gray-500 uppercase font-bold">ID do Chamado</p>
                            <p className="text-[10px] text-gray-400 font-mono">#{req.id.slice(-6).toUpperCase()}</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/5511952924208?text=Olá! Gostaria de falar sobre o chamado #${req.id.slice(-6).toUpperCase()}`, '_blank');
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all border border-emerald-500/20"
                        >
                          <MessageSquare size={14} />
                          Falar no WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Support Footer */}
        <div className="mt-16 pb-12 text-center">
          <div className="inline-flex flex-col items-center p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <div className="p-3 rounded-2xl bg-emerald-500/10 mb-4">
              <MessageSquare className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-gray-400 text-sm mb-4 max-w-xs">Prefere um atendimento mais direto? Nossa equipe está disponível no WhatsApp.</p>
            <a 
              href="https://wa.me/5511952924208"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl transition-all font-bold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <span>Falar com o Suporte</span>
              <ExternalLink size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* Help Widget */}
      <div className="fixed bottom-6 right-6 z-[100]">
        {isHelpOpen ? (
          <div className="bg-[#0a0a0a] border border-white/10 w-[calc(100vw-3rem)] sm:w-96 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[600px] overflow-hidden animate-in slide-in-from-bottom-4 duration-500 ring-1 ring-white/5">
            <div className="p-6 sm:p-8 bg-gradient-to-br from-primary-600 to-primary-400 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xl tracking-tight">Central de Ajuda</h3>
                  <p className="text-xs text-primary-100/80 mt-1">Como podemos te ajudar hoje?</p>
                </div>
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors backdrop-blur-md border border-white/10"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" size={18} />
                <input 
                  type="text"
                  placeholder="Pesquisar dúvidas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder-gray-600"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-6 bg-white/[0.01]">
              {faqData.map((category) => {
                const filteredQuestions = category.questions.filter(q => 
                  q.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  q.a.toLowerCase().includes(searchQuery.toLowerCase())
                );
                
                if (filteredQuestions.length === 0) return null;
                
                return (
                  <div key={category.category} className="space-y-3">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">
                      {category.category}
                    </h4>
                    <div className="space-y-2">
                      {filteredQuestions.map((item, idx) => (
                        <div key={idx} className={`rounded-2xl border transition-all duration-300 ${activeFaq === `${category.category}-${idx}` ? 'bg-white/[0.06] border-white/10 shadow-lg' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                          <button 
                            onClick={() => setActiveFaq(activeFaq === `${category.category}-${idx}` ? null : `${category.category}-${idx}`)}
                            className="w-full px-5 py-4 text-left transition-colors flex items-center justify-between gap-4"
                          >
                            <span className={`text-sm font-medium transition-colors ${activeFaq === `${category.category}-${idx}` ? 'text-primary-400' : 'text-gray-300'}`}>{item.q}</span>
                            <div className={`p-1 rounded-lg transition-all duration-300 ${activeFaq === `${category.category}-${idx}` ? 'bg-primary-500/20 text-primary-400 rotate-180' : 'bg-white/5 text-gray-500'}`}>
                              <ChevronDown size={14} />
                            </div>
                          </button>
                          {activeFaq === `${category.category}-${idx}` && (
                            <div className="px-5 pb-5 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="h-px bg-white/5 w-full mb-4"></div>
                              <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{item.a}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {searchQuery && faqData.every(c => c.questions.filter(q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) || q.a.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-gray-600" size={24} />
                  </div>
                  <p className="text-sm text-gray-500">Nenhuma dúvida encontrada.</p>
                </div>
              )}
            </div>
            
            <div className="p-6 sm:p-8 bg-white/[0.02] border-t border-white/5">
              <a 
                href="https://wa.me/5511952924208"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-bold transition-all border border-emerald-500/20"
              >
                <MessageSquare size={18} />
                Ainda com dúvidas? WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsHelpOpen(true)}
            className="group relative p-5 bg-gradient-to-br from-primary-600 to-primary-400 text-white rounded-[2rem] shadow-2xl shadow-primary-500/40 hover:shadow-primary-500/60 transition-all hover:scale-110 active:scale-95"
          >
            <div className="absolute inset-0 bg-white/20 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            <HelpCircle size={28} className="relative z-10" />
            <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 pointer-events-none border border-white/10 shadow-2xl">
              Como podemos ajudar?
            </span>
          </button>
        )}
      </div>

      {showCsatModal && pendingCsatRequestId && orgId && (
        <SupportSatisfactionModal 
          requestId={pendingCsatRequestId}
          orgId={orgId}
          onClose={() => setShowCsatModal(false)}
        />
      )}

      <Toaster position="top-center" richColors />
    </div>
  );
}
