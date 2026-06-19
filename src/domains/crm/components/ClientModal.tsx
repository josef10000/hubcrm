import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, DollarSign, CheckCircle, Clock, MapPin, Phone, Tag, Building2, FileText, Briefcase, AlignLeft,
  Paperclip, Copy, MessageCircle, Trash2, Snowflake, Globe, Image as ImageIcon, Sparkles, Wand2, Star, Zap,
  RefreshCw, Link as LinkIcon, AlertTriangle, TrendingDown, Eye, EyeOff, Edit2, Loader2, Download, FileSignature, FileUp, Mail, Bell, BellOff, Key, Shield
} from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { collection, doc, setDoc, onSnapshot, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import { authFetch } from '@/lib/authFetch';
import { Client, ClientLog, ClientCredential, ClientStage, OnboardingQuestion, Offer, SiteStatus, ClientContract } from '@/types';
import { getPlanPrice, getSetupPrice } from '@/helpers';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { Tag as LucideTag } from 'lucide-react';
// Elementos de formulários nativos são usados para evitar problemas de tipos do HeroUI


// ── Tab Components ──
import HistoryTab from './client-modal/HistoryTab';
import StagesTab from './client-modal/StagesTab';
import CredentialsTab from './client-modal/CredentialsTab';
import OnboardingTab from './client-modal/OnboardingTab';
import ReferralsTab from './client-modal/ReferralsTab';
import ContractsTab from './client-modal/ContractsTab';
import PlansTab from './client-modal/PlansTab';
import PurchasesTab from './client-modal/PurchasesTab';
import BrandAssetsTab from './client-modal/BrandAssetsTab';

export default
function ClientModal({ 
  isOpen, onClose, onSave, onDelete, initialData, onboardingQuestions, user, offers,
  teamProfiles = [], orgRoles = []
}: { 
  isOpen: boolean, onClose: () => void, onSave: (data: Partial<Client>) => void, 
  onDelete?: (id: string) => void, initialData: Client | null, 
  onboardingQuestions: OnboardingQuestion[], user: User, offers: Offer[],
  teamProfiles?: any[], orgRoles?: any[]
}) {
  const { userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const { defaultContractText, effectiveOrgId, tags } = useCRM();
  const activeOffers = offers.filter(o => o.active);
  const defaultOffer = activeOffers.length > 0 ? activeOffers[0] : null;

  const availableSellers = useMemo(() => {
    const list = [...teamProfiles];
    if (userProfile && !list.find(p => p.uid === userProfile.uid)) {
      list.push({
        uid: userProfile.uid,
        displayName: userProfile.displayName || userProfile.email,
        role: userProfile.role || 'Admin',
        roleId: userProfile.roleId
      });
    }
    return list.filter(p => {
      if (p.uid === userProfile?.uid) return true;
      const role = orgRoles.find(r => r.id === p.roleId || r.name === p.role);
      return role?.permissions?.includes('MANAGE_LEADS') || p.role === 'Vendedor';
    });
  }, [teamProfiles, userProfile, orgRoles]);

  const [formData, setFormData] = useState<Partial<Client>>({ 
    plan: defaultOffer?.name || 'Essencial',
    offerId: defaultOffer?.id,
    planPrice: defaultOffer?.price ?? 397,
    setupPrice: defaultOffer?.setupPrice ?? 2500,
    status: 'Em Desenvolvimento',
    isCombo: false,
    maxInstallments: defaultOffer?.maxInstallments ?? 12,
    billingType: undefined
  });
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'stages' | 'credentials' | 'onboarding' | 'contracts' | 'referrals' | 'emails' | 'plans' | 'purchases' | 'brandAssets'>('details');
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
    if (!formData.isCourtesy && !formData.offerId && !formData.plan) {
      toast.error("Por favor, selecione uma Oferta / Produto.");
      return;
    }
    onSave(formData);
    onClose();
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
      // Bloquear links do portal sendo salvos como links de pagamento
      if (name === 'invoiceUrl' || name === 'paymentLink') {
        const isPortalLink = (value as string)?.includes('/portal/') || (value as string)?.includes(window.location.origin);
        if (isPortalLink) {
          toast.error("O link do portal não pode ser usado como link de pagamento.");
          return;
        }
      }
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
    { key: 'plans', label: 'Assinaturas' },
    { key: 'purchases', label: 'Compras' },
    { key: 'brandAssets', label: 'Cofre da Marca' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-3xl rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col border border-gray-300 dark:border-white/20 overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 shrink-0">
          <div className="flex items-center space-x-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{initialData ? 'Detalhes do Cliente' : 'Novo Cliente'}</h2>
            {initialData && (
              <div className="flex space-x-2 bg-black/20 p-1 rounded-xl border border-white/5 overflow-x-auto scrollbar-hide max-w-[280px] sm:max-w-md md:max-w-lg lg:max-w-xl">
                {tabButtons.map(tab => (
                  <button 
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${activeTab === tab.key ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}
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
                  
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nome do Cliente/Empresa *</label>
                    <input required type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" placeholder="Ex: João Silva" />
                  </div>
                  
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">WhatsApp {!formData.isCourtesy ? '*' : ''}</label>
                    <input required={!formData.isCourtesy} type="text" name="whatsapp" value={formData.whatsapp || ''} onChange={handleChange} placeholder="(11) 99999-9999" className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                  </div>

                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">CPF/CNPJ {!formData.isCourtesy ? '*' : ''}</label>
                    <div className="relative">
                      <input required={!formData.isCourtesy} type="text" name="cpfCnpj" value={formData.cpfCnpj || ''} onChange={handleChange} onBlur={handleCpfCnpjBlur} placeholder="999.999.999-99" className={`w-full px-4 py-3 pr-10 bg-black/20 border text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500 ${cpfCnpjStatus === 'valid' ? 'border-emerald-500' : cpfCnpjStatus === 'invalid' ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`} />
                      {cpfCnpjStatus === 'loading' && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                      {cpfCnpjStatus === 'valid' && <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                      {cpfCnpjStatus === 'invalid' && <X size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />}
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">E-mail {!formData.isCourtesy ? '*' : ''}</label>
                    <input required={!formData.isCourtesy} type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="cliente@email.com" className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                  </div>

                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">CEP</label>
                    <div className="relative">
                      <input type="text" name="cep" value={formData.cep || ''} onChange={handleChange} placeholder="00000-000" className="w-full px-4 py-3 pr-10 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                      {cepLoading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 animate-spin" />}
                    </div>
                  </div>

                  <div className="w-full">
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
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Origem do Lead {!formData.isCourtesy ? '*' : ''}</label>
                    <select 
                      name="leadSource"
                      value={formData.leadSource || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, leadSource: e.target.value as Client['leadSource'] }))}
                      className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm appearance-none"
                    >
                      <option value="" disabled className="bg-gray-200 dark:bg-zinc-950 text-gray-500">Selecione a origem</option>
                      <option value="Indicação" className="bg-gray-200 dark:bg-zinc-950 text-gray-900 dark:text-white">Indicação</option>
                      <option value="Google Ads" className="bg-gray-200 dark:bg-zinc-950 text-gray-900 dark:text-white">Google Ads</option>
                      <option value="Tráfego Orgânico" className="bg-gray-200 dark:bg-zinc-950 text-gray-900 dark:text-white">Tráfego Orgânico</option>
                      <option value="Prospecção Manual" className="bg-gray-200 dark:bg-zinc-950 text-gray-900 dark:text-white">Prospecção Manual</option>
                      <option value="Instagram" className="bg-gray-200 dark:bg-zinc-950 text-gray-900 dark:text-white">Instagram</option>
                      <option value="WhatsApp Direto" className="bg-gray-200 dark:bg-zinc-950 text-gray-900 dark:text-white">WhatsApp Direto</option>
                      <option value="Parceiro" className="bg-gray-200 dark:bg-zinc-950 text-gray-900 dark:text-white">Parceiro</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Responsável / Vendedor {!formData.isCourtesy ? '*' : ''}</label>
                    <select 
                      name="assignedTo"
                      value={formData.assignedTo || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm appearance-none"
                    >
                      <option value="" disabled className="bg-gray-200 dark:bg-zinc-950 text-gray-500">Selecione o responsável</option>
                      {availableSellers.map(member => (
                        <option key={member.uid} value={member.uid} className="bg-gray-200 dark:bg-zinc-950 text-gray-900 dark:text-white">
                          {member.uid === userProfile?.uid ? `Eu mesmo (${member.displayName})` : member.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-8 mb-4 border-b border-gray-200 dark:border-white/10 pb-2">Configurações de Pagamento</h3>

                  {/* Cliente Cortesia Switch */}
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 mt-0.5">
                          <Star size={16} className="fill-purple-400" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-purple-400">Cliente Cortesia / VIP</span>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">Acesso livre isento de cobranças e faturas no Asaas</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isCourtesy || false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setFormData(prev => ({ 
                              ...prev, 
                              isCourtesy: val, 
                              status: val ? 'Ativo' : prev.status,
                              paymentStatus: val ? 'N/A' : 'PENDING',
                              ...(val ? {
                                plan: 'Isento / VIP',
                                offerId: 'vip',
                                planPrice: 0,
                                setupPrice: 0,
                                customMonthlyPrice: 0,
                                customSetupPrice: 0,
                                billingCycle: undefined,
                                billingType: 'UNDEFINED'
                              } : {
                                plan: prev.plan === 'Isento / VIP' ? '' : prev.plan,
                                offerId: prev.offerId === 'vip' ? '' : prev.offerId,
                                planPrice: prev.planPrice === 0 ? undefined : prev.planPrice,
                                setupPrice: prev.setupPrice === 0 ? undefined : prev.setupPrice,
                                customMonthlyPrice: undefined,
                                customSetupPrice: undefined
                              })
                            }));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                  </div>

                  {!formData.isCourtesy ? (
                    <>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10">
                          <div className="md:col-span-2">
                             <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-3">Valores Customizados (Opcional)</p>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Mensalidade Customizada</label>
                            <div className="relative">
                              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                type="number" 
                                name="customMonthlyPrice" 
                                value={formData.customMonthlyPrice || ''} 
                                onChange={handleChange} 
                                placeholder="Ex: 450.00"
                                className="w-full pl-9 pr-4 py-2.5 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm" 
                              />
                            </div>
                            <p className="text-[9px] text-gray-500 mt-1 italic">Sobrescreve o valor padrão da oferta</p>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Setup Customizado</label>
                            <div className="relative">
                              <Zap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                type="number" 
                                name="customSetupPrice" 
                                value={formData.customSetupPrice || ''} 
                                onChange={handleChange} 
                                placeholder="Ex: 1500.00"
                                className="w-full pl-9 pr-4 py-2.5 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm" 
                              />
                            </div>
                            <p className="text-[9px] text-gray-500 mt-1 italic">Sobrescreve a taxa de ativação</p>
                          </div>
                        </div>
                      )}

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
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-sm font-bold text-emerald-400">Pagamento Combo (Setup + Anual)</span>
                                    <p className="text-[10px] text-gray-400">Permite parcelar o valor total no cartão</p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={formData.isCombo || false}
                                      onChange={(e) => setFormData(prev => ({ ...prev, isCombo: e.target.checked, billingType: e.target.checked ? 'CREDIT_CARD' : prev.billingType }))}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                  </label>
                                </div>
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
                          <select 
                            name="maxInstallments"
                            value={String(formData.maxInstallments || 12)}
                            onChange={(e) => setFormData(prev => ({ ...prev, maxInstallments: Number(e.target.value) }))}
                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm appearance-none"
                          >
                            {Array.from({ length: selectedOffer?.maxInstallments || 12 }, (_, i) => i + 1).map(num => (
                              <option key={num} value={String(num)} className="bg-white dark:bg-zinc-950 text-gray-900 dark:text-white">
                                {num === 1 ? 'À vista (1x)' : `Até ${num}x`}
                              </option>
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
                    </>
                  ) : (
                    <div className="p-5 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex items-start gap-3 mt-4">
                      <Star size={18} className="text-purple-400 fill-purple-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Acesso VIP Ativo</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">Este cliente possui isenção total de cobranças recorrentes e taxas. Nenhuma fatura será emitida no Asaas e todas as funcionalidades do Portal do Cliente estarão liberadas sem bloqueios.</p>
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

                  {/* 🌐 Portal do Cliente Configs */}
                  {formData.id && (
                    <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe size={18} className="text-primary-400" />
                        <span className="text-sm font-bold text-gray-950 dark:text-white">Portal do Cliente</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/35 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                          <span className="text-[9px] text-gray-500 uppercase font-black block mb-0.5">Código de Ativação</span>
                          <span className="text-xs font-mono font-bold text-primary-400">{formData.portalActivationCode || 'HUB-Pendente'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (formData.portalActivationCode) {
                              navigator.clipboard.writeText(formData.portalActivationCode);
                              toast.success('Código de ativação copiado!');
                            }
                          }}
                          disabled={!formData.portalActivationCode}
                          className="flex items-center justify-center gap-2 bg-primary-500/20 hover:bg-primary-500/35 border border-primary-500/30 text-primary-400 font-bold rounded-xl text-xs uppercase transition-all py-3.5"
                        >
                          <Copy size={14} />
                          Copiar Código
                        </button>
                      </div>

                      {formData.portalLinked ? (
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                          <span>Portal Ativado por: <strong>{formData.portalEmail}</strong></span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-yellow-400 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-xl">
                          <AlertTriangle size={14} className="shrink-0 text-yellow-400" />
                          <span>Aguardando ativação pelo cliente.</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Data Prevista de Entrega</label>
                    <input type="date" name="deliveryDate" value={formData.deliveryDate || ''} onChange={handleChange} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                    <p className="text-xs text-gray-500 mt-1">Data em que o site deve ser entregue ao cliente</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Nicho / Área de Atuação</label>
                    <input type="text" name="niche" value={formData.niche || ''} onChange={handleChange} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" placeholder="Ex: Advogado, Clínica, E-commerce..." />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Tags / Etiquetas</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => {
                        const isSelected = (formData.tagIds || []).includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              const currentTags = formData.tagIds || [];
                              const newTags = isSelected
                                ? currentTags.filter(id => id !== tag.id)
                                : [...currentTags, tag.id];
                              setFormData({ ...formData, tagIds: newTags });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                              isSelected 
                                ? 'bg-primary-500/20 text-white' 
                                : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/10'
                            }`}
                            style={isSelected ? { borderColor: tag.color, backgroundColor: tag.color + '20', color: tag.color } : {}}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                      {tags.length === 0 && (
                        <p className="text-[10px] text-gray-500 italic">Cadastre tags nas configurações.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Link do Site (Opcional)</label>
                    <input type="url" name="siteLink" value={formData.siteLink || ''} onChange={handleChange} placeholder="https://..." className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500" />
                  </div>

                  {formData.siteLink && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const scriptTag = `<script src="${window.location.origin}/api/site-shield"></script>`;
                          navigator.clipboard.writeText(scriptTag);
                          toast.success('Script Site Shield copiado!');
                        }}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium transition-all"
                      >
                        <Shield size={16} />
                        Copiar Script Site Shield
                      </button>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Insira este código na tag <code>&lt;head&gt;</code> do site do cliente para ativação do bloqueio automático por atraso.
                      </p>
                    </div>
                  )}

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
            ) : activeTab === 'plans' ? (
              <PlansTab client={formData as Client} orgId={effectiveOrgId} />
            ) : activeTab === 'purchases' ? (
              <PurchasesTab client={formData as Client} />
            ) : activeTab === 'stages' ? (
              <StagesTab stages={formData.stages || []} setFormData={setFormData} />
            ) : activeTab === 'credentials' && initialData ? (
              <CredentialsTab clientId={initialData.id} />
            ) : activeTab === 'onboarding' ? (
              <OnboardingTab onboardingAnswers={formData.onboardingAnswers} onboardingQuestions={onboardingQuestions} />
            ) : activeTab === 'referrals' && initialData ? (
              <ReferralsTab client={initialData} user={user} />
            ) : activeTab === 'contracts' && initialData ? (
              <ContractsTab client={initialData} user={user} formData={formData} setFormData={setFormData} defaultContractText={defaultContractText} orgId={effectiveOrgId} />
            ) : activeTab === 'brandAssets' ? (
              <BrandAssetsTab client={formData} setFormData={setFormData} />
            ) : null}
          </div>

          <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 shrink-0">
            <div className="flex space-x-2">
              {initialData && onDelete && hasPermission('MANAGE_CLIENTS') ? (
                <button type="button" onClick={() => { onDelete(initialData.id); onClose(); }} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-4 py-2 rounded-lg transition-colors flex items-center text-sm font-medium">
                  <Trash2 size={18} className="mr-2" /> Excluir
                </button>
              ) : null}
              {initialData && initialData.status !== 'Cancelado' && hasPermission('MANAGE_CLIENTS') ? (
                <button type="button" onClick={() => setShowCancelConfirm(true)} className="text-primary-400 hover:text-primary-300 hover:bg-primary-400/10 px-4 py-2 rounded-lg transition-colors flex items-center text-sm font-medium">
                  Cancelar Assinatura
                </button>
              ) : null}
            </div>
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:bg-white/10 transition-colors">Cancelar</button>
              {hasPermission('MANAGE_CLIENTS') && (
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
