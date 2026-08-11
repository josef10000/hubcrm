import React, { useState, useEffect } from 'react';
import { X, Star, Upload, Palette, Check, Sparkles, Loader2 } from 'lucide-react';
import { Offer } from '@/types';
import { uploadImageToImgBB } from '@/lib/imgbb';
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
    customContractText: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [benefitsInput, setBenefitsInput] = useState('');

  useEffect(() => {
    setErrorMsg('');
    if (initialData) {
      setFormData({
        ...initialData,
        commissionValue: initialData.commissionValue || 0,
        logoUrl: initialData.logoUrl || '',
        accentColor: initialData.accentColor || '#f97316',
        benefits: initialData.benefits || [],
        customContractText: initialData.customContractText || ''
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
        customContractText: ''
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
      const url = await uploadImageToImgBB(file);
      setFormData(prev => ({ ...prev, logoUrl: url }));
      toast.success('Logo do produto enviada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao enviar imagem da logo.');
    } finally {
      setUploadingLogo(false);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#111] w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {initialData?.id ? 'Editar Oferta' : 'Nova Oferta'}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nome da Oferta *</label>
              <input 
                type="text" 
                name="name" 
                required
                value={formData.name || ''} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                placeholder="Ex: Plano Essencial"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo *</label>
              <select 
                name="type" 
                required
                value={formData.type || 'SUBSCRIPTION'} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              >
                <option value="SUBSCRIPTION">Assinatura (Recorrente)</option>
                <option value="SINGLE">Pagamento Único</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Contexto de Exibição *</label>
              <select 
                name="displayContext" 
                required
                value={formData.displayContext || 'PORTAL'} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              >
                <option value="PORTAL">Apenas CRM (Manual)</option>
                <option value="CHECKOUT">Apenas Página de Checkout</option>
                <option value="BOTH">Ambos (CRM e Checkout)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Define onde este produto ficará visível para venda.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Preço (R$) *</label>
                <input 
                  type="number" 
                  name="price" 
                  required
                  min="0"
                  step="0.01"
                  value={formData.price} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Ordem (1, 2...) *</label>
                <input 
                  type="number" 
                  name="order" 
                  required
                  value={formData.order} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="1"
                />
              </div>
            </div>

            {formData.type === 'SUBSCRIPTION' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Taxa de Setup (R$) *</label>
                <input 
                  type="number" 
                  name="setupPrice" 
                  required
                  min="0"
                  step="0.01"
                  value={formData.setupPrice} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                />
                <p className="text-xs text-gray-500 mt-1">Coloque 0 se não houver taxa de setup.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Descrição Crucial *</label>
              <textarea 
                name="description" 
                required
                value={formData.description || ''} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all h-24 resize-none" 
                placeholder="Ex: Entrega em 5 dias, Suporte Grátis..."
              />
              <p className="text-xs text-gray-500 mt-1">Detalhes vitais que aparecem no card do produto.</p>
            </div>

            {formData.type === 'SINGLE' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Máximo de Parcelas *</label>
                <input 
                  type="number" 
                  name="maxInstallments" 
                  required
                  min="1"
                  max="12"
                  value={formData.maxInstallments} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                />
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <input 
                type="checkbox" 
                id="isMostHired"
                name="isMostHired" 
                checked={formData.isMostHired || false} 
                onChange={handleChange as any} 
                className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500 bg-black/20"
              />
              <label htmlFor="isMostHired" className="text-sm font-medium text-amber-500 flex items-center gap-2">
                <Star size={14} fill="currentColor" />
                Marcar como MAIS CONTRATADO (Destaque no Portal)
              </label>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <input 
                type="checkbox" 
                id="active"
                name="active" 
                checked={formData.active !== undefined ? formData.active : true} 
                onChange={handleChange as any} 
                className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500 bg-black/20"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Oferta Ativa (Visível na criação de clientes)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Detalhes Adicionais (Página de Detalhes)</label>
              <textarea 
                name="details" 
                value={formData.details || ''} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all h-32 resize-none" 
                placeholder="Descreva aqui todos os detalhes, benefícios e o que está incluso neste produto/serviço..."
              />
              <p className="text-xs text-gray-500 mt-1">Este texto aparecerá quando o cliente clicar em "Ver detalhes" no portal.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Comissão do Vendedor (R$)</label>
              <input 
                type="number" 
                name="commissionValue" 
                min="0"
                step="0.01"
                value={formData.commissionValue} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                placeholder="Ex: 500.00"
              />
              <p className="text-xs text-gray-500 mt-1">Valor fixo que o vendedor receberá por esta venda após a baixa do pagamento.</p>
            </div>

            {/* --- PERSONALIZAÇÃO DE CHECKOUT POR PRODUTO --- */}
            <div className="pt-4 border-t border-gray-200 dark:border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-primary-500">
                <Palette size={16} />
                <span>Personalização do Checkout por Produto</span>
              </div>

              {/* Logo do Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Logo do Produto (PNG/SVG com Fundo Transparente)
                </label>
                <div className="flex items-center gap-3">
                  {formData.logoUrl ? (
                    <div className="relative w-14 h-14 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center p-2 group overflow-hidden">
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
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black/20 border border-dashed border-gray-300 dark:border-white/20 hover:border-primary-500 rounded-xl cursor-pointer transition-colors text-xs font-medium text-gray-600 dark:text-gray-300">
                    {uploadingLogo ? <Loader2 size={16} className="animate-spin text-primary-500" /> : <Upload size={16} />}
                    {uploadingLogo ? 'Enviando...' : 'Fazer upload da logo (PNG/SVG)'}
                    <input type="file" accept="image/png,image/svg+xml,image/webp" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  💡 Recomendado: Imagem PNG ou SVG com fundo transparente para melhor adaptação visual no tema escuro.
                </p>
              </div>

              {/* Cor Temática do Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Cor de Destaque / Tema do Produto
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="accentColor"
                    value={formData.accentColor || '#f97316'}
                    onChange={handleChange}
                    className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    name="accentColor"
                    value={formData.accentColor || '#f97316'}
                    onChange={handleChange}
                    className="flex-1 px-4 py-2.5 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl text-xs font-mono"
                    placeholder="#f97316"
                  />
                  <div className="flex gap-1">
                    {['#f97316', '#8b5cf6', '#10b981', '#3b82f6', '#ec4899'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, accentColor: color }))}
                        className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Benefícios em Bullets */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Benefícios em Destaque no Checkout (1 por linha)
                </label>
                <textarea
                  value={benefitsInput}
                  onChange={(e) => setBenefitsInput(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 resize-none font-sans"
                  placeholder={"Emissão ilimitada de cobranças Pix\nNotificações automáticas no WhatsApp\nSuporte prioritário com especialista"}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Estes benefícios serão listados com checkmarks na lateral do checkout do produto.
                </p>
              </div>

              {/* Contrato / Termos Específicos */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Contrato / Termos de Aceite Específicos do Produto (Opcional)
                </label>
                <textarea
                  name="customContractText"
                  value={formData.customContractText || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 resize-none font-sans"
                  placeholder="Se preenchido, este texto substituirá as cláusulas padrão no aceite do contrato deste produto."
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center">
            {initialData?.id && onDelete ? (
              <button 
                type="button" 
                onClick={() => { onDelete(initialData.id!); onClose(); }} 
                className="text-red-500 hover:text-red-600 font-medium px-4 py-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
              >
                Excluir
              </button>
            ) : <div></div>}
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-medium">Cancelar</button>
              <button type="submit" className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-gray-900 dark:text-white font-medium shadow-lg shadow-primary-500/30 transition-all hover:scale-105 active:scale-95">Salvar Produto</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
