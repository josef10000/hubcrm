import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Plus, DollarSign, CheckCircle, Clock, MapPin, Phone, Tag, Building2, FileText, Briefcase, AlignLeft,
  Paperclip, Copy, MessageCircle, Trash2, Snowflake, Globe, Image as ImageIcon, Sparkles, Wand2, Star, Zap,
  RefreshCw, Link as LinkIcon, AlertTriangle, TrendingDown, Eye, EyeOff, Edit2, Loader2, Download, FileSignature, FileUp
} from 'lucide-react';
import { auth, db, storage } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import { Client, ClientLog, ClientCredential, ClientStage, OnboardingQuestion, Offer, SiteStatus, ClientContract } from '../types';
import { getPlanPrice, getSetupPrice } from '../helpers';
import ConfirmationModal from './ConfirmationModal';
import { useCRM } from '../contexts/CRMContext';

export default
function ClientModal({ isOpen, onClose, onSave, onDelete, initialData, onboardingQuestions, user, offers }: { isOpen: boolean, onClose: () => void, onSave: (data: Partial<Client>) => void, onDelete?: (id: string) => void, initialData: Client | null, onboardingQuestions: OnboardingQuestion[], user: User, offers: Offer[] }) {
  const { defaultContractText } = useCRM();
  const activeOffers = offers.filter(o => o.active);
  const defaultOffer = activeOffers.length > 0 ? activeOffers[0] : null;

  const [formData, setFormData] = useState<Partial<Client>>({ 
    plan: defaultOffer?.name || 'Essencial',
    offerId: defaultOffer?.id,
    planPrice: defaultOffer?.price ?? 397,
    setupPrice: defaultOffer?.setupPrice ?? 2500,
    status: 'Em Desenvolvimento',
    isCombo: false,
    maxInstallments: defaultOffer?.maxInstallments ?? 12,
    billingType: 'CREDIT_CARD'
  });
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'stages' | 'credentials' | 'onboarding' | 'contracts' | 'referrals'>('details');
  const [cepLoading, setCepLoading] = useState(false);
  const [cpfCnpjStatus, setCpfCnpjStatus] = useState<'idle' | 'valid' | 'invalid' | 'loading'>('idle');
  const [newLogText, setNewLogText] = useState('');
  const [credentials, setCredentials] = useState<ClientCredential[]>([]);
  const [newCredential, setNewCredential] = useState<Partial<ClientCredential>>({});
  const [showNewCredential, setShowNewCredential] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  
  // Contracts state
  const [isContractUploading, setIsContractUploading] = useState(false);
  const [showNewContractForm, setShowNewContractForm] = useState(false);
  const [newContractType, setNewContractType] = useState<'pdf' | 'text'>('text');
  const [newContractText, setNewContractText] = useState(defaultContractText || '');

  const selectedOffer = useMemo(() => {
    return offers.find(o => o.id === formData.offerId) || offers.find(o => o.name === formData.plan);
  }, [offers, formData.offerId, formData.plan]);

  const generateGPTPrompt = () => {
    if (!formData.onboardingAnswers) return "";

    let prompt = "Aja como um especialista em Copywriting e Web Design. Com base nas respostas do briefing abaixo, gere um prompt detalhado para a criação de uma Landing Page de alta conversão:\n\n";
    
    Object.entries(formData.onboardingAnswers).forEach(([questionId, answer]) => {
      const question = onboardingQuestions.find(q => q.id === questionId);
      const questionText = question ? question.text : questionId;
      if (question?.type === 'file') {
        prompt += `[${questionText}]: (Arquivo Anexado)\n`;
      } else {
        prompt += `[${questionText}]: ${answer}\n`;
      }
    });

    return prompt;
  };

  useEffect(() => {
    if (initialData?.id && activeTab === 'credentials' && auth.currentUser) {
      const credsRef = collection(db, 'users', auth.currentUser.uid, 'clients', initialData.id, 'credentials');
      const unsubscribe = onSnapshot(credsRef, (snapshot) => {
        const loaded: ClientCredential[] = [];
        snapshot.forEach(doc => loaded.push({ id: doc.id, ...doc.data() } as ClientCredential));
        setCredentials(loaded.sort((a, b) => b.createdAt - a.createdAt));
      });
      return () => unsubscribe();
    }
  }, [initialData?.id, activeTab]);

  const getNextPaymentDateText = () => {
    if (!formData.recurringPaymentDay) return null;
    
    const firstPaymentDate = formData.firstPaymentDate || new Date().toISOString().split('T')[0];
    const firstDateObj = new Date(firstPaymentDate + 'T12:00:00Z');
    let nextSubDate = new Date(firstDateObj.getFullYear(), firstDateObj.getMonth(), formData.recurringPaymentDay, 12, 0, 0);
    
    if (nextSubDate.getTime() <= firstDateObj.getTime()) {
      nextSubDate.setMonth(nextSubDate.getMonth() + 1);
    }

    const diffTime = nextSubDate.getTime() - firstDateObj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays < 15) {
      nextSubDate.setMonth(nextSubDate.getMonth() + 1);
    }
    
    return `A 2ª cobrança será em: ${nextSubDate.toLocaleDateString('pt-BR')}`;
  };

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      
      // Check payment status from Asaas if subscription exists and not cancelled
      if (initialData.asaasSubscriptionId && initialData.status !== 'Cancelado' && isOpen) {
        checkPaymentStatus(initialData.asaasSubscriptionId);
      }
    } else {
      setFormData({ 
        plan: defaultOffer?.name || 'Essencial',
        offerId: defaultOffer?.id,
        planPrice: defaultOffer?.price ?? 397,
        setupPrice: defaultOffer?.setupPrice ?? 2500,
        status: 'Em Desenvolvimento',
        isCombo: false,
        maxInstallments: defaultOffer?.maxInstallments ?? 12,
        billingType: 'CREDIT_CARD'
      });
    }
    setShowCancelConfirm(false);
    setActiveTab('details');
  }, [initialData, isOpen, defaultOffer?.id]);

  const checkPaymentStatus = async (subscriptionId: string) => {
    setIsCheckingPayment(true);
    try {
      const res = await fetch(`/api/asaas/subscriptions/${subscriptionId}`);
      if (res.ok) {
        const data = await res.json();
        const payments = data.payments || [];
        const subscription = data.subscription;
        
        // Find the most recent payment
        if (payments.length > 0) {
          const latestPayment = payments[0];
          const status = latestPayment.status;
          
          let newPaymentStatus: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'N/A' = 'PENDING';
          let newSiteStatus: SiteStatus = formData.status || 'Em Desenvolvimento';
          
          if (status === 'RECEIVED' || status === 'CONFIRMED') {
            newPaymentStatus = 'RECEIVED';
            newSiteStatus = 'Ativo';
          } else if (status === 'OVERDUE') {
            newPaymentStatus = 'OVERDUE';
            newSiteStatus = 'Inadimplente';
          }
          
          const nextDueDate = subscription?.nextDueDate || formData.nextDueDate;
          
          setFormData(prev => ({
            ...prev,
            paymentStatus: newPaymentStatus,
            status: newSiteStatus,
            nextDueDate: nextDueDate,
            invoiceUrl: latestPayment.invoiceUrl || prev.invoiceUrl
          }));
        }
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.offerId && !formData.plan) {
      toast.error("Por favor, selecione uma Oferta / Produto.");
      return;
    }
    onSave(formData);
  };

  const handleCancelSubscription = () => {
    setFormData(prev => ({ ...prev, status: 'Cancelado' }));
    onSave({ ...formData, status: 'Cancelado' });
  };

  // --- ViaCEP auto-fill ---
  const fetchCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || prev.endereco || '',
          bairro: data.bairro || prev.bairro || '',
          cidade: data.localidade || prev.cidade || '',
          estado: data.uf || prev.estado || '',
        }));
        toast.success('Endereço preenchido automaticamente!');
      } else {
        toast.error('CEP não encontrado.');
      }
    } catch { toast.error('Erro ao buscar CEP.'); }
    finally { setCepLoading(false); }
  };

  // --- CPF/CNPJ validation ---
  const validateCpf = (cpf: string): boolean => {
    const d = cpf.replace(/\D/g, '');
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
    let check = 11 - (sum % 11);
    if (check >= 10) check = 0;
    if (parseInt(d[9]) !== check) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
    check = 11 - (sum % 11);
    if (check >= 10) check = 0;
    return parseInt(d[10]) === check;
  };

  const handleCpfCnpjBlur = async () => {
    const raw = (formData.cpfCnpj || '').replace(/\D/g, '');
    if (!raw) { setCpfCnpjStatus('idle'); return; }
    if (raw.length === 11) {
      setCpfCnpjStatus(validateCpf(raw) ? 'valid' : 'invalid');
    } else if (raw.length === 14) {
      setCpfCnpjStatus('loading');
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
        if (res.ok) {
          const data = await res.json();
          setCpfCnpjStatus('valid');
          if (data.razao_social && !formData.name) {
            setFormData(prev => ({ ...prev, name: data.razao_social }));
            toast.success(`Razão social preenchida: ${data.razao_social}`);
          }
        } else { setCpfCnpjStatus('invalid'); }
      } catch { setCpfCnpjStatus('invalid'); }
    } else { setCpfCnpjStatus('invalid'); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'whatsapp') {
      // Auto-format whatsapp: (99) 99999-9999
      let v = value.replace(/\D/g, '');
      if (v.length > 11) v = v.substring(0, 11);
      if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
      if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
      setFormData(prev => ({ ...prev, [name]: v }));
    } else if (name === 'cpfCnpj') {
      // Auto-format CPF: 999.999.999-99 or CNPJ: 99.999.999/9999-99
      let v = value.replace(/\D/g, '');
      if (v.length <= 11) {
        if (v.length > 9) v = v.substring(0, 3) + '.' + v.substring(3, 6) + '.' + v.substring(6, 9) + '-' + v.substring(9, 11);
        else if (v.length > 6) v = v.substring(0, 3) + '.' + v.substring(3, 6) + '.' + v.substring(6);
        else if (v.length > 3) v = v.substring(0, 3) + '.' + v.substring(3);
      } else {
        v = v.substring(0, 14);
        v = v.substring(0, 2) + '.' + v.substring(2, 5) + '.' + v.substring(5, 8) + '/' + v.substring(8, 12) + '-' + v.substring(12);
      }
      setFormData(prev => ({ ...prev, [name]: v }));
      setCpfCnpjStatus('idle');
    } else if (name === 'cep') {
      // Auto-format CEP: 99999-999
      let v = value.replace(/\D/g, '');
      if (v.length > 8) v = v.substring(0, 8);
      if (v.length > 5) v = v.substring(0, 5) + '-' + v.substring(5);
      setFormData(prev => ({ ...prev, [name]: v }));
      // Auto-fetch when 8 digits
      if (v.replace(/\D/g, '').length === 8) fetchCep(v);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-3xl rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col border border-gray-300 dark:border-white/20 overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 shrink-0">
          <div className="flex items-center space-x-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{initialData ? 'Detalhes do Cliente' : 'Novo Cliente'}</h2>
            {initialData && (
              <div className="flex space-x-2 bg-black/20 p-1 rounded-xl border border-white/5">
                <button 
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'details' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                >
                  Dados
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                >
                  Histórico
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('stages')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'stages' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                >
                  Etapas
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('credentials')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'credentials' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                >
                  Credenciais
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('onboarding')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'onboarding' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                >
                  Briefing
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('referrals')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'referrals' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                >
                  Indicações
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('contracts')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'contracts' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                >
                  Contratos
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {activeTab === 'details' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Basic Info & Payment */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">Dados do Cliente</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nome do Cliente/Empresa *</label>
                    <input required type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" placeholder="Ex: João Silva" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">WhatsApp *</label>
                    <input required type="text" name="whatsapp" value={formData.whatsapp || ''} onChange={handleChange} placeholder="(11) 99999-9999" className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">CPF/CNPJ *</label>
                    <div className="relative">
                      <input required type="text" name="cpfCnpj" value={formData.cpfCnpj || ''} onChange={handleChange} onBlur={handleCpfCnpjBlur} placeholder="999.999.999-99" className={`w-full px-4 py-3 pr-10 bg-black/20 border text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500 ${cpfCnpjStatus === 'valid' ? 'border-emerald-500' : cpfCnpjStatus === 'invalid' ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`} />
                      {cpfCnpjStatus === 'loading' && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                      {cpfCnpjStatus === 'valid' && <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                      {cpfCnpjStatus === 'invalid' && <X size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">E-mail *</label>
                    <input required type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="cliente@email.com" className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                  </div>

                  {/* --- Endereço (ViaCEP) --- */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">CEP</label>
                    <div className="relative">
                      <input type="text" name="cep" value={formData.cep || ''} onChange={handleChange} placeholder="00000-000" className="w-full px-4 py-3 pr-10 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                      {cepLoading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 animate-spin" />}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Endereço</label>
                    <input type="text" name="endereco" value={formData.endereco || ''} onChange={handleChange} placeholder="Rua, Avenida..." className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Bairro</label>
                      <input type="text" name="bairro" value={formData.bairro || ''} onChange={handleChange} placeholder="Bairro" className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Cidade</label>
                      <input type="text" name="cidade" value={formData.cidade || ''} onChange={handleChange} placeholder="Cidade" className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">UF</label>
                      <input type="text" name="estado" value={formData.estado || ''} onChange={handleChange} placeholder="UF" maxLength={2} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Origem do Lead *</label>
                    <select required name="leadSource" value={formData.leadSource || ''} onChange={handleChange} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all">
                      <option value="">Selecione a origem</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Google Ads">Google Ads</option>
                      <option value="Tráfego Orgânico">Tráfego Orgânico</option>
                      <option value="Prospecção Manual">Prospecção Manual</option>
                      <option value="Instagram">Instagram</option>
                      <option value="WhatsApp Direto">WhatsApp Direto</option>
                      <option value="Parceiro">Parceiro</option>
                    </select>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-8 mb-4 border-b border-gray-200 dark:border-white/10 pb-2">Configurações de Pagamento</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Oferta / Produto *</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                      {offers.filter(o => o.active).map(offer => (
                        <button 
                          key={offer.id}
                          type="button" 
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            offerId: offer.id,
                            plan: offer.name,
                            planPrice: offer.price,
                            setupPrice: offer.setupPrice,
                            maxInstallments: offer.maxInstallments || prev.maxInstallments,
                            billingCycle: offer.type === 'SINGLE' ? undefined : (prev.billingCycle || 'MONTHLY')
                          }))}
                          className={`p-4 rounded-xl border text-left transition-all ${formData.offerId === offer.id || (!formData.offerId && formData.plan === offer.name) ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                        >
                          <div className="font-semibold mb-1">{offer.name}</div>
                          {offer.type === 'SUBSCRIPTION' ? (
                            <>
                              <div className="text-xs opacity-80">Setup: R$ {(offer.setupPrice || 0).toLocaleString('pt-BR')}</div>
                              <div className="text-sm font-bold mt-1">R$ {(offer.price || 0).toLocaleString('pt-BR')}/mês</div>
                            </>
                          ) : (
                            <>
                              <div className="text-xs opacity-80">Pagamento Único</div>
                              <div className="text-sm font-bold mt-1">R$ {((offer.price || 0) + (offer.setupPrice || 0)).toLocaleString('pt-BR')}</div>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(!selectedOffer || selectedOffer.type === 'SUBSCRIPTION') && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Data do Primeiro Pagamento</label>
                          <input 
                            type="date" 
                            name="firstPaymentDate" 
                            value={formData.firstPaymentDate || new Date().toISOString().split('T')[0]} 
                            onChange={handleChange} 
                            className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                          />
                          <p className="text-xs text-gray-500 mt-1">Data da primeira cobrança (padrão: hoje)</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Dia de Vencimento (Próximos Meses)</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="31" 
                            name="recurringPaymentDay" 
                            value={formData.recurringPaymentDay || ''} 
                            onChange={(e) => setFormData(prev => ({ ...prev, recurringPaymentDay: e.target.value ? parseInt(e.target.value) : undefined }))} 
                            placeholder="Ex: 15" 
                            className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" 
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {getNextPaymentDateText() ? (
                              <span className="text-primary-500 dark:text-primary-400 font-medium">{getNextPaymentDateText()}</span>
                            ) : (
                              "Opcional. Se vazio, será o mesmo dia do primeiro pagamento."
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Ciclo de Cobrança *</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button" 
                            onClick={() => setFormData(prev => ({ ...prev, billingCycle: 'MONTHLY', isCombo: false }))}
                            className={`p-4 rounded-xl border text-center transition-all ${formData.billingCycle === 'MONTHLY' || !formData.billingCycle ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                          >
                            <div className="font-semibold text-sm">Mensal</div>
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setFormData(prev => ({ ...prev, billingCycle: 'YEARLY' }))}
                            className={`p-4 rounded-xl border text-center transition-all ${formData.billingCycle === 'YEARLY' ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                          >
                            <div className="font-semibold text-sm">Anual</div>
                          </button>
                        </div>

                        {formData.billingCycle === 'YEARLY' && (
                          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <label className="flex items-center justify-between cursor-pointer">
                              <div>
                                <span className="text-sm font-bold text-emerald-400">Pagamento Combo (Setup + Anual)</span>
                                <p className="text-[10px] text-gray-400">Permite parcelar o valor total no cartão</p>
                              </div>
                              <div className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer"
                                  checked={formData.isCombo || false}
                                  onChange={(e) => setFormData(prev => ({ ...prev, isCombo: e.target.checked, billingType: e.target.checked ? 'CREDIT_CARD' : prev.billingType }))}
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                              </div>
                            </label>
                            
                            {formData.isCombo && (
                              <div className="mt-3 pt-3 border-t border-emerald-500/10">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] text-gray-400 uppercase font-bold">Valor Total do Combo</span>
                                  <span className="text-sm font-bold text-emerald-400">R$ {getPlanPrice(formData.plan, 'YEARLY', formData).toLocaleString('pt-BR')}</span>
                                </div>
                                <p className="text-[10px] text-emerald-400 font-medium">O cliente receberá o link de pagamento e poderá escolher o parcelamento em até 12x no checkout. O valor inclui o Setup + 9 parcelas (desconto de 3 meses).</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Forma de Pagamento *</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, billingType: 'PIX' }))}
                        className={`p-4 rounded-xl border text-center transition-all ${formData.billingType === 'PIX' ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                      >
                        <div className="font-semibold text-[10px] uppercase tracking-wider">Apenas PIX</div>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, billingType: 'CREDIT_CARD' }))}
                        className={`p-4 rounded-xl border text-center transition-all ${formData.billingType === 'CREDIT_CARD' ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                      >
                        <div className="font-semibold text-[10px] uppercase tracking-wider">Apenas Cartão</div>
                      </button>
                      <button 
                        type="button" 
                        disabled={selectedOffer?.type === 'SINGLE'}
                        onClick={() => setFormData(prev => ({ ...prev, billingType: undefined }))}
                        className={`p-4 rounded-xl border text-center transition-all ${!formData.billingType ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'} ${selectedOffer?.type === 'SINGLE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-semibold text-[10px] uppercase tracking-wider">Cliente Escolhe</div>
                      </button>
                    </div>
                  </div>

                  {(formData.isCombo || selectedOffer?.type === 'SINGLE') && (formData.billingType === 'CREDIT_CARD' || !formData.billingType) && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Máximo de Parcelas (Cartão de Crédito)</label>
                      <select
                        value={formData.maxInstallments || 12}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxInstallments: Number(e.target.value) }))}
                        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      >
                        {Array.from({ length: selectedOffer?.maxInstallments || 12 }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num} className="bg-white dark:bg-gray-900">
                            {num === 1 ? 'À vista (1x)' : `Até ${num}x`}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        O cliente poderá escolher no checkout parcelar em até {formData.maxInstallments || 12} vezes.
                      </p>
                    </div>
                  )}

                  {formData.isCombo && formData.comboRenewalDate && (
                    <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center gap-3">
                      <Zap size={20} className="text-purple-400" />
                      <div>
                        <p className="text-xs text-purple-300 font-medium uppercase tracking-wider">Renovação do Combo</p>
                        <p className="text-sm text-white font-bold">{new Date(formData.comboRenewalDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Status & Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">Status e Detalhes</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Status</label>
                    <div className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl flex items-center justify-between">
                      <span className="flex items-center">
                        {formData.status === 'Ativo' ? '🟢 Ativo' : 
                         formData.status === 'Cancelado' ? '⚫ Cancelado' : 
                         formData.status === 'Inadimplente' ? '🔴 Inadimplente' : 
                         '🟡 Em Desenvolvimento'}
                      </span>
                      {isCheckingPayment && <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">Verificando pagamento...</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Data Prevista de Entrega</label>
                    <input 
                      type="date" 
                      name="deliveryDate" 
                      value={formData.deliveryDate || ''} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Data em que o site deve ser entregue ao cliente</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nicho / Área de Atuação</label>
                    <input type="text" name="niche" value={formData.niche || ''} onChange={handleChange} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" placeholder="Ex: Advogado, Clínica, E-commerce..." />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Link do Site (Opcional)</label>
                    <input type="url" name="siteLink" value={formData.siteLink || ''} onChange={handleChange} placeholder="https://..." className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                  </div>

                  {initialData && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Link de Briefing do Cliente</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 rounded-xl text-sm truncate select-all">
                          {window.location.origin}/onboarding/{auth.currentUser?.uid}/{initialData.id}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/onboarding/${auth.currentUser?.uid}/${initialData.id}`);
                            toast.success('Link copiado!');
                          }}
                          className="p-3 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-xl transition-colors shrink-0"
                          title="Copiar Link"
                        >
                          <Copy size={18} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Envie este link para o cliente preencher o briefing. As respostas atualizarão este cadastro.</p>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Anotações e Credenciais</label>
                    <textarea name="notes" value={formData.notes || ''} onChange={handleChange} className="w-full flex-1 min-h-[150px] px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500 custom-scrollbar resize-none" placeholder="Anotações importantes, links de referência, acessos..."></textarea>
                  </div>

                  {formData.npsScore !== undefined && (
                    <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="text-primary-500" size={18} />
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Avaliação NPS</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                          formData.npsScore >= 9 ? 'bg-emerald-500/20 text-emerald-500' :
                          formData.npsScore >= 7 ? 'bg-yellow-500/20 text-yellow-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {formData.npsScore}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {formData.npsScore >= 9 ? 'Promotor' : formData.npsScore >= 7 ? 'Passivo' : 'Detrator'}
                          </p>
                          {formData.npsComment && (
                            <p className="text-xs text-gray-500 italic mt-1 leading-relaxed">"{formData.npsComment}"</p>
                          )}
                          {formData.npsSubmittedAt && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              Recebido em: {new Date(formData.npsSubmittedAt.toMillis ? formData.npsSubmittedAt.toMillis() : formData.npsSubmittedAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'history' ? (
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-white/10 pb-2">Adicionar Anotação</h3>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={newLogText} 
                      onChange={(e) => setNewLogText(e.target.value)} 
                      placeholder="Descreva a interação, alteração ou nota..." 
                      className="flex-1 px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newLogText.trim()) {
                          e.preventDefault();
                          const newLog = { id: Date.now().toString(36) + Math.random().toString(36).substring(2), text: newLogText.trim(), date: Date.now() };
                          setFormData(prev => ({ ...prev, logs: [newLog, ...(prev.logs || [])] }));
                          setNewLogText('');
                        }
                      }}
                    />
                    <button 
                      type="button"
                      disabled={!newLogText.trim()}
                      onClick={() => {
                        if (newLogText.trim()) {
                          const newLog = { id: Date.now().toString(36) + Math.random().toString(36).substring(2), text: newLogText.trim(), date: Date.now() };
                          setFormData(prev => ({ ...prev, logs: [newLog, ...(prev.logs || [])] }));
                          setNewLogText('');
                        }
                      }}
                      className="px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-gray-900 dark:text-white rounded-xl font-medium transition-all"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">Histórico</h3>
                  {(!formData.logs || formData.logs.length === 0) ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma anotação registrada para este cliente.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.logs.map(log => (
                        <div key={log.id} className="bg-black/20 border border-white/5 p-4 rounded-xl relative group">
                          <p className="text-gray-200 text-sm mb-2">{log.text}</p>
                          <p className="text-xs text-gray-500">{new Date(log.date).toLocaleString('pt-BR')}</p>
                          <button 
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, logs: prev.logs?.filter(l => l.id !== log.id) }));
                            }}
                            className="absolute top-3 right-3 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'stages' ? (
              <div className="flex flex-col h-full">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">Etapas do Projeto</h3>
                <div className="space-y-4">
                  {formData.stages?.map((stage, index) => (
                    <div key={stage.id} className="flex flex-col p-4 bg-black/20 border border-white/5 rounded-xl gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${stage.completed ? 'bg-green-500/20 text-green-500' : 'bg-primary-500/20 text-primary-500'}`}>
                            {stage.completed ? <CheckCircle size={16} /> : index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{stage.name}</p>
                            {stage.approvedAt && <p className="text-xs text-gray-500">Aprovado em: {new Date(stage.approvedAt).toLocaleString('pt-BR')}</p>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newStages = [...(formData.stages || [])];
                            newStages[index].completed = !newStages[index].completed;
                            if (!newStages[index].completed) newStages[index].approvedAt = null;
                            setFormData(prev => ({ ...prev, stages: newStages }));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${stage.completed ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-gray-200 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/10'}`}
                        >
                          {stage.completed ? 'Concluído' : 'Marcar Concluído'}
                        </button>
                      </div>
                      <div className="pl-11 pr-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          placeholder="Link para aprovação (ex: Figma, Drive)" 
                          value={stage.link || ''}
                          onChange={(e) => {
                            const newStages = [...(formData.stages || [])];
                            newStages[index].link = e.target.value;
                            setFormData(prev => ({ ...prev, stages: newStages }));
                          }}
                          className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                        />
                        <input 
                          type="text" 
                          placeholder="Descrição ou instrução para o cliente" 
                          value={stage.description || ''}
                          onChange={(e) => {
                            const newStages = [...(formData.stages || [])];
                            newStages[index].description = e.target.value;
                            setFormData(prev => ({ ...prev, stages: newStages }));
                          }}
                          className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                        />
                      </div>
                    </div>
                  ))}
                  {(!formData.stages || formData.stages.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma etapa definida para este cliente.
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'credentials' ? (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-white/10 pb-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Cofre de Credenciais</h3>
                  <button
                    type="button"
                    onClick={() => setShowNewCredential(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    Nova Credencial
                  </button>
                </div>

                {showNewCredential && (
                  <div className="bg-black/20 border border-white/5 p-4 rounded-xl mb-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">URL / Serviço</label>
                      <input type="text" value={newCredential.url || ''} onChange={e => setNewCredential({...newCredential, url: e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="ex: Hostinger, WordPress..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Usuário</label>
                        <input type="text" value={newCredential.username || ''} onChange={e => setNewCredential({...newCredential, username: e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Senha</label>
                        <input type="password" value={newCredential.password || ''} onChange={e => setNewCredential({...newCredential, password: e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Notas (Opcional)</label>
                      <input type="text" value={newCredential.notes || ''} onChange={e => setNewCredential({...newCredential, notes: e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowNewCredential(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancelar</button>
                      <button type="button" onClick={async () => {
                        if (!initialData?.id || !auth.currentUser || !newCredential.url || !newCredential.username) return;
                        try {
                          const credRef = doc(collection(db, 'users', auth.currentUser.uid, 'clients', initialData.id, 'credentials'));
                          await setDoc(credRef, { ...newCredential, id: credRef.id, createdAt: Date.now() });
                          setNewCredential({});
                          setShowNewCredential(false);
                          toast.success('Credencial salva!');
                        } catch (err) {
                          toast.error('Erro ao salvar credencial.');
                        }
                      }} className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium">Salvar</button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {credentials.map(cred => (
                    <div key={cred.id} className="bg-black/20 border border-white/5 p-4 rounded-xl relative group">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{cred.url}</h4>
                        <button type="button" onClick={async () => {
                          if (!initialData?.id || !auth.currentUser) return;
                          await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'clients', initialData.id, 'credentials', cred.id));
                          toast.success('Credencial excluída!');
                        }} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 block text-xs">Usuário</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300">{cred.username}</span>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(cred.username); toast.success('Copiado!'); }} className="text-gray-500 hover:text-primary-400"><Copy size={14} /></button>
                          </div>
                        </div>
                        {cred.password && (
                          <div>
                            <span className="text-gray-500 block text-xs">Senha</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-300">••••••••</span>
                              <button type="button" onClick={() => { navigator.clipboard.writeText(cred.password!); toast.success('Copiado!'); }} className="text-gray-500 hover:text-primary-400"><Copy size={14} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                      {cred.notes && <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-white/5">{cred.notes}</p>}
                    </div>
                  ))}
                  {credentials.length === 0 && !showNewCredential && (
                    <div className="text-center py-8 text-gray-500">Nenhuma credencial salva.</div>
                  )}
                </div>
              </div>
            ) : activeTab === 'onboarding' ? (
              <div className="flex flex-col h-full">
                <div className="mb-4 border-b border-gray-200 dark:border-white/10 pb-2 flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Respostas do Briefing</h3>
                    <p className="text-sm text-gray-500 mt-1">Informações preenchidas pelo cliente no formulário de onboarding.</p>
                  </div>
                  {formData.onboardingAnswers && (
                    <button
                      type="button"
                      onClick={() => setShowPromptModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 rounded-lg text-xs font-bold transition-all border border-primary-500/20"
                    >
                      <Sparkles size={14} />
                      Gerar Prompt GPT
                    </button>
                  )}
                </div>
                {formData.onboardingAnswers ? (
                  <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                    {Object.entries(formData.onboardingAnswers).map(([questionId, answer]) => {
                      const question = onboardingQuestions.find(q => q.id === questionId);
                      const questionText = question ? question.text : questionId;
                      return (
                        <div key={questionId} className="bg-black/20 border border-white/5 p-4 rounded-xl">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm opacity-80">{questionText}</h4>
                          {question?.type === 'file' && typeof answer === 'string' && answer.startsWith('data:image') ? (
                            <div className="mt-2">
                              <img 
                                src={answer} 
                                alt="Attachment" 
                                className="max-w-full h-auto rounded-lg border border-white/10 max-h-64 object-contain"
                                referrerPolicy="no-referrer"
                              />
                              <a 
                                href={answer} 
                                download={`attachment-${questionId}`}
                                className="inline-flex items-center gap-2 mt-2 text-xs text-primary-500 hover:text-primary-400 font-medium"
                              >
                                <Download size={12} />
                                Baixar Imagem
                              </a>
                            </div>
                          ) : (
                            <p className="text-gray-300 whitespace-pre-wrap">{String(answer)}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <FileText className="text-gray-400" size={32} />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aguardando Respostas</h4>
                    <p className="text-gray-500 max-w-xs">O cliente ainda não preencheu o formulário de briefing enviado.</p>
                  </div>
                )}
              </div>
            ) : activeTab === 'referrals' && initialData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                    <h4 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Status do Programa</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total de Indicações:</span>
                        <span className="text-white font-bold">{initialData.referralCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Bônus Acumulado:</span>
                        <span className="text-emerald-400 font-bold">R$ {(initialData.referralBalance || 0).toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Regras Atuais:</p>
                        <ul className="text-[10px] text-gray-400 space-y-1 list-disc pl-4">
                          <li>Comissão: 25% do valor do plano</li>
                        </ul>
                      </div>
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-xs text-gray-500 mb-2">Link de Indicação do Cliente:</p>
                        <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                          <code className="text-[10px] text-primary-400 truncate flex-1">
                            {`${window.location.origin}/onboarding/${user.uid}?ref=${initialData.id}`}
                          </code>
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/onboarding/${user.uid}?ref=${initialData.id}`);
                              toast.success('Link copiado!');
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                    <h4 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Ações Rápidas</h4>
                    <div className="space-y-3">
                      <button 
                        type="button"
                        onClick={async () => {
                          if (!initialData.asaasCustomerId) {
                            toast.error('Cliente não possui ID do Asaas.');
                            return;
                          }

                          try {
                            // 1. Fetch pending payments from Asaas
                            const res = await fetch(`/api/asaas/payments?customer=${initialData.asaasCustomerId}`);
                            if (!res.ok) throw new Error('Failed to fetch payments');
                            const data = await res.json();
                            const pendingPayment = data.data.find((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE');

                            if (!pendingPayment) {
                              toast.error('Nenhuma fatura pendente encontrada para este cliente.');
                              return;
                            }

                            // 2. Apply bonus
                            const bonusToApply = Math.min(initialData.referralBalance || 0, pendingPayment.value);
                            
                            if (bonusToApply >= pendingPayment.value) {
                              // Mark as paid in cash
                              const receiveRes = await fetch('/api/asaas/receive-in-cash', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ paymentId: pendingPayment.id })
                              });
                              if (!receiveRes.ok) throw new Error('Failed to mark as paid');
                            } else {
                              // Edit value
                              const editRes = await fetch('/api/asaas/edit-payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  paymentId: pendingPayment.id,
                                  value: pendingPayment.value - bonusToApply
                                })
                              });
                              if (!editRes.ok) throw new Error('Failed to edit payment');
                            }

                            // 3. Update client balance in Firestore
                            await updateDoc(doc(db, 'users', user.uid, 'clients', initialData.id), {
                              referralBalance: (initialData.referralBalance || 0) - bonusToApply
                            });

                            toast.success('Bônus aplicado com sucesso na fatura do Asaas!');
                          } catch (err) {
                            console.error("Error applying bonus:", err);
                            toast.error('Erro ao aplicar bônus no Asaas.');
                          }
                        }}
                        disabled={!initialData.referralBalance || initialData.referralBalance <= 0}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl border border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        <DollarSign size={18} />
                        Aplicar Bônus no Asaas
                      </button>
                      <p className="text-[10px] text-gray-500 text-center">
                        Isso irá editar a fatura pendente no Asaas subtraindo o bônus disponível.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                  <h4 className="text-sm font-medium text-gray-400 p-4 bg-white/5 border-b border-white/5 uppercase tracking-wider">Histórico de Indicações</h4>
                  <div className="p-4">
                    <p className="text-sm text-gray-500 text-center py-8">
                      Consulte a aba principal de "Indicações" para ver a lista completa de todos os clientes.
                    </p>
                  </div>
                </div>
              </div>
            ) : activeTab === 'contracts' && initialData ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold border-b border-primary-500/30 pb-2 inline-block text-gray-900 dark:text-white">Contratos e Assinaturas</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Gere links de assinatura de contratos com validade de IP.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewContractForm(!showNewContractForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all font-medium whitespace-nowrap shadow-lg shadow-primary-500/20"
                  >
                    <Plus size={18} />
                    {showNewContractForm ? 'Cancelar' : 'Novo Contrato'}
                  </button>
                </div>

                {showNewContractForm && (
                  <div className="bg-black/20 p-6 rounded-2xl border border-white/10 mb-6 shadow-xl">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Gerar Novo Contrato</h4>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <button
                        type="button"
                        onClick={() => setNewContractType('text')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${newContractType === 'text' ? 'bg-primary-500/20 border-primary-500 text-primary-400' : 'bg-black/40 border-white/5 text-gray-500 hover:bg-black/60'}`}
                      >
                        <FileSignature size={24} />
                        <span className="font-medium">Texto Rico Editável</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewContractType('pdf')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${newContractType === 'pdf' ? 'bg-primary-500/20 border-primary-500 text-primary-400' : 'bg-black/40 border-white/5 text-gray-500 hover:bg-black/60'}`}
                      >
                        <FileUp size={24} />
                        <span className="font-medium">Upload de PDF</span>
                      </button>
                    </div>

                    {newContractType === 'text' ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-400">Edite as cláusulas abaixo para gerar o contrato exclusivo deste lead.</p>
                        <textarea
                          value={newContractText}
                          onChange={(e) => setNewContractText(e.target.value)}
                          className="w-full h-64 px-4 py-3 bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-y custom-scrollbar text-sm font-mono leading-relaxed"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setIsContractUploading(true);
                              const newContract: ClientContract = {
                                id: Date.now().toString(36) + Math.random().toString(36).substring(2),
                                type: 'text',
                                content: newContractText,
                                status: 'pending',
                                createdAt: Date.now()
                              };
                              const updatedContracts = [...(initialData.contracts || []), newContract];
                              await updateDoc(doc(db, 'users', user.uid, 'clients', initialData.id), {
                                contracts: updatedContracts
                              });
                              setFormData(prev => ({ ...prev, contracts: updatedContracts }));
                              toast.success('Contrato gerado com sucesso!');
                              setShowNewContractForm(false);
                            } catch (error) {
                              toast.error('Erro ao gerar contrato.');
                            } finally {
                              setIsContractUploading(false);
                            }
                          }}
                          disabled={isContractUploading}
                          className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all font-medium disabled:opacity-50 flex items-center justify-center"
                        >
                          {isContractUploading ? <Loader2 size={18} className="animate-spin mr-2" /> : <CheckCircle size={18} className="mr-2" />}
                          Gerar Contrato de Texto e Salvar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-400">Faça o upload de um contrato preexistente em formato PDF (Max 5MB).</p>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={async (e) => {
                            if (!e.target.files || !e.target.files[0]) return;
                            const file = e.target.files[0];
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('O PDF deve ter no máximo 5MB');
                              return;
                            }
                            try {
                              setIsContractUploading(true);
                              const fileRef = ref(storage, `users/${user.uid}/clients/${initialData.id}/contracts/${Date.now()}_${file.name}`);
                              const snapshot = await uploadBytesResumable(fileRef, file);
                              const downloadUrl = await getDownloadURL(snapshot.ref);
                              
                              const newContract: ClientContract = {
                                id: Date.now().toString(36) + Math.random().toString(36).substring(2),
                                type: 'pdf',
                                content: downloadUrl,
                                status: 'pending',
                                createdAt: Date.now()
                              };
                              const updatedContracts = [...(initialData.contracts || []), newContract];
                              await updateDoc(doc(db, 'users', user.uid, 'clients', initialData.id), {
                                contracts: updatedContracts
                              });
                              setFormData(prev => ({ ...prev, contracts: updatedContracts }));
                              toast.success('Contrato em PDF carregado!');
                              setShowNewContractForm(false);
                            } catch (error) {
                              console.error(error);
                              toast.error('Erro no upload do PDF. O Storage está configurado corretamente?');
                            } finally {
                              setIsContractUploading(false);
                            }
                          }}
                          disabled={isContractUploading}
                          className="w-full px-4 py-8 border-2 border-dashed border-primary-500/30 rounded-xl bg-black/20 text-center text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-400 hover:file:bg-primary-500/30 transition-all cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {(formData.contracts || []).length === 0 ? (
                    <div className="text-center py-16 bg-black/20 rounded-2xl border border-white/5 shadow-inner">
                      <FileSignature size={48} className="mx-auto text-gray-500 mb-4" />
                      <p className="text-gray-400 font-medium">Nenhum contrato gerado para este cliente.</p>
                      <p className="text-sm text-gray-500 mt-1">Crie um novo contrato para formalizar seu acordo.</p>
                    </div>
                  ) : (
                    [...(formData.contracts || [])].sort((a,b) => b.createdAt - a.createdAt).map(contract => (
                      <div key={contract.id} className="bg-black/20 p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md transition-all hover:bg-black/30">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${contract.status === 'signed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary-500/20 text-primary-400'}`}>
                            {contract.type === 'pdf' ? <FileUp size={24} /> : <FileSignature size={24} />}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              Contrato em {contract.type === 'pdf' ? 'PDF' : 'Texto Base'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${contract.status === 'signed' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-orange-500/20 text-orange-500'}`}>
                                {contract.status === 'signed' ? 'Assinado' : 'Pendente'}
                              </span>
                              <span className="text-xs text-gray-500">
                                Criado em {new Date(contract.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                          {contract.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const url = `${window.location.origin}/contrato/${user.uid}/${initialData.id}/${contract.id}`;
                                navigator.clipboard.writeText(url);
                                toast.success('Link copiado!', { description: 'Envie este link para seu cliente assinar.' });
                              }}
                              className="px-4 py-2 bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                              <LinkIcon size={16} /> Copiar Link Público
                            </button>
                          ) : (
                            <div className="text-right bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 justify-end"><CheckCircle size={12}/> Validado via IP</p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5" title="IP do Assinante">{contract.signedIp}</p>
                            </div>
                          )}
                          <a
                            href={`${window.location.origin}/contrato/${user.uid}/${initialData.id}/${contract.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 text-gray-400 hover:text-white bg-black/40 hover:bg-black/60 rounded-xl transition-colors"
                            title="Visualizar Contrato"
                          >
                            <Eye size={18} />
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('Tem absoluta certeza que deseja excluir permanentemente este contrato?')) return;
                              try {
                                const updated = (initialData.contracts || []).filter(c => c.id !== contract.id);
                                await updateDoc(doc(db, 'users', user.uid, 'clients', initialData.id), {
                                  contracts: updated
                                });
                                setFormData(prev => ({ ...prev, contracts: updated }));
                                toast.success('Contrato excluído com sucesso!');
                              } catch(e) { toast.error('Erro ao excluir contrato') }
                            }}
                            className="p-2.5 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/80 rounded-xl transition-colors"
                            title="Excluir Contrato"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 shrink-0">
            <div className="flex space-x-2">
              {initialData && onDelete ? (
                <button type="button" onClick={() => onDelete(initialData.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-4 py-2 rounded-lg transition-colors flex items-center text-sm font-medium">
                  <Trash2 size={18} className="mr-2" /> Excluir
                </button>
              ) : null}
              {initialData && initialData.status !== 'Cancelado' ? (
                <button type="button" onClick={() => setShowCancelConfirm(true)} className="text-primary-400 hover:text-primary-300 hover:bg-primary-400/10 px-4 py-2 rounded-lg transition-colors flex items-center text-sm font-medium">
                  Cancelar Assinatura
                </button>
              ) : null}
            </div>
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:bg-white/10 transition-colors">Cancelar</button>
              <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-medium bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20 transition-all hover:scale-105 active:scale-95">Salvar Cliente</button>
            </div>
          </div>
        </form>
      </div>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1c23] border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cancelar Assinatura?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Tem certeza que deseja cancelar a assinatura deste cliente? Esta ação não pode ser desfeita e o status será alterado para Cancelado.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setShowCancelConfirm(false)} 
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 transition-all"
              >
                Voltar
              </button>
              <button 
                type="button" 
                onClick={handleCancelSubscription} 
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-gray-900 dark:text-white shadow-lg shadow-red-500/20 transition-all"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPromptModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#1a1c23] border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-xl">
                  <Wand2 className="text-primary-500" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Prompt para GPT</h3>
                  <p className="text-sm text-gray-400">Copie este texto e cole no seu GPT personalizado.</p>
                </div>
              </div>
              <button onClick={() => setShowPromptModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-black/40 border border-white/5 rounded-2xl p-6 custom-scrollbar mb-6">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {generateGPTPrompt()}
              </pre>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowPromptModal(false)}
                className="px-6 py-3 rounded-2xl text-sm font-medium text-gray-400 hover:bg-white/5 transition-all"
              >
                Fechar
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generateGPTPrompt());
                  toast.success("Prompt copiado com sucesso!");
                }}
                className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Copy size={18} />
                Copiar Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

