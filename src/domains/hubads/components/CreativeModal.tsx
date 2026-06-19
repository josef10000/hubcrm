import React, { useState, useEffect } from 'react';
import { 
  X, Upload, Trash2, Globe, FileText, Image as ImageIcon, 
  Layers, Play, Link, Calculator, Check, ArrowRight, AlertCircle, AlertTriangle
} from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { CreativeEntity } from '../entities/creative.entity';

interface CreativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  creative?: CreativeEntity | null; // se presente, é modo de edição
}

type TabType = 'creative' | 'campaign' | 'performance';

export function CreativeModal({ isOpen, onClose, onSave, onDelete, creative }: CreativeModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('creative');
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'image' | 'video' | 'carousel' | 'text' | 'reference'>('image');
  const [category, setCategory] = useState<'headline' | 'copy' | 'visual' | 'cta' | 'landing_page' | 'full_ad'>('full_ad');
  const [platform, setPlatform] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'approved' | 'active' | 'paused' | 'archived'>('draft');
  const [origin, setOrigin] = useState<'own' | 'competitor' | 'inspiration'>('own');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaInput, setMediaInput] = useState('');
  const [headline, setHeadline] = useState('');
  const [copyText, setCopyText] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [campaignName, setCampaignName] = useState('');
  
  // Performance states
  const [investment, setInvestment] = useState(0);
  const [impressions, setImpressions] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [conversions, setConversions] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [score, setScore] = useState<'success' | 'average' | 'failure' | 'pending'>('pending');
  const [notes, setNotes] = useState('');

  // Sincroniza dados com o criativo passado (se houver) ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setActiveTab('creative');
      if (creative) {
        setTitle(creative.title || '');
        setType(creative.type || 'image');
        setCategory(creative.category || 'full_ad');
        setPlatform(creative.platform || []);
        setStatus(creative.status || 'draft');
        setOrigin(creative.origin || 'own');
        setMediaUrls(creative.mediaUrls || []);
        setMediaInput('');
        setHeadline(creative.headline || '');
        setCopyText(creative.copyText || '');
        setCtaText(creative.ctaText || '');
        setTagsInput(creative.tags ? creative.tags.join(', ') : '');
        setCampaignName(creative.campaignName || '');
        setInvestment(creative.investment || 0);
        setImpressions(creative.impressions || 0);
        setClicks(creative.clicks || 0);
        setConversions(creative.conversions || 0);
        setRevenue(creative.revenue || 0);
        setScore(creative.score || 'pending');
        setNotes(creative.notes || '');
      } else {
        // Reset form
        setTitle('');
        setType('image');
        setCategory('full_ad');
        setPlatform([]);
        setStatus('draft');
        setOrigin('own');
        setMediaUrls([]);
        setMediaInput('');
        setHeadline('');
        setCopyText('');
        setCtaText('');
        setTagsInput('');
        setCampaignName('');
        setInvestment(0);
        setImpressions(0);
        setClicks(0);
        setConversions(0);
        setRevenue(0);
        setScore('pending');
        setNotes('');
      }
    }
  }, [isOpen, creative]);

  if (!isOpen) return null;

  // Cálculos automáticos de métricas em tempo real
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? investment / clicks : 0;
  const cpl = conversions > 0 ? investment / conversions : 0;
  const roas = investment > 0 ? revenue / investment : 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    setErrorMsg(null);
    try {
      const secureUrl = await uploadToCloudinary(file);
      setMediaUrls(prev => [...prev, secureUrl]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Falha ao subir imagem. Verifique o tamanho do arquivo ou tente novamente.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleAddMediaUrl = () => {
    if (mediaInput.trim() !== '') {
      setMediaUrls(prev => [...prev, mediaInput.trim()]);
      setMediaInput('');
    }
  };

  const handleRemoveMediaUrl = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleTogglePlatform = (plat: string) => {
    setPlatform(prev => 
      prev.includes(plat) ? prev.filter(p => p !== plat) : [...prev, plat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('O título do criativo é obrigatório.');
      setActiveTab('creative');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const tags = tagsInput
      ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : [];

    const data = {
      title,
      type,
      category,
      platform,
      status,
      origin,
      mediaUrls,
      headline,
      copyText,
      ctaText,
      tags,
      campaignName,
      investment: Number(investment) || 0,
      impressions: Number(impressions) || 0,
      clicks: Number(clicks) || 0,
      conversions: Number(conversions) || 0,
      revenue: Number(revenue) || 0,
      score,
      notes,
    };

    try {
      await onSave(data);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao salvar criativo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (onDelete && window.confirm('Deseja realmente excluir este criativo? Esta ação não pode ser desfeita.')) {
      setLoading(true);
      try {
        await onDelete();
        onClose();
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Erro ao excluir criativo.');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      {/* Modal Card */}
      <div 
        className="w-full max-w-4xl bg-[#080b10] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#0d1117]">
          <div>
            <h3 className="text-xl font-bold text-white">
              {creative ? 'Editar Criativo' : 'Novo Criativo'}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {creative 
                ? `Código de Rastreamento: ${creative.trackingCode}` 
                : 'Defina mídias, campanhas e resultados financeiros'
              }
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-white/10 bg-[#06090e]">
          <button
            onClick={() => setActiveTab('creative')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === 'creative' 
                ? 'border-primary-500 text-primary-400 bg-primary-500/5' 
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            1. Criativo & Mídia
          </button>
          <button
            onClick={() => setActiveTab('campaign')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === 'campaign' 
                ? 'border-primary-500 text-primary-400 bg-primary-500/5' 
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-4 h-4" />
            2. Campanha & Status
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === 'performance' 
                ? 'border-primary-500 text-primary-400 bg-primary-500/5' 
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calculator className="w-4 h-4" />
            3. Performance Financeira
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{errorMsg}</div>
            </div>
          )}

          {/* ABA 1 — CRIATIVO */}
          {activeTab === 'creative' && (
            <div className="space-y-6">
              {/* Título & Tipos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Título do Criativo *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Carrossel Promocional Black Friday"
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Formato de Mídia</label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="image">Imagem</option>
                    <option value="video">Vídeo</option>
                    <option value="carousel">Carrossel</option>
                    <option value="text">Apenas Texto (Copy)</option>
                    <option value="reference">Referência Externa</option>
                  </select>
                </div>
              </div>

              {/* Categorias & Mídia */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Categoria da Peça</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="full_ad">Anúncio Completo (Ad)</option>
                    <option value="visual">Visual / Criativo Imagem</option>
                    <option value="headline">Headline</option>
                    <option value="copy">Texto da Copy</option>
                    <option value="cta">Call to Action (CTA)</option>
                    <option value="landing_page">Landing Page</option>
                  </select>
                </div>

                {/* Upload e Inserção de Mídias */}
                <div className="md:col-span-2 space-y-4">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Upload ou Links de Mídia</label>
                  
                  {/* Upload via Cloudinary */}
                  <div className="flex gap-3">
                    <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-primary-500/50 bg-[#0d1117] rounded-xl p-4 cursor-pointer hover:bg-primary-500/5 transition-all">
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        className="hidden" 
                        onChange={handleFileUpload} 
                        disabled={uploadingMedia}
                      />
                      <Upload className={`w-5 h-5 mb-2 ${uploadingMedia ? 'animate-bounce text-primary-400' : 'text-gray-400'}`} />
                      <span className="text-xs text-gray-400 text-center font-medium">
                        {uploadingMedia ? 'Subindo arquivo...' : 'Upload de Imagem/Vídeo'}
                      </span>
                    </label>

                    {/* URL Direta */}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mediaInput}
                          onChange={(e) => setMediaInput(e.target.value)}
                          placeholder="Ou cole a URL direta da mídia"
                          className="flex-1 px-3 py-2 bg-[#0d1117] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddMediaUrl}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs transition-colors"
                        >
                          Adicionar
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500">Mídias do Cloudinary ou links externos públicos de anúncios e criativos.</p>
                    </div>
                  </div>

                  {/* Lista de mídias cadastradas */}
                  {mediaUrls.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
                      {mediaUrls.map((url, idx) => (
                        <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-slate-950 group">
                          {type === 'video' ? (
                            <video src={url} className="w-full h-full object-cover opacity-80" muted />
                          ) : (
                            <img src={url} alt="Midia" className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMediaUrl(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Textos: Headline, Copy, CTA */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Headline do Anúncio</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Ex: 🚀 Fature 5x mais usando nosso sistema exclusivo"
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Copywriting / Corpo do Anúncio</label>
                  <textarea
                    value={copyText}
                    onChange={(e) => setCopyText(e.target.value)}
                    rows={4}
                    placeholder="Escreva a copy completa do criativo..."
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors resize-y font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Call to Action (CTA)</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Ex: Saiba Mais / Cadastre-se / Falar no WhatsApp"
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('campaign')}
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-primary-500/20"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ABA 2 — CAMPANHA */}
          {activeTab === 'campaign' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Plataformas */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Plataformas de Anúncio</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Meta', 'Google', 'TikTok', 'LinkedIn'].map(plat => {
                      const isActive = platform.includes(plat);
                      return (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => handleTogglePlatform(plat)}
                          className={`p-3 border rounded-xl font-bold transition-all text-sm ${
                            isActive
                              ? 'bg-primary-500/10 text-primary-400 border-primary-500'
                              : 'bg-[#0d1117] text-gray-400 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {plat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nome da Campanha */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Nome da Campanha</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ex: Campanha Tráfego Frio - Junho 2026"
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status do Criativo</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="draft">Rascunho (Draft)</option>
                    <option value="approved">Aprovado (Ready)</option>
                    <option value="active">Veiculando Ativo (Active)</option>
                    <option value="paused">Pausado (Paused)</option>
                    <option value="archived">Arquivado (Archived)</option>
                  </select>
                </div>

                {/* Origem */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Origem da Peça</label>
                  <select
                    value={origin}
                    onChange={(e: any) => setOrigin(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="own">Produção Própria</option>
                    <option value="competitor">Referência de Concorrente</option>
                    <option value="inspiration">Inpiração Externa / Outros</option>
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tags (Separadas por vírgula)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Ex: blackfriday, frio, urgencia"
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              </div>

              {/* Informação sobre o Código de Rastreamento */}
              <div className="p-4 bg-slate-900/60 border border-white/5 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-gray-400 leading-relaxed">
                  <span className="font-semibold text-white block mb-1">Uso do Código de Rastreamento:</span>
                  O código sequencial gerado pelo sistema (ex: <span className="font-mono text-white">HUBADS-002</span>) deve ser utilizado como a origem de leads (URL UTM ou entrada no cadastro de Leads no CRM). Ao fazer isso, o faturamento e leads vinculados a este criativo serão contabilizados em tempo real no dashboard.
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('creative')}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('performance')}
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-primary-500/20"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ABA 3 — PERFORMANCE */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Entradas financeiras manuais */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Investimento (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={investment}
                    onChange={(e) => setInvestment(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Impressões</label>
                  <input
                    type="number"
                    min="0"
                    value={impressions}
                    onChange={(e) => setImpressions(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cliques</label>
                  <input
                    type="number"
                    min="0"
                    value={clicks}
                    onChange={(e) => setClicks(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Leads (Manuais)</label>
                  <input
                    type="number"
                    min="0"
                    value={conversions}
                    onChange={(e) => setConversions(Number(e.target.value))}
                    placeholder="Caso não use rastreio"
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Receita (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={revenue}
                    onChange={(e) => setRevenue(Number(e.target.value))}
                    placeholder="Faturamento manual"
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              </div>

              {/* Box de métricas calculadas em tempo real */}
              <div className="bg-[#0c1017] border border-white/10 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-primary-400" />
                  Métricas Calculadas em Tempo Real
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-left">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wide">CTR</span>
                    <span className="text-lg font-bold text-white font-mono">{ctr.toFixed(2)}%</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-left">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wide">CPC</span>
                    <span className="text-lg font-bold text-white font-mono">{formatCurrency(cpc)}</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-left">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wide">CPL</span>
                    <span className="text-lg font-bold text-white font-mono">{formatCurrency(cpl)}</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-left">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wide">ROAS</span>
                    <span className={`text-lg font-bold font-mono ${roas >= 2 ? 'text-emerald-400' : roas > 0 ? 'text-amber-400' : 'text-white'}`}>
                      {roas.toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>

              {/* Avaliação e Notas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Classificação de Sucesso</label>
                  <select
                    value={score}
                    onChange={(e: any) => setScore(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="pending">Pendente de Análise (Pending)</option>
                    <option value="success">Criativo Vencedor (🟢 Success)</option>
                    <option value="average">Criativo Mediano (🟡 Average)</option>
                    <option value="failure">Criativo Ruim (🔴 Failure)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notas / Observações / Aprendizados</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Pontos positivos, negativos, feedbacks dos clientes no anúncio..."
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors resize-y font-sans"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-between pt-6 border-t border-white/10">
                <div>
                  {creative && onDelete && (
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      disabled={loading}
                      className="px-4 py-2.5 bg-red-600/10 hover:bg-red-600 border border-red-600/20 hover:border-red-600/40 text-red-500 hover:text-white rounded-xl font-semibold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('campaign')}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-primary-500/20"
                  >
                    {loading ? 'Salvando...' : 'Salvar Criativo'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
