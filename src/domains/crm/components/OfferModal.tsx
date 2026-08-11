import React, { useState, useEffect } from 'react';
import { 
  X, Star, Upload, Palette, Check, Sparkles, Loader2, 
  ShieldCheck, Lock, CreditCard, QrCode, UserCheck, Plus, Trash2, 
  Eye, MessageSquare, Award
} from 'lucide-react';
import { Offer, TestimonialItem } from '@/types';
import { uploadToR2 } from '@/lib/r2';
import { toast } from 'sonner';

export default function OfferModal({ isOpen, onClose, onSave, onDelete, initialData }: { isOpen: boolean, onClose: () => void, onSave: (data: Partial<Offer>) => void, onDelete?: (id: string) => void, initialData: Partial<Offer> | null }) {
  const [formData, setFormData] = useState<Partial<Offer>>({
    name: '',
    type: 'SUBSCRIPTION',
    displayContext: 'PORTAL',
    price: 0,
    setupPrice: 0,
    maxInstallments: 12,
    order: 0,
    description: '',
    active: true,
    commissionValue: 0,
    logoUrl: '',
    accentColor: '#f97316',
    benefits: [],
    customContractText: '',
    hasPortalAccess: true,
    guaranteeText: 'Garantia Incondicional de 7 Dias',
    testimonials: []
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [benefitsInput, setBenefitsInput] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'testimonials'>('general');
  const [uploadingAvatarId, setUploadingAvatarId] = useState<string | null>(null);

  useEffect(() => {
    setErrorMsg('');
    if (initialData) {
      setFormData({
        ...initialData,
        commissionValue: initialData.commissionValue || 0,
        logoUrl: initialData.logoUrl || '',
        accentColor: initialData.accentColor || '#f97316',
        benefits: initialData.benefits || [],
        customContractText: initialData.customContractText || '',
        hasPortalAccess: initialData.hasPortalAccess !== undefined ? initialData.hasPortalAccess : true,
        guaranteeText: initialData.guaranteeText || 'Garantia Incondicional de 7 Dias',
        testimonials: initialData.testimonials || []
      });
      setBenefitsInput(initialData.benefits ? initialData.benefits.join('\n') : '');
    } else {
      setFormData({
        name: '',
        type: 'SUBSCRIPTION',
        displayContext: 'PORTAL',
        price: 0,
        setupPrice: 0,
        maxInstallments: 12,
        order: 0,
        description: '',
        active: true,
        commissionValue: 0,
        logoUrl: '',
        accentColor: '#f97316',
        benefits: [],
        customContractText: '',
        hasPortalAccess: true,
        guaranteeText: 'Garantia Incondicional de 7 Dias',
        testimonials: []
      });
      setBenefitsInput('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setErrorMsg('');
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const url = await uploadToR2(file, 'checkout_logos');
      setFormData(prev => ({ ...prev, logoUrl: url }));
      toast.success('Logo enviada e salva no Cloudflare R2!');
    } catch (err: any) {
      toast.error('Erro ao enviar imagem da logo para o Cloudflare R2.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAddTestimonial = () => {
    const newTestimonial: TestimonialItem = {
      id: `t_${Date.now()}`,
      name: 'Cliente Satisfeito',
      roleCompany: 'CEO / Empresário',
      rating: 5,
      comment: 'Excelente solução! Otimizou nossa operação em poucos dias.'
    };
    setFormData(prev => ({
      ...prev,
      testimonials: [...(prev.testimonials || []), newTestimonial]
    }));
  };

  const handleRemoveTestimonial = (id: string) => {
    setFormData(prev => ({
      ...prev,
      testimonials: (prev.testimonials || []).filter(t => t.id !== id)
    }));
  };

  const handleTestimonialChange = (id: string, field: keyof TestimonialItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      testimonials: (prev.testimonials || []).map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const handleAvatarUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatarId(id);
    try {
      const url = await uploadToR2(file, 'checkout_testimonials');
      handleTestimonialChange(id, 'avatarUrl', url);
      toast.success('Foto do depoimento salva no Cloudflare R2!');
    } catch (err) {
      toast.error('Erro ao subir foto do depoimento para o R2.');
    } finally {
      setUploadingAvatarId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de campos obrigatórios
    if (!formData.name?.trim()) return setErrorMsg('Nome é obrigatório.');
    if (!formData.description?.trim()) return setErrorMsg('Descrição é obrigatória.');
    if (formData.price === undefined || formData.price === null) return setErrorMsg('Preço é obrigatório.');
    if (formData.order === undefined || formData.order === null) return setErrorMsg('Ordem de exibição é obrigatória.');
    
    const parsedBenefits = benefitsInput
      .split('\n')
      .map(b => b.trim())
      .filter(Boolean);

    onSave({
      ...formData,
      benefits: parsedBenefits
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-6" onClick={onClose}>
      <div className="bg-[#0b0f19] text-white w-full max-w-6xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-500/20 text-primary-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {initialData?.id ? 'Editar Produto & Página de Pagamento' : 'Novo Produto & Página de Pagamento'}
              </h2>
              <p className="text-xs text-gray-400">Configure o produto, identidade visual R2 e veja o preview em tempo real</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"><X size={20} /></button>
        </div>

        {/* Modal Body - 2 Columns (Split-View) */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* LADO ESQUERDO: Formulário com Abas */}
          <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col overflow-hidden bg-black/20">
            {/* Navegação de Abas */}
            <div className="flex border-b border-white/10 bg-white/5 p-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'general' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <Sparkles size={14} />
                <span>Dados Principais</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('branding')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'branding' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <Palette size={14} />
                <span>Branding & R2</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('testimonials')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'testimonials' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <MessageSquare size={14} />
                <span>Depoimentos ({formData.testimonials?.length || 0})</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} id="offer-form" className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              {/* ABA 1: DADOS PRINCIPAIS */}
              {activeTab === 'general' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Nome do Produto / Oferta *</label>
                    <input 
                      type="text" 
                      name="name" 
                      required
                      value={formData.name || ''} 
                      onChange={handleChange} 
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                      placeholder="Ex: SaaS de Cobrança Interna"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Tipo de Cobrança *</label>
                      <select 
                        name="type" 
                        required
                        value={formData.type || 'SUBSCRIPTION'} 
                        onChange={handleChange} 
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="SUBSCRIPTION">Assinatura Recorrente</option>
                        <option value="SINGLE">Pagamento Único (Avulso)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Contexto de Exibição *</label>
                      <select 
                        name="displayContext" 
                        required
                        value={formData.displayContext || 'PORTAL'} 
                        onChange={handleChange} 
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="PORTAL">Apenas CRM / Interno (Manual)</option>
                        <option value="CHECKOUT">Apenas Página de Pagamento</option>
                        <option value="BOTH">Ambos (CRM e Página de Pagamento)</option>
                      </select>
                    </div>
                  </div>

                  {/* Chave de Acesso ao Portal (Venda Avulsa Sem Portal) */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className={formData.hasPortalAccess ? 'text-emerald-400' : 'text-amber-400'} />
                        <span className="text-xs font-bold text-white">Requer Acesso ao Portal do Cliente?</span>
                      </div>
                      <input 
                        type="checkbox"
                        id="hasPortalAccess"
                        name="hasPortalAccess"
                        checked={formData.hasPortalAccess !== false}
                        onChange={(e) => setFormData(prev => ({ ...prev, hasPortalAccess: e.target.checked }))}
                        className="w-5 h-5 rounded border-white/10 text-primary-500 focus:ring-primary-500 bg-black/40 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {formData.hasPortalAccess !== false 
                        ? '🟢 Assinatura/SaaS: Gera usuário e envia acesso ao Portal após a compra.' 
                        : '⚪ Venda Avulsa / Serviço Único: Apenas registra a venda no CRM e cobra no Asaas (NÃO cria usuário no Portal).'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Preço (R$) *</label>
                      <input 
                        type="number" 
                        name="price" 
                        required
                        min="0"
                        step="0.01"
                        value={formData.price} 
                        onChange={handleChange} 
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Ordem de Exibição *</label>
                      <input 
                        type="number" 
                        name="order" 
                        required
                        value={formData.order} 
                        onChange={handleChange} 
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {formData.type === 'SUBSCRIPTION' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Taxa de Setup (R$)</label>
                      <input 
                        type="number" 
                        name="setupPrice" 
                        min="0"
                        step="0.01"
                        value={formData.setupPrice} 
                        onChange={handleChange} 
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500" 
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Descrição Curta *</label>
                    <textarea 
                      name="description" 
                      required
                      value={formData.description || ''} 
                      onChange={handleChange} 
                      rows={2}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 resize-none" 
                      placeholder="Resumo do produto exibido nos cards..."
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input 
                      type="checkbox" 
                      id="isMostHired"
                      name="isMostHired" 
                      checked={formData.isMostHired || false} 
                      onChange={handleChange as any} 
                      className="w-4 h-4 rounded border-white/10 text-amber-500 focus:ring-amber-500 bg-black/40"
                    />
                    <label htmlFor="isMostHired" className="text-xs font-medium text-amber-400 flex items-center gap-1.5 cursor-pointer">
                      <Star size={14} fill="currentColor" />
                      Marcar como MAIS CONTRATADO (Destaque em Amarelo)
                    </label>
                  </div>
                </div>
              )}

              {/* ABA 2: BRANDING & CLOUDFLARE R2 */}
              {activeTab === 'branding' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Upload de Logo para Cloudflare R2 */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                        <Upload size={14} className="text-primary-400" />
                        Logo do Produto (Salvo no Cloudflare R2)
                      </label>
                      <span className="text-[10px] bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full font-semibold">R2 Storage</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {formData.logoUrl ? (
                        <div className="relative w-14 h-14 bg-black/60 border border-white/20 rounded-xl flex items-center justify-center p-2 group overflow-hidden">
                          <img src={formData.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                            className="absolute inset-0 bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                          >
                            Remover
                          </button>
                        </div>
                      ) : null}

                      <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black/40 border border-dashed border-white/20 hover:border-primary-500 rounded-xl cursor-pointer transition-colors text-xs font-medium text-gray-300">
                        {uploadingLogo ? <Loader2 size={16} className="animate-spin text-primary-500" /> : <Upload size={16} />}
                        {uploadingLogo ? 'Enviando para o R2...' : 'Upload da Logo (PNG/SVG Transparente)'}
                        <input type="file" accept="image/png,image/svg+xml,image/webp" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    </div>
                    <p className="text-[11px] text-gray-400">💡 Armazenado com segurança e entregue via CDN do Cloudflare R2.</p>
                  </div>

                  {/* Seletor de Cores Interativo em Tempo Real */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Cor de Destaque da Página (Color Picker ao Vivo)
                    </label>

                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        name="accentColor"
                        value={formData.accentColor || '#f97316'}
                        onChange={handleChange}
                        className="w-12 h-12 rounded-xl border border-white/20 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        name="accentColor"
                        value={formData.accentColor || '#f97316'}
                        onChange={handleChange}
                        className="flex-1 px-3 py-2 bg-black/40 border border-white/10 text-white rounded-xl text-xs font-mono"
                        placeholder="#f97316"
                      />
                    </div>

                    {/* Paleta Rápida */}
                    <div>
                      <span className="text-[11px] text-gray-400 block mb-1.5">Paleta Rápida 1-Clique:</span>
                      <div className="flex gap-2">
                        {[
                          { name: 'Laranja CRM', hex: '#f97316' },
                          { name: 'Roxo SaaS', hex: '#8b5cf6' },
                          { name: 'Verde Finanças', hex: '#10b981' },
                          { name: 'Azul Tech', hex: '#3b82f6' },
                          { name: 'Rosa Premium', hex: '#ec4899' },
                          { name: 'Grafite Minimal', hex: '#64748b' }
                        ].map((item) => (
                          <button
                            key={item.hex}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, accentColor: item.hex }))}
                            className="w-7 h-7 rounded-full border border-white/20 transition-transform hover:scale-110 flex items-center justify-center"
                            style={{ backgroundColor: item.hex }}
                            title={item.name}
                          >
                            {formData.accentColor === item.hex && <Check size={12} className="text-white drop-shadow" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Benefícios em Bullets */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Benefícios em Destaque (1 por linha)</label>
                    <textarea
                      value={benefitsInput}
                      onChange={(e) => setBenefitsInput(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 resize-none font-sans"
                      placeholder={"Emissão ilimitada de cobranças Pix\nNotificações automáticas no WhatsApp\nSuporte prioritário com especialista"}
                    />
                  </div>

                  {/* Selo de Garantia */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Selo de Garantia Exibido na Página de Pagamento
                    </label>
                    <input 
                      type="text" 
                      name="guaranteeText" 
                      value={formData.guaranteeText || ''} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500" 
                      placeholder="Ex: Garantia Incondicional de 7 Dias"
                    />
                  </div>

                  {/* Contrato Customizado */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Contrato / Termos Específicos do Produto</label>
                    <textarea
                      name="customContractText"
                      value={formData.customContractText || ''}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 resize-none font-sans"
                      placeholder="Se preenchido, substitui as cláusulas genéricas no aceite do contrato..."
                    />
                  </div>
                </div>
              )}

              {/* ABA 3: DEPOIMENTOS / PROVA SOCIAL */}
              {activeTab === 'testimonials' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-300">Depoimentos de Clientes (Prova Social)</span>
                    <button
                      type="button"
                      onClick={handleAddTestimonial}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 rounded-xl text-xs font-semibold transition-all"
                    >
                      <Plus size={14} />
                      Adicionar Depoimento
                    </button>
                  </div>

                  {(!formData.testimonials || formData.testimonials.length === 0) ? (
                    <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-xs text-gray-400">
                      Nenhum depoimento cadastrado. Clique no botão acima para adicionar a avaliação de um cliente!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.testimonials.map((t, idx) => (
                        <div key={t.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 relative group">
                          <button
                            type="button"
                            onClick={() => handleRemoveTestimonial(t.id)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>

                          <div className="flex items-center gap-3">
                            {/* Avatar R2 Upload */}
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-black/60 border border-white/20 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-300">
                                {t.avatarUrl ? (
                                  <img src={t.avatarUrl} alt={t.name} className="w-full h-full object-cover" />
                                ) : (
                                  t.name.charAt(0)
                                )}
                              </div>
                              <label className="absolute -bottom-1 -right-1 p-1 bg-primary-500 rounded-full text-white cursor-pointer hover:scale-110 transition-transform">
                                {uploadingAvatarId === t.id ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                                <input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(t.id, e)} className="hidden" />
                              </label>
                            </div>

                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={t.name}
                                onChange={(e) => handleTestimonialChange(t.id, 'name', e.target.value)}
                                className="px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white"
                                placeholder="Nome do Cliente"
                              />
                              <input
                                type="text"
                                value={t.roleCompany || ''}
                                onChange={(e) => handleTestimonialChange(t.id, 'roleCompany', e.target.value)}
                                className="px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white"
                                placeholder="Empresa / Cargo"
                              />
                            </div>
                          </div>

                          <textarea
                            value={t.comment}
                            onChange={(e) => handleTestimonialChange(t.id, 'comment', e.target.value)}
                            rows={2}
                            className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white resize-none"
                            placeholder="Comentário da avaliação..."
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* LADO DIREITO: SIMULADOR LIVE PREVIEW EM TEMPO REAL */}
          <div className="w-full lg:w-1/2 bg-[#030712] p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar relative">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Eye size={14} className="text-primary-400" />
                <span>Live Preview em Tempo Real</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                Ao Vivo
              </span>
            </div>

            {/* Container do Mini-Checkout */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-2xl">
              {/* Background Glow do Produto */}
              <div 
                className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none opacity-25 transition-all duration-500"
                style={{ backgroundColor: formData.accentColor || '#f97316' }}
              />

              <div className="space-y-4 relative z-10">
                {/* Cabeçalho do Preview */}
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="h-12 px-3 py-1 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center">
                      <img 
                        src={formData.logoUrl || 'https://i.imgur.com/zCvL7xy.png'} 
                        alt="Logo Preview" 
                        className="h-8 w-auto object-contain"
                      />
                    </div>
                  </div>

                  <span 
                    className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                    style={{ 
                      backgroundColor: `${formData.accentColor || '#f97316'}20`,
                      borderColor: `${formData.accentColor || '#f97316'}50`,
                      color: formData.accentColor || '#f97316'
                    }}
                  >
                    {formData.name || 'Nome do Produto'}
                  </span>

                  <h3 className="text-lg font-extrabold text-white">
                    {formData.name || 'Nome do Produto'}
                  </h3>

                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-black text-white">
                      R$ {(formData.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formData.type === 'SUBSCRIPTION' ? '/mês' : ' (À vista)'}
                    </span>
                  </div>
                </div>

                {/* Banner de Benefícios */}
                {benefitsInput.trim() && (
                  <div 
                    className="p-3 rounded-xl border text-xs space-y-1.5"
                    style={{ 
                      backgroundColor: `${formData.accentColor || '#f97316'}10`,
                      borderColor: `${formData.accentColor || '#f97316'}30`
                    }}
                  >
                    <span className="font-bold text-[11px] block uppercase" style={{ color: formData.accentColor || '#f97316' }}>
                      Incluso neste plano:
                    </span>
                    {benefitsInput.split('\n').filter(Boolean).map((b, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-200">
                        <Check size={12} style={{ color: formData.accentColor || '#f97316' }} />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview de Depoimento (se cadastrado) */}
                {formData.testimonials && formData.testimonials.length > 0 && (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-300 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                        {formData.testimonials[0].avatarUrl ? (
                          <img src={formData.testimonials[0].avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          formData.testimonials[0].name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-white block truncate">{formData.testimonials[0].name}</span>
                        <div className="flex text-amber-400"><Star size={10} fill="currentColor" /></div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-300 italic line-clamp-2">"{formData.testimonials[0].comment}"</p>
                  </div>
                )}

                {/* Botão de Ação Estilizado */}
                <button
                  type="button"
                  style={{ backgroundColor: formData.accentColor || '#f97316' }}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <span>Finalizar Pedido com Segurança</span>
                  <Check size={14} />
                </button>
              </div>

              {/* Rodapé do Preview */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><Lock size={10} className="text-emerald-400" /> SSL 256-bit</span>
                <span className="flex items-center gap-1"><QrCode size={10} className="text-emerald-400" /> Pix / Cartão</span>
                <span className="flex items-center gap-1"><ShieldCheck size={10} className="text-primary-400" /> Asaas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
          {initialData?.id && onDelete ? (
            <button 
              type="button" 
              onClick={() => { onDelete(initialData.id!); onClose(); }} 
              className="text-red-400 hover:text-red-300 text-xs font-medium px-3 py-2 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              Excluir Produto
            </button>
          ) : <div></div>}
          <div className="flex space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-xs font-medium transition-colors">Cancelar</button>
            <button 
              type="submit" 
              form="offer-form"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-orange-600 text-white text-xs font-bold shadow-lg shadow-primary-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Check size={16} />
              Salvar Produto & Página de Pagamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
