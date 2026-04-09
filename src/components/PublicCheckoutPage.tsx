import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle, Globe, Building2, Mail, Phone, User as UserIcon, FileText, Check, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Offer } from '../types';

export default function PublicCheckoutPage() {
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [ownerSettings, setOwnerSettings] = useState<any>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    cpfCnpj: '',
    offerId: '',
    plan: '',
    billingCycle: 'MONTHLY' as 'MONTHLY' | 'YEARLY'
  });
  
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');
    
    const fetchData = async () => {
      if (!userId) return;
      try {
        // 1. Fetch Owner Settings
        const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
          setOwnerSettings(docSnap.data());
        }

        // 2. Fetch Active Offers for Checkout
        const offersRef = collection(db, 'users', userId, 'offers');
        const q = query(
          offersRef, 
          where('active', '==', true),
          where('displayContext', 'in', ['CHECKOUT', 'BOTH'])
        );
        
        const offersSnap = await getDocs(q);
        const loadedOffers: Offer[] = [];
        offersSnap.forEach(d => {
          loadedOffers.push({ id: d.id, ...d.data() } as Offer);
        });
        
        // Sort by order
        const sorted = loadedOffers.sort((a, b) => (a.order || 0) - (b.order || 0) || a.price - b.price).slice(0, 3);
        setOffers(sorted);
        
        // Default selection
        if (sorted.length > 0) {
          setClientData(prev => ({ 
            ...prev, 
            offerId: sorted[0].id, 
            plan: sorted[0].name 
          }));
        }

      } catch (error) {
        console.error("Error fetching checkout data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const validateStep = () => {
    if (step === 1) {
      if (!clientData.name || !clientData.email || !clientData.whatsapp) {
        toast.error('Preencha os campos obrigatórios.');
        return false;
      }
    }
    if (step === 2 && ownerSettings?.onboardingQuestions) {
      for (const q of ownerSettings.onboardingQuestions) {
        if (q.required && !answers[q.id]) {
          toast.error(`A pergunta "${q.text}" é obrigatória.`);
          return false;
        }
      }
    }
    if (step === 3) {
      if (!clientData.offerId) {
        toast.error('Por favor, selecione um plano para continuar.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/public_checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          clientData,
          briefingAnswers: answers
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao processar checkout');

      toast.success('Cadastro realizado! Redirecionando para o pagamento...');
      setTimeout(() => {
        window.location.href = result.checkoutUrl;
      }, 2000);
    } catch (error: any) {
      console.error("Checkout Error:", error);
      toast.error(error.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-100 relative overflow-hidden">
      <Toaster theme="dark" position="top-right" />
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <img src="https://i.imgur.com/2H9UPAW.png" alt="Hub Simples Logo" className="h-48 w-auto object-contain drop-shadow-2xl" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            {ownerSettings?.checkoutTitle || 'Contratação de Projeto'}
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            {ownerSettings?.checkoutDescription || 'Preencha os dados abaixo para iniciar seu projeto e realizar a assinatura.'}
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                {step > s ? <Check size={18} /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-px ${step > s ? 'bg-orange-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl relative">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-orange-500" />
                Seus Dados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome Completo / Empresa *</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={clientData.name}
                      onChange={(e) => setClientData({...clientData, name: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      placeholder="Nome ou Razão Social"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">E-mail *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={clientData.email}
                      onChange={(e) => setClientData({...clientData, email: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      placeholder="contato@exemplo.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={clientData.whatsapp}
                      onChange={(e) => setClientData({...clientData, whatsapp: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                Briefing do Projeto
              </h2>
              <div className="space-y-6">
                {(ownerSettings?.onboardingQuestions || []).map((q: any) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {q.text} {q.required && <span className="text-orange-500">*</span>}
                    </label>
                    {q.type === 'textarea' ? (
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all h-32 resize-none"
                      />
                    ) : q.type === 'select' ? (
                      <select
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all appearance-none"
                      >
                        <option value="">Selecione...</option>
                        {q.options?.split(',').map((opt: string) => <option key={opt} value={opt.trim()}>{opt.trim()}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-orange-500" />
                Escolha sua Solução
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {offers.length > 0 ? (
                  offers.map((offer) => (
                    <button
                      key={offer.id}
                      onClick={() => setClientData({...clientData, offerId: offer.id, plan: offer.name })}
                      className={`p-6 rounded-2xl border transition-all text-left flex flex-col relative ${clientData.offerId === offer.id ? 'bg-orange-500/10 border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-black/40 border-white/10 hover:border-white/20'}`}
                    >
                      <p className="font-bold text-xl mb-2">{offer.name}</p>
                      <p className="text-xs text-gray-400 mb-4 flex-1">
                        {offer.type === 'SUBSCRIPTION' ? 'Assinatura Mensal' : 'Pagamento Único'}
                      </p>
                      <div className="mt-4">
                        <span className="text-2xl font-bold text-white">R$ {offer.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        {offer.type === 'SUBSCRIPTION' && <span className="text-gray-500 text-sm"> /mês</span>}
                      </div>
                      {offer.setupPrice ? (
                        <p className="text-xs text-orange-400 mt-2">+ R$ {offer.setupPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de setup</p>
                      ) : null}
                      {clientData.offerId === offer.id && <div className="absolute top-4 right-4 text-orange-500"><Check size={20} /></div>}
                    </button>
                  ))
                ) : (
                  <div className="md:col-span-2 p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-gray-400">Nenhum plano disponível no momento.</p>
                  </div>
                )}
              </div>

              {offers.find(o => o.id === clientData.offerId)?.type === 'SUBSCRIPTION' && (
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 max-w-xs mx-auto">
                  <button
                    onClick={() => setClientData({...clientData, billingCycle: 'MONTHLY'})}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${clientData.billingCycle === 'MONTHLY' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}
                  >
                    Mensal
                  </button>
                  <button
                    onClick={() => setClientData({...clientData, billingCycle: 'YEARLY'})}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${clientData.billingCycle === 'YEARLY' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}
                  >
                    Anual (-15%)
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between mt-12 pt-8 border-t border-white/10">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                disabled={submitting}
              >
                <ArrowLeft size={18} />
                Voltar
              </button>
            ) : <div />}
            
            {step < 3 ? (
              <button
                onClick={() => {
                  if (validateStep()) setStep(step + 1);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Continuar
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || offers.length === 0}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processando...
                  </>
                ) : (
                  <>
                    Finalizar e Pagar
                    <CheckCircle size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-gray-500 text-sm">
          Pagamento processado de forma segura via Asaas Platinum.
        </p>
      </div>
    </div>
  );
}
