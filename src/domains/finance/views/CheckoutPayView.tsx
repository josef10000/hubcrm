import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  CreditCard, 
  QrCode, 
  FileText, 
  Copy, 
  Check, 
  Loader2, 
  CheckCircle, 
  Calendar, 
  ShieldCheck,
  Building,
  HelpCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

interface InvoiceInfo {
  paymentId: string;
  value: number;
  dueDate: string;
  description: string;
  billingType: string;
  clientName: string;
  status: string;
  allowedMethods: string[];
}

export default function CheckoutPayView() {
  const { orgId, clientId, paymentId } = useParams<{ orgId: string; clientId: string; paymentId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceInfo | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO' | null>(null);
  
  // Pix state
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; expirationDate: string } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Boleto state
  const [boletoData, setBoletoData] = useState<{ identificationField: string; barCode: string; bankSlipUrl: string } | null>(null);
  const [boletoLoading, setBoletoLoading] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);

  // Card state
  const [cardData, setCardData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    name: '',
    email: '',
    cpfCnpj: '',
    postalCode: '',
    addressNumber: '',
    phone: ''
  });
  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Polling interval ref
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch invoice info
  useEffect(() => {
    // Force dark mode context
    document.documentElement.classList.add('dark');

    const fetchInfo = async () => {
      if (!orgId || !clientId || !paymentId || !token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/checkout/info?orgId=${orgId}&clientId=${clientId}&paymentId=${paymentId}&token=${token}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erro ao carregar dados da fatura');
        }
        const data: InvoiceInfo = await res.json();
        setInvoice(data);
        
        // Auto select first allowed method
        if (data.allowedMethods && data.allowedMethods.length > 0) {
          const firstMethod = data.allowedMethods[0] as 'PIX' | 'CREDIT_CARD' | 'BOLETO';
          setSelectedMethod(firstMethod);
        }

        // Se já estiver pago, vai direto para tela de sucesso
        if (data.status === 'RECEIVED' || data.status === 'CONFIRMED') {
          setPaymentSuccess(true);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Falha ao buscar fatura.');
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [orgId, clientId, paymentId, token]);

  // Polling for payment status (Pix or standard checks)
  useEffect(() => {
    if (paymentSuccess || loading || !invoice) return;

    // Start polling every 5 seconds
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/info?orgId=${orgId}&clientId=${clientId}&paymentId=${invoice.paymentId}&token=${token}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'RECEIVED' || data.status === 'CONFIRMED') {
            setPaymentSuccess(true);
            toast.success('Pagamento confirmado com sucesso!');
            if (pollingInterval.current) clearInterval(pollingInterval.current);
          }
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    }, 5000);

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [paymentSuccess, loading, invoice, orgId, clientId, token]);

  // Load Pix data when PIX method is selected
  useEffect(() => {
    if (selectedMethod !== 'PIX' || pixData || !invoice || paymentSuccess) return;

    const loadPix = async () => {
      setPixLoading(true);
      try {
        const res = await fetch(`/api/checkout/pix?orgId=${orgId}&clientId=${clientId}&paymentId=${invoice.paymentId}&token=${token}`);
        if (!res.ok) throw new Error('Erro ao gerar PIX');
        const data = await res.json();
        setPixData(data);
      } catch (err) {
        toast.error('Erro ao gerar QR Code do PIX. Tente novamente.');
      } finally {
        setPixLoading(false);
      }
    };

    loadPix();
  }, [selectedMethod, invoice, pixData, paymentSuccess, orgId, clientId, token]);

  // Load Boleto data when BOLETO method is selected
  useEffect(() => {
    if (selectedMethod !== 'BOLETO' || boletoData || !invoice || paymentSuccess) return;

    const loadBoleto = async () => {
      setBoletoLoading(true);
      try {
        const res = await fetch(`/api/checkout/boleto?orgId=${orgId}&clientId=${clientId}&paymentId=${invoice.paymentId}&token=${token}`);
        if (!res.ok) throw new Error('Erro ao buscar boleto');
        const data = await res.json();
        setBoletoData(data);
      } catch (err) {
        toast.error('Erro ao carregar dados do Boleto.');
      } finally {
        setBoletoLoading(false);
      }
    };

    loadBoleto();
  }, [selectedMethod, invoice, boletoData, paymentSuccess, orgId, clientId, token]);

  const copyToClipboard = (text: string, type: 'pix' | 'boleto') => {
    navigator.clipboard.writeText(text);
    if (type === 'pix') {
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    } else {
      setCopiedBoleto(true);
      setTimeout(() => setCopiedBoleto(false), 2000);
    }
    toast.success('Código copiado para a área de transferência!');
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    // Basic Validation
    if (!cardData.holderName || !cardData.number || !cardData.expiryMonth || !cardData.expiryYear || !cardData.ccv) {
      toast.error('Preencha os dados do cartão.');
      return;
    }
    if (!cardData.name || !cardData.email || !cardData.cpfCnpj || !cardData.postalCode || !cardData.phone) {
      toast.error('Preencha os dados do titular do cartão.');
      return;
    }

    setCardSubmitting(true);
    try {
      const res = await fetch('/api/checkout/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          clientId,
          paymentId: invoice.paymentId,
          token,
          creditCard: {
            holderName: cardData.holderName,
            number: cardData.number.replace(/\s+/g, ''),
            expiryMonth: cardData.expiryMonth,
            expiryYear: cardData.expiryYear,
            ccv: cardData.ccv
          },
          creditCardHolderInfo: {
            name: cardData.name,
            email: cardData.email,
            cpfCnpj: cardData.cpfCnpj.replace(/\D/g, ''),
            postalCode: cardData.postalCode.replace(/\D/g, ''),
            addressNumber: cardData.addressNumber || 'S/N',
            phone: cardData.phone.replace(/\D/g, '')
          }
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Erro ao processar pagamento por cartão.');
      }

      if (result.success) {
        setPaymentSuccess(true);
        toast.success('Pagamento autorizado e confirmado!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Houve um erro ao processar o cartão.');
    } finally {
      setCardSubmitting(false);
    }
  };

  // Helper formatting for credit card inputs
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F12] text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm font-medium animate-pulse">Carregando dados seguros de faturamento...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#0F0F12] text-white flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-black mb-2">Fatura Não Encontrada</h1>
        <p className="text-gray-400 max-w-md mb-6">
          O link de pagamento acessado é inválido, está incorreto ou já expirou. Verifique o link e tente novamente.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709] text-white flex flex-col justify-between py-10 px-4 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <Toaster theme="dark" position="top-center" richColors />

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Side: Summary info (Vibrant and Premium) */}
        <div className="md:col-span-5 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-500/20 to-transparent blur-md rounded-bl-full" />
          
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center font-black text-black text-lg tracking-tighter">
              H
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Hub Central</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">White-Label Checkout</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Cliente</p>
              <p className="text-lg font-black text-white">{invoice.clientName}</p>
            </div>
            
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Descrição da Fatura</p>
              <p className="text-sm text-gray-300 font-medium leading-relaxed">{invoice.description}</p>
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Vencimento</p>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-400 mt-1">
                  <Calendar size={14} />
                  {new Date(invoice.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mt-1 border ${
                  invoice.status === 'RECEIVED' || invoice.status === 'CONFIRMED' || paymentSuccess
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : invoice.status === 'OVERDUE'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {invoice.status === 'RECEIVED' || invoice.status === 'CONFIRMED' || paymentSuccess ? 'Pago' :
                    invoice.status === 'OVERDUE' ? 'Vencido' : 'Pendente'}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 mt-6 bg-white/5 -mx-6 -mb-6 p-6 rounded-b-3xl">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Total a pagar</p>
              <p className="text-3xl font-black bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
                R$ {invoice.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Payment Form (Tabs & Actions) */}
        <div className="md:col-span-7 bg-[#0d0d11]/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 shadow-2xl min-h-[480px] flex flex-col justify-between">
          
          {paymentSuccess ? (
            /* SUCCESS SCREEN */
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center animate-fade-in">
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h1 className="text-2xl font-black mb-2 text-white">Pagamento Confirmado!</h1>
              <p className="text-gray-400 text-sm max-w-sm mb-8">
                Obrigado! Seu pagamento foi processado e conciliado de forma automática no CRM da Hub Central.
              </p>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-semibold max-w-xs">
                <ShieldCheck size={18} />
                Transação 100% segura e integrada
              </div>
            </div>
          ) : (
            /* PAYMENT OPTIONS */
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-black mb-1">Escolha como pagar</h1>
                <p className="text-xs text-gray-500 font-medium">Transação criptografada e segura de ponta a ponta.</p>
              </div>

              {/* Method tabs */}
              <div className="grid grid-cols-3 gap-3">
                {invoice.allowedMethods.includes('PIX') && (
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('PIX')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedMethod === 'PIX'
                        ? 'bg-primary-500/20 border-primary-500 text-white shadow-lg'
                        : 'bg-white/5 border-white/5 hover:border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <QrCode size={20} className={selectedMethod === 'PIX' ? 'text-primary-400' : ''} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">PIX</span>
                  </button>
                )}
                
                {invoice.allowedMethods.includes('CREDIT_CARD') && (
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('CREDIT_CARD')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedMethod === 'CREDIT_CARD'
                        ? 'bg-primary-500/20 border-primary-500 text-white shadow-lg'
                        : 'bg-white/5 border-white/5 hover:border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <CreditCard size={20} className={selectedMethod === 'CREDIT_CARD' ? 'text-primary-400' : ''} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Cartão</span>
                  </button>
                )}

                {invoice.allowedMethods.includes('BOLETO') && (
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('BOLETO')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedMethod === 'BOLETO'
                        ? 'bg-primary-500/20 border-primary-500 text-white shadow-lg'
                        : 'bg-white/5 border-white/5 hover:border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <FileText size={20} className={selectedMethod === 'BOLETO' ? 'text-primary-400' : ''} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Boleto</span>
                  </button>
                )}
              </div>

              {/* METHOD DETAILS */}
              <div className="pt-2">
                
                {/* PIX SCREEN */}
                {selectedMethod === 'PIX' && (
                  <div className="flex flex-col items-center text-center space-y-5 py-2">
                    {pixLoading ? (
                      <div className="h-44 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-2" />
                        <p className="text-xs text-gray-500">Gerando QR Code...</p>
                      </div>
                    ) : pixData ? (
                      <>
                        <div className="bg-white p-3 rounded-2xl shadow-xl border border-white/10 inline-block animate-fade-in">
                          <img 
                            src={`data:image/png;base64,${pixData.encodedImage}`} 
                            alt="QR Code PIX" 
                            className="w-40 h-40"
                          />
                        </div>
                        <div className="w-full max-w-sm space-y-2">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Ou pague copia e cola</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={pixData.payload}
                              className="bg-white/5 border border-white/10 text-xs text-gray-300 font-mono p-3 rounded-xl flex-1 outline-none truncate"
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(pixData.payload, 'pix')}
                              className="px-4 bg-primary-500 hover:bg-primary-400 text-black rounded-xl font-bold flex items-center justify-center transition-colors gap-1.5"
                            >
                              {copiedPix ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin text-primary-400" />
                          Aguardando confirmação de pagamento em tempo real...
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                {/* BOLETO SCREEN */}
                {selectedMethod === 'BOLETO' && (
                  <div className="flex flex-col items-center text-center space-y-6 py-4 animate-fade-in">
                    {boletoLoading ? (
                      <div className="h-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-2" />
                        <p className="text-xs text-gray-500">Carregando código do Boleto...</p>
                      </div>
                    ) : boletoData ? (
                      <>
                        <div className="w-full space-y-2 text-left">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black text-center">Linha Digitável do Boleto</p>
                          <div className="flex gap-2 max-w-md mx-auto">
                            <input
                              type="text"
                              readOnly
                              value={boletoData.identificationField}
                              className="bg-white/5 border border-white/10 text-xs text-gray-300 font-mono p-3.5 rounded-xl flex-1 outline-none text-center"
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(boletoData.identificationField, 'boleto')}
                              className="px-4 bg-primary-500 hover:bg-primary-400 text-black rounded-xl font-bold flex items-center justify-center transition-colors"
                            >
                              {copiedBoleto ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center">
                          <a
                            href={boletoData.bankSlipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-bold text-center transition-all flex items-center justify-center gap-2"
                          >
                            <FileText size={16} />
                            Visualizar PDF
                          </a>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                {/* CREDIT CARD SCREEN */}
                {selectedMethod === 'CREDIT_CARD' && (
                  <form onSubmit={handleCardSubmit} className="space-y-4 animate-fade-in">
                    
                    {/* Part 1: Card info */}
                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Dados do Cartão</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Número do Cartão</label>
                          <input
                            type="text"
                            maxLength={19}
                            value={cardData.number}
                            onChange={(e) => setCardData(prev => ({ ...prev, number: formatCardNumber(e.target.value) }))}
                            placeholder="0000 0000 0000 0000"
                            className="w-full bg-[#121216] border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-primary-500"
                            required
                          />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Nome no Cartão</label>
                          <input
                            type="text"
                            value={cardData.holderName}
                            onChange={(e) => setCardData(prev => ({ ...prev, holderName: e.target.value.toUpperCase() }))}
                            placeholder="NOME IMPRESSO NO CARTÃO"
                            className="w-full bg-[#121216] border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-primary-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Validade</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={2}
                              placeholder="MM"
                              value={cardData.expiryMonth}
                              onChange={(e) => setCardData(prev => ({ ...prev, expiryMonth: e.target.value.replace(/\D/g, '') }))}
                              className="w-full bg-[#121216] border border-white/10 p-3 rounded-xl text-sm text-center outline-none focus:border-primary-500"
                              required
                            />
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="AAAA"
                              value={cardData.expiryYear}
                              onChange={(e) => setCardData(prev => ({ ...prev, expiryYear: e.target.value.replace(/\D/g, '') }))}
                              className="w-full bg-[#121216] border border-white/10 p-3 rounded-xl text-sm text-center outline-none focus:border-primary-500"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">CVV</label>
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="123"
                            value={cardData.ccv}
                            onChange={(e) => setCardData(prev => ({ ...prev, ccv: e.target.value.replace(/\D/g, '') }))}
                            className="w-full bg-[#121216] border border-white/10 p-3 rounded-xl text-sm text-center outline-none focus:border-primary-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Part 2: Card holder info */}
                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Dados do Titular</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Nome Completo</label>
                          <input
                            type="text"
                            value={cardData.name}
                            onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Nome Completo do Comprador"
                            className="w-full bg-[#121216] border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-primary-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">E-mail</label>
                          <input
                            type="email"
                            value={cardData.email}
                            onChange={(e) => setCardData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="exemplo@email.com"
                            className="w-full bg-[#121216] border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-primary-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">CPF ou CNPJ</label>
                          <input
                            type="text"
                            value={cardData.cpfCnpj}
                            onChange={(e) => setCardData(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                            placeholder="000.000.000-00"
                            className="w-full bg-[#121216] border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-primary-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">CEP</label>
                          <input
                            type="text"
                            value={cardData.postalCode}
                            onChange={(e) => setCardData(prev => ({ ...prev, postalCode: e.target.value }))}
                            placeholder="00000-000"
                            className="w-full bg-[#121216] border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-primary-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Nº Endereço</label>
                          <input
                            type="text"
                            value={cardData.addressNumber}
                            onChange={(e) => setCardData(prev => ({ ...prev, addressNumber: e.target.value }))}
                            placeholder="123"
                            className="w-full bg-[#121216] border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-primary-500"
                          />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Telefone / WhatsApp</label>
                          <input
                            type="text"
                            value={cardData.phone}
                            onChange={(e) => setCardData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="(00) 00000-0000"
                            className="w-full bg-[#121216] border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-primary-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={cardSubmitting}
                      className="w-full py-4 bg-primary-500 hover:bg-primary-400 text-black font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary-500/10 cursor-pointer"
                    >
                      {cardSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processando Pagamento...
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={18} />
                          Pagar R$ {invoice.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </>
                      )}
                    </button>
                  </form>
                )}

              </div>
            </div>
          )}

          {/* Footer security message */}
          <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-center gap-1.5 text-[9px] text-gray-600 font-bold uppercase tracking-widest">
            <ShieldCheck size={12} className="text-emerald-500" />
            Transação segura protegida por SSL e Tokenização
          </div>
        </div>

      </div>

      {/* Footer copyright */}
      <div className="max-w-4xl w-full mx-auto mt-10 text-center text-[10px] text-gray-600 font-semibold relative z-10">
        © {new Date().getFullYear()} Hub Central. Todos os direitos reservados.
      </div>
    </div>
  );
}
