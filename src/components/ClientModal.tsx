import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, DollarSign, CheckCircle, Clock, MapPin, Phone, Tag, Building2, FileText, Briefcase, AlignLeft,
  Paperclip, Copy, MessageCircle, Trash2, Snowflake, Globe, Image as ImageIcon, Sparkles, Wand2, Star, Zap,
  RefreshCw, Link as LinkIcon, AlertTriangle, TrendingDown, Eye, EyeOff, Edit2, Loader2, Download, FileSignature, FileUp, Mail, Bell, BellOff
} from 'lucide-react';
import { auth, db, storage } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import { authFetch } from '../lib/authFetch';
import { Client, ClientLog, ClientCredential, ClientStage, OnboardingQuestion, Offer, SiteStatus, ClientContract } from '../types';
import { getPlanPrice, getSetupPrice } from '../helpers';
import { useCRM } from '../contexts/CRMContext';
import { useAuth } from '../contexts/AuthContext';

// ── Tab Components ──
import HistoryTab from './client-modal/HistoryTab';
import StagesTab from './client-modal/StagesTab';
import CredentialsTab from './client-modal/CredentialsTab';
import OnboardingTab from './client-modal/OnboardingTab';
import ReferralsTab from './client-modal/ReferralsTab';
import ContractsTab from './client-modal/ContractsTab';

export default
function ClientModal({ isOpen, onClose, onSave, onDelete, initialData, onboardingQuestions, user, offers }: { isOpen: boolean, onClose: () => void, onSave: (data: Partial<Client>) => void, onDelete?: (id: string) => void, initialData: Client | null, onboardingQuestions: OnboardingQuestion[], user: User, offers: Offer[] }) {
  const { userProfile } = useAuth();
  const { defaultContractText, effectiveOrgId } = useCRM();
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
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'stages' | 'credentials' | 'onboarding' | 'contracts' | 'referrals' | 'emails'>('details');
  const [cepLoading, setCepLoading] = useState(false);
  const [cpfCnpjStatus, setCpfCnpjStatus] = useState<'idle' | 'valid' | 'invalid' | 'loading'>('idle');
  const [newLogText, setNewLogText] = useState('');

  const selectedOffer = useMemo(() => {
    return offers.find(o => o.id === formData.offerId) || offers.find(o => o.name === formData.plan);
  }, [offers, formData.offerId, formData.plan]);

  const getNextPaymentDateText = () => {
    if (!formData.recurringPaymentDay) return null;
    const firstPaymentDate = formData.firstPaymentDate || new Date().toISOString().split('T')[0];
    const firstDateObj = new Date(firstPaymentDate + 'T12:00:00Z');
    let nextSubDate = new Date(firstDateObj.getFullYear(), firstDateObj.getMonth(), formData.recurringPaymentDay, 12, 0, 0);
    if (nextSubDate.getTime() <= firstDateObj.getTime()) nextSubDate.setMonth(nextSubDate.getMonth() + 1);
    const diffTime = nextSubDate.getTime() - firstDateObj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays < 15) nextSubDate.setMonth(nextSubDate.getMonth() + 1);
    return `A 2ª cobrança será em: ${nextSubDate.toLocaleDateString('pt-BR')}`;
  };

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
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
      const res = await authFetch(`/api/asaas/subscriptions/${subscriptionId}`);
      if (res.ok) {
        const data = await res.json();
        const payments = data.payments || [];
        const subscription = data.subscription;
        if (payments.length > 0) {
          const latestPayment = payments[0];
          const status = latestPayment.status;
          let newPaymentStatus: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'N/A' = 'PENDING';
          let newSiteStatus: SiteStatus = formData.status || 'Em Desenvolvimento';
          if (status === 'RECEIVED' || status === 'CONFIRMED') { newPaymentStatus = 'RECEIVED'; newSiteStatus = 'Ativo'; }
          else if (status === 'OVERDUE') { newPaymentStatus = 'OVERDUE'; newSiteStatus = 'Inadimplente'; }
          const nextDueDate = subscription?.nextDueDate || formData.nextDueDate;
          setFormData(prev => ({ ...prev, paymentStatus: newPaymentStatus, status: newSiteStatus, nextDueDate: nextDueDate, invoiceUrl: latestPayment.invoiceUrl || prev.invoiceUrl }));
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

  const fetchCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({ ...prev, endereco: data.logradouro || prev.endereco || '', bairro: data.bairro || prev.bairro || '', cidade: data.localidade || prev.cidade || '', estado: data.uf || prev.estado || '' }));
        toast.success('Endereço preenchido automaticamente!');
      } else { toast.error('CEP não encontrado.'); }
    } catch { toast.error('Erro ao buscar CEP.'); }
    finally { setCepLoading(false); }
  };

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
      let v = value.replace(/\D/g, '');
      if (v.length > 11) v = v.substring(0, 11);
      if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
      if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
      setFormData(prev => ({ ...prev, [name]: v }));
    } else if (name === 'cpfCnpj') {
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
      let v = value.replace(/\D/g, '');
      if (v.length > 8) v = v.substring(0, 8);
      if (v.length > 5) v = v.substring(0, 5) + '-' + v.substring(5);
      setFormData(prev => ({ ...prev, [name]: v }));
      if (v.replace(/\D/g, '').length === 8) fetchCep(v);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // ─── Tab Buttons ───
  const tabButtons = [
    { key: 'details', label: 'Dados' },
    { key: 'history', label: 'Histórico' },
    { key: 'stages', label: 'Etapas' },
    { key: 'credentials', label: 'Credenciais' },
    { key: 'onboarding', label: 'Briefing' },
    { key: 'referrals', label: 'Indicações' },
    { key: 'contracts', label: 'Contratos' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-3xl rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col border border-gray-300 dark:border-white/20 overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 shrink-0">
          <div className="flex items-center space-x-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{initialData ? 'Detalhes do Cliente' : 'Novo Cliente'}</h2>
            {initialData && (
              <div className="flex space-x-2 bg-black/20 p-1 rounded-xl border border-white/5">
                {tabButtons.map(tab => (
                  <button 
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
                  >
                    {tab.label}
                  </button>
                ))}
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
                        <button key={offer.id} type="button" onClick={() => setFormData(prev => ({ ...prev, offerId: offer.id, plan: offer.name, planPrice: offer.price, setupPrice: offer.setupPrice, maxInstallments: offer.maxInstallments || prev.maxInstallments, billingCycle: offer.type === 'SINGLE' ? undefined : (prev.billingCycle || 'MONTHLY') }))}
                          className={`p-4 rounded-xl border text-left transition-all ${formData.offerId === offer.id || (!formData.offerId && formData.plan === offer.name) ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}>
                          <div className="font-semibold mb-1">{offer.name}</div>
                          {offer.type === 'SUBSCRIPTION' ? (
                            <><div className="text-xs opacity-80">Setup: R$ {(offer.setupPrice || 0).toLocaleString('pt-BR')}</div>
                            <div className="text-sm font-bold mt-1">R$ {(offer.price || 0).toLocaleString('pt-BR')}/mês</div></>
                          ) : (
                            <><div className="text-xs opacity-80">Pagamento Único</div>
                            <div className="text-sm font-bold mt-1">R$ {((offer.price || 0) + (offer.setupPrice || 0)).toLocaleString('pt-BR')}</div></>
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
                          <input type="date" name="firstPaymentDate" value={formData.firstPaymentDate || new Date().toISOString().split('T')[0]} onChange={handleChange} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                          <p className="text-xs text-gray-500 mt-1">Data da primeira cobrança (padrão: hoje)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Dia de Vencimento (Próximos Meses)</label>
                          <input type="number" min="1" max="31" name="recurringPaymentDay" value={formData.recurringPaymentDay || ''} onChange={(e) => setFormData(prev => ({ ...prev, recurringPaymentDay: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="Ex: 15" className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                          <p className="text-xs text-gray-500 mt-1">
                            {getNextPaymentDateText() ? <span className="text-primary-500 dark:text-primary-400 font-medium">{getNextPaymentDateText()}</span> : "Opcional. Se vazio, será o mesmo dia do primeiro pagamento."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Ciclo de Cobrança *</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, billingCycle: 'MONTHLY', isCombo: false }))}
                            className={`p-4 rounded-xl border text-center transition-all ${formData.billingCycle === 'MONTHLY' || !formData.billingCycle ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}>
                            <div className="font-semibold text-sm">Mensal</div>
                          </button>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, billingCycle: 'YEARLY' }))}
                            className={`p-4 rounded-xl border text-center transition-all ${formData.billingCycle === 'YEARLY' ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}>
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
                                <input type="checkbox" className="sr-only peer" checked={formData.isCombo || false} onChange={(e) => setFormData(prev => ({ ...prev, isCombo: e.target.checked, billingType: e.target.checked ? 'CREDIT_CARD' : prev.billingType }))} />
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
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, billingType: 'PIX' }))} className={`p-4 rounded-xl border text-center transition-all ${formData.billingType === 'PIX' ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}>
                        <div className="font-semibold text-[10px] uppercase tracking-wider">Apenas PIX</div>
                      </button>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, billingType: 'CREDIT_CARD' }))} className={`p-4 rounded-xl border text-center transition-all ${formData.billingType === 'CREDIT_CARD' ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}>
                        <div className="font-semibold text-[10px] uppercase tracking-wider">Apenas Cartão</div>
                      </button>
                      <button type="button" disabled={selectedOffer?.type === 'SINGLE'} onClick={() => setFormData(prev => ({ ...prev, billingType: undefined }))} className={`p-4 rounded-xl border text-center transition-all ${!formData.billingType ? 'bg-primary-500/20 border-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20' : 'bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'} ${selectedOffer?.type === 'SINGLE' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className="font-semibold text-[10px] uppercase tracking-wider">Cliente Escolhe</div>
                      </button>
                    </div>
                  </div>

                  {(formData.isCombo || selectedOffer?.type === 'SINGLE') && (formData.billingType === 'CREDIT_CARD' || !formData.billingType) && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Máximo de Parcelas (Cartão de Crédito)</label>
                      <select value={formData.maxInstallments || 12} onChange={(e) => setFormData(prev => ({ ...prev, maxInstallments: Number(e.target.value) }))}
                        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all">
                        {Array.from({ length: selectedOffer?.maxInstallments || 12 }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num} className="bg-white dark:bg-gray-900">{num === 1 ? 'À vista (1x)' : `Até ${num}x`}</option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">O cliente poderá escolher no checkout parcelar em até {formData.maxInstallments || 12} vezes.</p>
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
                        {formData.status === 'Ativo' ? '🟢 Ativo' : formData.status === 'Cancelado' ? '⚫ Cancelado' : formData.status === 'Inadimplente' ? '🔴 Inadimplente' : '🟡 Em Desenvolvimento'}
                      </span>
                      {isCheckingPayment && <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">Verificando pagamento...</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Data Prevista de Entrega</label>
                    <input type="date" name="deliveryDate" value={formData.deliveryDate || ''} onChange={handleChange} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
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
                          {window.location.origin}/onboarding/{effectiveOrgId}/{initialData.id}
                        </div>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/onboarding/${effectiveOrgId}/${initialData.id}`); toast.success('Link copiado!'); }}
                          className="p-3 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-xl transition-colors shrink-0" title="Copiar Link">
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
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${formData.npsScore >= 9 ? 'bg-emerald-500/20 text-emerald-500' : formData.npsScore >= 7 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'}`}>
                          {formData.npsScore}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">{formData.npsScore >= 9 ? 'Promotor' : formData.npsScore >= 7 ? 'Passivo' : 'Detrator'}</p>
                          {formData.npsComment && <p className="text-xs text-gray-500 italic mt-1 leading-relaxed">"{formData.npsComment}"</p>}
                          {formData.npsSubmittedAt && <p className="text-[10px] text-gray-400 mt-1">Recebido em: {new Date(formData.npsSubmittedAt.toMillis ? formData.npsSubmittedAt.toMillis() : formData.npsSubmittedAt).toLocaleDateString('pt-BR')}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'history' ? (
              <HistoryTab logs={formData.logs || []} newLogText={newLogText} setNewLogText={setNewLogText} setFormData={setFormData} />
            ) : activeTab === 'stages' ? (
              <StagesTab stages={formData.stages || []} setFormData={setFormData} />
            ) : activeTab === 'credentials' && initialData ? (
              <CredentialsTab clientId={initialData.id} />
            ) : activeTab === 'onboarding' ? (
              <OnboardingTab onboardingAnswers={formData.onboardingAnswers} onboardingQuestions={onboardingQuestions} />
            ) : activeTab === 'referrals' && initialData ? (
              <ReferralsTab client={initialData} user={user} />
            ) : activeTab === 'contracts' && initialData ? (
              <ContractsTab client={initialData} user={user} formData={formData} setFormData={setFormData} defaultContractText={defaultContractText} />
            ) : null}
          </div>

          <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 shrink-0">
            <div className="flex space-x-2">
              {initialData && onDelete && (userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente') ? (
                <button type="button" onClick={() => onDelete(initialData.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-4 py-2 rounded-lg transition-colors flex items-center text-sm font-medium">
                  <Trash2 size={18} className="mr-2" /> Excluir
                </button>
              ) : null}
              {initialData && initialData.status !== 'Cancelado' && (userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente') ? (
                <button type="button" onClick={() => setShowCancelConfirm(true)} className="text-primary-400 hover:text-primary-300 hover:bg-primary-400/10 px-4 py-2 rounded-lg transition-colors flex items-center text-sm font-medium">
                  Cancelar Assinatura
                </button>
              ) : null}
            </div>
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:bg-white/10 transition-colors">Cancelar</button>
              {userProfile?.role !== 'Só Leitura' && (
                <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-medium bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20 transition-all hover:scale-105 active:scale-95">Salvar Cliente</button>
              )}
            </div>
          </div>
        </form>
      </div>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1c23] border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cancelar Assinatura?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Tem certeza que deseja cancelar a assinatura deste cliente? Esta ação não pode ser desfeita e o status será alterado para Cancelado.</p>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={() => setShowCancelConfirm(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 transition-all">Voltar</button>
              <button type="button" onClick={handleCancelSubscription} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-gray-900 dark:text-white shadow-lg shadow-red-500/20 transition-all">Sim, Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
