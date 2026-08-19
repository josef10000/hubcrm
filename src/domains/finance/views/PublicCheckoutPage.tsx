import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  CheckCircle, Mail, Phone, User as UserIcon, 
  FileText, Check, Loader2, ShieldCheck, Lock, CreditCard, QrCode, Sparkles, Star, Award, Copy
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Offer } from '@/types';
import InteractiveCreditCard from '../components/InteractiveCreditCard';

export default function PublicCheckoutPage() {
  const params = useParams<{ orgId?: string; id?: string }>();
  const effectiveOrgId = params.orgId || params.id;
  const [searchParams] = useSearchParams();
  const requestedOfferId = searchParams.get('offerId') || searchParams.get('product') || searchParams.get('productId');

  const [loading, setLoading] = useState(true);
  const [ownerSettings, setOwnerSettings] = useState<any>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Forma de Pagamento Transparente
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
  
  // Dados do Cliente Comprador
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    cpfCnpj: '',
    billingCycle: 'MONTHLY',
    offerId: ''
  });

  // Dados do Cartão de Crédito
  const [cardData, setCardData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    installments: 1
  });
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Resultados de Pagamento Transparente
  const [pixResult, setPixResult] = useState<{ encodedImage: string; payload: string } | null>(null);
  const [boletoResult, setBoletoResult] = useState<{ identificationField: string; bankSlipUrl: string } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  
  // Estado de Order Bumps selecionados
  const [selectedBumpIds, setSelectedBumpIds] = useState<string[]>([]);

  // Polling de pagamento
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    const fetchData = async () => {
      if (!effectiveOrgId) {
        setLoading(false);
        return;
      }
      try {
        // 1. Fetch Configurações da Organização
        const settingsRef = doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences');
        const docSnap = await getDoc(settingsRef);
        
        if (docSnap.exists()) {
          setOwnerSettings(docSnap.data());
        }

        // 2. Fetch Ofertas Ativas
        const offersRef = collection(db, 'organizations', effectiveOrgId, 'offers');
        const offersSnap = await getDocs(offersRef);
        const loadedOffers: Offer[] = [];

        offersSnap.forEach(d => {
          const data = d.data() as Offer;
          if (data.active !== false) {
            loadedOffers.push({ id: d.id, ...data });
          }
        });
        
        const sorted = loadedOffers.sort((a, b) => (a.order || 0) - (b.order || 0) || a.price - b.price);
        setOffers(sorted);
        
        let targetOffer: Offer | null = null;
        if (requestedOfferId) {
          targetOffer = sorted.find(o => o.id === requestedOfferId) || null;
          if (!targetOffer) {
            const singleOfferSnap = await getDoc(doc(db, 'organizations', effectiveOrgId, 'offers', requestedOfferId));
            if (singleOfferSnap.exists()) {
              targetOffer = { id: singleOfferSnap.id, ...singleOfferSnap.data() } as Offer;
            }
          }
        }

        if (!targetOffer && sorted.length > 0) {
          targetOffer = sorted[0];
        }

        if (targetOffer) {
          setSelectedOffer(targetOffer);
          setClientData(prev => ({ 
            ...prev, 
            offerId: targetOffer!.id, 
            plan: targetOffer!.name 
          }));
        }

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [effectiveOrgId, requestedOfferId]);

  // Polling para checar se o PIX foi pago
  useEffect(() => {
    if (!paymentId || paymentSuccess) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/info?orgId=${effectiveOrgId}&clientId=temp&paymentId=${paymentId}&token=temp`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'RECEIVED' || data.status === 'CONFIRMED') {
            setPaymentSuccess(true);
            toast.success('Pagamento confirmado com sucesso!');
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      } catch (e) {
        // Silencioso
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [paymentId, paymentSuccess, effectiveOrgId]);

  const activeOffer = offers.find(o => o.id === clientData.offerId) || selectedOffer || offers[0];
  const logoToDisplay = activeOffer?.logoUrl || ownerSettings?.logoUrl || "https://i.imgur.com/zCvL7xy.png";
  const customAccentColor = activeOffer?.accentColor || '#f97316';

  const toggleBump = (bumpId: string) => {
    setSelectedBumpIds(prev => 
      prev.includes(bumpId) ? prev.filter(id => id !== bumpId) : [...prev, bumpId]
    );
  };

  const calculateTotal = () => {
    if (!activeOffer) return 0;
    let total = activeOffer.price || 0;
    if (activeOffer.orderBumps && activeOffer.orderBumps.length > 0) {
      activeOffer.orderBumps.forEach(bump => {
        if (selectedBumpIds.includes(bump.id)) {
          total += bump.price || 0;
        }
      });
    }
    return total;
  };

  const totalPrice = calculateTotal();

  const handleCopyPix = () => {
    if (!pixResult?.payload) return;
    navigator.clipboard.writeText(pixResult.payload);
    setCopiedPix(true);
    toast.success('Chave PIX Copia e Cola copiada para a área de transferência!');
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleCopyBoleto = () => {
    if (!boletoResult?.identificationField) return;
    navigator.clipboard.writeText(boletoResult.identificationField);
    setCopiedBoleto(true);
    toast.success('Linha digitável do boleto copiada!');
    setTimeout(() => setCopiedBoleto(false), 3000);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveOrgId || !activeOffer) return;

    if (!clientData.name?.trim() || !clientData.email?.trim() || !clientData.whatsapp?.trim() || !clientData.cpfCnpj?.trim()) {
      toast.error('Por favor, preencha todos os dados pessoais obrigatórios.');
      return;
    }

    if (paymentMethod === 'CREDIT_CARD') {
      if (!cardData.number || !cardData.holderName || !cardData.expiryMonth || !cardData.expiryYear || !cardData.ccv) {
        toast.error('Preencha todos os dados do cartão de crédito.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/public_checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: effectiveOrgId,
          clientData: {
            ...clientData,
            offerId: activeOffer.id,
            name: clientData.name,
            email: clientData.email,
            whatsapp: clientData.whatsapp,
            cpfCnpj: clientData.cpfCnpj,
            billingCycle: clientData.billingCycle
          },
          selectedBumpIds,
          paymentMethod,
          creditCard: paymentMethod === 'CREDIT_CARD' ? {
            holderName: cardData.holderName,
            number: cardData.number.replace(/\D/g, ''),
            expiryMonth: cardData.expiryMonth,
            expiryYear: cardData.expiryYear,
            ccv: cardData.ccv
          } : undefined
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao processar pagamento');

      if (result.paymentId) setPaymentId(result.paymentId);

      if (paymentMethod === 'PIX' && result.pixData) {
        setPixResult(result.pixData);
        toast.success('QR Code e Chave PIX gerados com sucesso!');
      } else if (paymentMethod === 'CREDIT_CARD') {
        if (result.paymentStatus === 'CONFIRMED' || result.paymentStatus === 'RECEIVED') {
          setPaymentSuccess(true);
          toast.success('Pagamento no cartão aprovado com sucesso!');
        } else {
          toast.success('Transação enviada para processamento!');
        }
      } else if (paymentMethod === 'BOLETO' && result.boletoData) {
        setBoletoResult(result.boletoData);
        toast.success('Boleto bancário gerado!');
      } else if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }

    } catch (error: any) {
      console.error("Erro no pagamento:", error);
      toast.error(error.message || 'Falha ao processar o pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary-500" size={44} />
        <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Carregando Página de Pagamento...</span>
      </div>
    );
  }

  // TELA DE SUCESSO DO PAGAMENTO
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
        <div className="bg-[#0b0f19] border border-white/10 rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Pagamento Confirmado!</h2>
            <p className="text-gray-300 text-sm">
              Obrigado! Seu pagamento para <strong style={{ color: customAccentColor }}>{activeOffer?.name}</strong> foi identificado com sucesso.
            </p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left text-xs space-y-2 text-gray-300">
            <p><strong className="text-white">Cliente:</strong> {clientData.name}</p>
            <p><strong className="text-white">E-mail:</strong> {clientData.email}</p>
            <p><strong className="text-white">Produto:</strong> {activeOffer?.name}</p>
            <p><strong className="text-white">Valor:</strong> R$ {activeOffer?.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <p className="text-xs text-gray-500">Uma cópia do comprovante foi enviada para o seu e-mail.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080e1a] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-100 relative overflow-hidden">
      <Toaster theme="dark" position="top-right" />

      {/* Mesh Light Glows de Alta Definição */}
      <div 
        className="absolute top-[-15%] left-[-15%] w-[600px] h-[600px] rounded-full blur-[180px] pointer-events-none opacity-25 transition-all duration-700"
        style={{ backgroundColor: customAccentColor }}
      />
      <div 
        className="absolute bottom-[-15%] right-[-15%] w-[600px] h-[600px] rounded-full blur-[180px] pointer-events-none opacity-20 transition-all duration-700"
        style={{ backgroundColor: customAccentColor }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Cabeçalho da Empresa */}
        <div className="flex justify-center mb-8">
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl inline-flex items-center justify-center max-w-xs transition-all hover:scale-105">
            <img 
              src={logoToDisplay} 
              alt={activeOffer?.name || ownerSettings?.companyName || "Logo"} 
              className="h-16 w-auto object-contain max-h-20 filter drop-shadow-xl" 
              referrerPolicy="no-referrer" 
            />
          </div>
        </div>

        {/* LAYOUT DE 2 COLUNAS: RESUMO DA OFERTA (ESQUERDA) + CHECKOUT TRANSPARENTE (DIREITA) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUNA ESQUERDA: Detalhes do Produto, Benefícios & Prova Social */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0b0f19]/80 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              
              <div>
                <span 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 border shadow-sm"
                  style={{ backgroundColor: `${customAccentColor}20`, borderColor: `${customAccentColor}50`, color: customAccentColor }}
                >
                  <Sparkles size={12} />
                  {activeOffer?.type === 'SUBSCRIPTION' ? 'Plano de Assinatura' : 'Pagamento Único'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {activeOffer?.name || ownerSettings?.checkoutTitle || 'Abertura de Demanda'}
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm mt-2 leading-relaxed">
                  {activeOffer?.description || ownerSettings?.checkoutDescription || 'Preencha os dados ao lado para concluir o pagamento de forma rápida e segura.'}
                </p>
              </div>

              {/* Preço em Destaque (recalculado dinamicamente com os Order Bumps) */}
              <div 
                className="p-5 rounded-2xl border backdrop-blur-xl flex items-baseline justify-between transition-all"
                style={{ backgroundColor: `${customAccentColor}10`, borderColor: `${customAccentColor}30` }}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-0.5">
                    {selectedBumpIds.length > 0 ? 'Valor Total do Pedido (com Bumps)' : 'Valor do Investimento'}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-gray-400 font-medium">R$</span>
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {activeOffer?.type === 'SUBSCRIPTION' && <span className="text-xs text-gray-400 font-medium">/mês</span>}
                  </div>
                </div>
                {activeOffer?.setupPrice && activeOffer.setupPrice > 0 ? (
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-medium">Taxa de Setup</span>
                    <span className="text-sm font-bold text-gray-200">+ R$ {activeOffer.setupPrice.toLocaleString('pt-BR')}</span>
                  </div>
                ) : null}
              </div>

              {/* SEÇÃO DE ORDER BUMPS DESTACADOS DE 1 CLIQUE */}
              {activeOffer?.orderBumps && activeOffer.orderBumps.filter(b => b.active !== false).length > 0 && (
                <div className="space-y-3 pt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    Oferta Especial Complementar:
                  </h4>
                  <div className="space-y-2.5">
                    {activeOffer.orderBumps.filter(b => b.active !== false).map(bump => {
                      const isSelected = selectedBumpIds.includes(bump.id);
                      return (
                        <div
                          key={bump.id}
                          onClick={() => toggleBump(bump.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden select-none ${
                            isSelected 
                              ? 'bg-amber-500/15 border-amber-500/80 shadow-lg shadow-amber-500/10' 
                              : 'bg-black/40 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-1 w-4 h-4 rounded border-white/20 text-amber-500 focus:ring-0 cursor-pointer"
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                                  SIM! Quero adicionar {bump.title}
                                </span>
                                <span className="text-xs font-bold text-amber-400 shrink-0">
                                  + R$ {(bump.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-300 leading-relaxed">{bump.description}</p>
                              {bump.highlightTag && (
                                <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 mt-1">
                                  {bump.highlightTag}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Benefícios Inclusos */}
              {activeOffer?.benefits && activeOffer.benefits.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                    <ShieldCheck size={14} style={{ color: customAccentColor }} />
                    O que está incluso:
                  </h4>
                  <div className="space-y-2">
                    {activeOffer.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-200">
                        <div className="mt-0.5 rounded-full p-0.5 flex-shrink-0" style={{ backgroundColor: `${customAccentColor}30`, color: customAccentColor }}>
                          <Check size={12} />
                        </div>
                        <span className="leading-snug">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selo de Garantia */}
              {activeOffer?.guaranteeText && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl flex-shrink-0">
                    <Award size={20} />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">Garantia Assegurada</h5>
                    <p className="text-xs text-gray-200 mt-0.5">{activeOffer.guaranteeText}</p>
                  </div>
                </div>
              )}

              {/* Depoimento de Prova Social */}
              {activeOffer?.testimonials && activeOffer.testimonials.length > 0 && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-500/20 text-primary-300 border border-white/10 flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
                      {activeOffer.testimonials[0].avatarUrl ? (
                        <img src={activeOffer.testimonials[0].avatarUrl} alt={activeOffer.testimonials[0].name} className="w-full h-full object-cover" />
                      ) : (
                        activeOffer.testimonials[0].name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{activeOffer.testimonials[0].name}</span>
                        <div className="flex text-amber-400"><Star size={10} fill="currentColor" /></div>
                      </div>
                      <span className="text-[10px] text-gray-400 block truncate">{activeOffer.testimonials[0].roleCompany}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-300 italic">"{activeOffer.testimonials[0].comment}"</p>
                </div>
              )}

              {/* Selos de Confiança no Rodapé Esquerdo */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><Lock size={12} className="text-emerald-400" /> SSL 256-bit</span>
                <span className="flex items-center gap-1"><QrCode size={12} className="text-emerald-400" /> Pix / Cartão</span>
                <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-primary-400" /> Asaas</span>
              </div>

            </div>
          </div>

          {/* COLUNA DIREITA: Checkout Transparente Direto de 1 Tela */}
          <div className="lg:col-span-7">
            <div className="bg-[#0b0f19] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCard size={20} style={{ color: customAccentColor }} />
                  Pagamento Transparente
                </h3>
                <p className="text-xs text-gray-400 mt-1">Preencha os seus dados e escolha a forma de pagamento abaixo</p>
              </div>

              <form onSubmit={handleProcessPayment} className="space-y-6">
                
                {/* 1. DADOS PESSOAIS DO COMPRADOR */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">1. Dados do Comprador</h4>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Nome Completo ou Razão Social *</label>
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input 
                        type="text" 
                        required
                        value={clientData.name}
                        onChange={e => setClientData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: João da Silva"
                        className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs outline-none focus:ring-2 transition-all"
                        style={{ '--tw-ring-color': customAccentColor } as any}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">E-mail para Recebimento *</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                          type="email" 
                          required
                          value={clientData.email}
                          onChange={e => setClientData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="seuemail@empresa.com"
                          className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs outline-none focus:ring-2 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">WhatsApp / Celular *</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                          type="text" 
                          required
                          value={clientData.whatsapp}
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, '');
                            if (v.length > 11) v = v.substring(0, 11);
                            if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
                            if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
                            setClientData(prev => ({ ...prev, whatsapp: v }));
                          }}
                          placeholder="(11) 99999-9999"
                          className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs outline-none focus:ring-2 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">CPF ou CNPJ (para emissão da nota/fatura) *</label>
                    <div className="relative">
                      <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input 
                        type="text" 
                        required
                        value={clientData.cpfCnpj}
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length <= 11) {
                            if (v.length > 9) v = v.substring(0, 3) + '.' + v.substring(3, 6) + '.' + v.substring(6, 9) + '-' + v.substring(9, 11);
                            else if (v.length > 6) v = v.substring(0, 3) + '.' + v.substring(3, 6) + '.' + v.substring(6);
                            else if (v.length > 3) v = v.substring(0, 3) + '.' + v.substring(3);
                          } else {
                            v = v.substring(0, 14);
                            v = v.substring(0, 2) + '.' + v.substring(2, 5) + '.' + v.substring(5, 8) + '/' + v.substring(8, 12) + '-' + v.substring(12);
                          }
                          setClientData(prev => ({ ...prev, cpfCnpj: v }));
                        }}
                        placeholder="000.000.000-00 ou 00.000.000/0001-00"
                        className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs outline-none focus:ring-2 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. FORMA DE PAGAMENTO EM ABAS */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">2. Escolha o Método de Pagamento</h4>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PIX')}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${paymentMethod === 'PIX' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <QrCode size={20} />
                      <span className="text-xs font-bold">PIX</span>
                      <span className="text-[9px] opacity-75">Aprovação Instantânea</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CREDIT_CARD')}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${paymentMethod === 'CREDIT_CARD' ? 'bg-primary-500/20 border-primary-500 text-primary-400 shadow-lg shadow-primary-500/20' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <CreditCard size={20} />
                      <span className="text-xs font-bold">Cartão</span>
                      <span className="text-[9px] opacity-75">Até 12x no Cartão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('BOLETO')}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${paymentMethod === 'BOLETO' ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <FileText size={20} />
                      <span className="text-xs font-bold">Boleto</span>
                      <span className="text-[9px] opacity-75">Vencimento 1 dia</span>
                    </button>
                  </div>

                  {/* SUB-TELA PIX GERADO NA MESMA PÁGINA */}
                  {paymentMethod === 'PIX' && pixResult && (
                    <div className="p-6 bg-black/60 border border-emerald-500/30 rounded-2xl text-center space-y-4 animate-in fade-in duration-300">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
                        <QrCode size={14} />
                        <span>PIX Gerado com Sucesso!</span>
                      </div>
                      
                      {/* QR Code Imagem */}
                      {pixResult.encodedImage && (
                        <div className="flex justify-center p-3 bg-white rounded-2xl w-48 h-48 mx-auto shadow-xl">
                          <img src={`data:image/png;base64,${pixResult.encodedImage}`} alt="QR Code PIX" className="w-full h-full object-contain" />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase">Chave PIX Copia e Cola</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            readOnly 
                            value={pixResult.payload} 
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300 font-mono truncate"
                          />
                          <button
                            type="button"
                            onClick={handleCopyPix}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                          >
                            {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                        <Loader2 size={12} className="animate-spin text-emerald-400" />
                        Aguardando pagamento... Assim que for pago, o sistema confirmará automaticamente!
                      </p>
                    </div>
                  )}

                  {/* FORMULÁRIO DE CARTÃO DE CRÉDITO COM CARTÃO 3D INTERATIVO */}
                  {paymentMethod === 'CREDIT_CARD' && (
                    <div className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-4 animate-in fade-in duration-300">
                      
                      {/* CARTÃO VIRTUAL 3D INTERATIVO (Gira ao focar no CVV) */}
                      <InteractiveCreditCard 
                        number={cardData.number}
                        holderName={cardData.holderName}
                        expiryMonth={cardData.expiryMonth}
                        expiryYear={cardData.expiryYear}
                        ccv={cardData.ccv}
                        isFlipped={isCardFlipped}
                        accentColor={customAccentColor}
                      />

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Número do Cartão *</label>
                        <input 
                          type="text"
                          value={cardData.number}
                          onFocus={() => setIsCardFlipped(false)}
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, '').substring(0, 16);
                            v = v.replace(/(\d{4})/g, '$1 ').trim();
                            setCardData(prev => ({ ...prev, number: v }));
                          }}
                          placeholder="0000 0000 0000 0000"
                          className="w-full px-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white text-xs font-mono outline-none focus:border-primary-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Nome Impresso no Cartão *</label>
                        <input 
                          type="text"
                          value={cardData.holderName}
                          onFocus={() => setIsCardFlipped(false)}
                          onChange={e => setCardData(prev => ({ ...prev, holderName: e.target.value.toUpperCase() }))}
                          placeholder="COMO ESTÁ NO CARTÃO"
                          className="w-full px-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white text-xs outline-none uppercase focus:border-primary-500 transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-300 mb-1">Mês *</label>
                          <input 
                            type="text"
                            maxLength={2}
                            value={cardData.expiryMonth}
                            onFocus={() => setIsCardFlipped(false)}
                            onChange={e => setCardData(prev => ({ ...prev, expiryMonth: e.target.value.replace(/\D/g, '') }))}
                            placeholder="MM"
                            className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white text-xs text-center font-mono focus:border-primary-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-300 mb-1">Ano *</label>
                          <input 
                            type="text"
                            maxLength={4}
                            value={cardData.expiryYear}
                            onFocus={() => setIsCardFlipped(false)}
                            onChange={e => setCardData(prev => ({ ...prev, expiryYear: e.target.value.replace(/\D/g, '') }))}
                            placeholder="AAAA"
                            className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white text-xs text-center font-mono focus:border-primary-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-300 mb-1 text-amber-400 font-bold">CVV *</label>
                          <input 
                            type="text"
                            maxLength={4}
                            value={cardData.ccv}
                            onFocus={() => setIsCardFlipped(true)}
                            onBlur={() => setIsCardFlipped(false)}
                            onChange={e => setCardData(prev => ({ ...prev, ccv: e.target.value.replace(/\D/g, '') }))}
                            placeholder="123"
                            className="w-full px-3 py-2.5 bg-black/60 border border-amber-500/50 rounded-xl text-white text-xs text-center font-mono outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TELA BOLETO GERADO */}
                  {paymentMethod === 'BOLETO' && boletoResult && (
                    <div className="p-5 bg-black/60 border border-blue-500/30 rounded-2xl space-y-3 animate-in fade-in duration-300">
                      <span className="text-xs font-bold text-blue-400 block">Linha Digitável do Boleto:</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={boletoResult.identificationField} 
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300 font-mono truncate"
                        />
                        <button
                          type="button"
                          onClick={handleCopyBoleto}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                        >
                          {copiedBoleto ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedBoleto ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* BOTÃO DE CONFIRMAÇÃO DO PAGAMENTO */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: customAccentColor }}
                  className="w-full py-4 rounded-2xl text-white font-extrabold text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Processando Pagamento Seguro...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      <span>
                        {paymentMethod === 'PIX' ? 'Gerar PIX Instantâneo' : paymentMethod === 'CREDIT_CARD' ? 'Pagar com Cartão de Crédito' : 'Gerar Boleto Bancário'}
                      </span>
                    </>
                  )}
                </button>

              </form>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
