import React, { useState, useMemo } from 'react';
import { 
  Megaphone, Plus, Search, Filter, RefreshCw, Layers, 
  HelpCircle, AlertCircle, Sparkles, SlidersHorizontal
} from 'lucide-react';
import { useCreatives } from '../hooks/useCreatives';
import { useLeads, useClients } from '@/hooks/queries/useClients';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRMStore } from '@/store/useCRMStore';
import { useCRM } from '@crm/contexts/CRMContext';
import { hubadsService } from '../services/hubads.service';
import { CreativeEntity } from '../entities/creative.entity';
import { HubAdsStats } from '../components/HubAdsStats';
import { CreativeCard } from '../components/CreativeCard';
import { CreativeModal } from '../components/CreativeModal';

export default function HubAdsView() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  const { offers: products = [] } = useCRM();
  const { user } = useAuth();
  
  // Real-time Queries
  const { data: creatives = [], isLoading: loadingCreatives } = useCreatives();
  const { data: leads = [], isLoading: loadingLeads } = useLeads();
  const { data: clients = [], isLoading: loadingClients } = useClients();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCreative, setSelectedCreative] = useState<CreativeEntity | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<string>('all');
  const [filterScore, setFilterScore] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeCollection, setActiveCollection] = useState<'swipes' | 'campaigns'>('swipes');
  const [filterNiche, setFilterNiche] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterMarket, setFilterMarket] = useState('all');
  const [filterProductType, setFilterProductType] = useState('all');

  // Mapeamento de contadores reais por trackingCode
  const realCounts = useMemo(() => {
    const map: Record<string, { leads: number; revenue: number }> = {};
    
    // Inicializa
    creatives.filter(c => c.origin === 'own').forEach(c => {
      map[c.trackingCode] = { leads: 0, revenue: 0 };
    });

    // Contabiliza
    leads.forEach(l => {
      if (l.leadSource && map[l.leadSource] !== undefined) {
        map[l.leadSource].leads += 1;
      }
    });

    clients.forEach(c => {
      if (c.leadSource && map[c.leadSource] !== undefined) {
        const clientVal = (c as any).value || (c as any).estimatedValue || 0;
        map[c.leadSource].revenue += Number(clientVal);
      }
    });

    return map;
  }, [creatives, leads, clients]);

  // Filtragem dos criativos
  const filteredCreatives = useMemo(() => {
    const collectionCreatives = creatives.filter(c => activeCollection === 'swipes' ? c.origin !== 'own' : c.origin === 'own');
    return collectionCreatives.filter(c => {
      // Busca textual (título, headline, copy, tags)
      const textMatch = searchQuery.trim() === '' || 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.headline || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.copyText || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.niche || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.audienceGender || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.market || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.sourceUrl || '').toLowerCase().includes(searchQuery.toLowerCase());

      // Filtro de plataforma
      const platformMatch = filterPlatform === 'all' || c.platform.includes(filterPlatform);

      // Filtro de status
      const statusMatch = filterStatus === 'all' || c.status === filterStatus;

      // Filtro de categoria
      const categoryMatch = filterCategory === 'all' || c.category === filterCategory;

      // Filtro de origem
      const originMatch = filterOrigin === 'all' || c.origin === filterOrigin;

      // Filtro de score
      const scoreMatch = filterScore === 'all' || c.score === filterScore;
      const nicheMatch = filterNiche === 'all' || c.niche === filterNiche;
      const genderMatch = filterGender === 'all' || c.audienceGender === filterGender;
      const marketMatch = filterMarket === 'all' || c.market === filterMarket;
      const productTypeMatch = filterProductType === 'all' || (c.productType || 'unlinked') === filterProductType;

      return textMatch && platformMatch && statusMatch && categoryMatch && originMatch && scoreMatch && nicheMatch && genderMatch && marketMatch && productTypeMatch;
    });
  }, [creatives, activeCollection, searchQuery, filterPlatform, filterStatus, filterCategory, filterOrigin, filterScore, filterNiche, filterGender, filterMarket, filterProductType]);

  const collectionCreatives = useMemo(() => creatives.filter(c => activeCollection === 'swipes' ? c.origin !== 'own' : c.origin === 'own'), [creatives, activeCollection]);
  const uniqueValues = (key: 'niche' | 'audienceGender' | 'market') => [...new Set(collectionCreatives.map(c => c[key]?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));

  const handleOpenNew = () => {
    setSelectedCreative(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (creative: CreativeEntity) => {
    setSelectedCreative(creative);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    if (!orgId || !user) return;
    
    if (selectedCreative) {
      // Edição
      await hubadsService.updateCreative(orgId, selectedCreative.id, data);
    } else {
      // Criação
      await hubadsService.createCreative(orgId, data, user.uid);
    }
  };

  const handleDelete = async () => {
    if (!orgId || !selectedCreative) return;
    await hubadsService.deleteCreative(orgId, selectedCreative.id);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterPlatform('all');
    setFilterStatus('all');
    setFilterCategory('all');
    setFilterOrigin('all');
    setFilterScore('all');
    setFilterNiche('all');
    setFilterGender('all');
    setFilterMarket('all');
    setFilterProductType('all');
  };

  const hasActiveFilters = searchQuery !== '' || filterPlatform !== 'all' || filterStatus !== 'all' || filterCategory !== 'all' || filterOrigin !== 'all' || filterScore !== 'all' || filterNiche !== 'all' || filterGender !== 'all' || filterMarket !== 'all' || filterProductType !== 'all';

  const isLoading = loadingCreatives || loadingLeads || loadingClients;

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full text-left">
      {/* Header da View */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-xl">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">HubAds</h1>
              <p className="text-sm text-gray-400">Referências pesquisáveis e criativos da operação, conectados aos produtos.</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleOpenNew}
          className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg shadow-primary-500/20 hover:scale-[1.02]"
        >
          <Plus className="w-5 h-5" />
          {activeCollection === 'swipes' ? 'Guardar referência' : 'Novo anúncio'}
        </button>
      </div>

      <div className="flex gap-2 border-b border-white/10">
        <button type="button" onClick={() => setActiveCollection('swipes')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeCollection === 'swipes' ? 'border-primary-400 text-primary-300' : 'border-transparent text-gray-400 hover:text-white'}`}>Swipe File <span className="ml-1 text-xs opacity-70">({creatives.filter(c => c.origin !== 'own').length})</span></button>
        <button type="button" onClick={() => setActiveCollection('campaigns')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeCollection === 'campaigns' ? 'border-primary-400 text-primary-300' : 'border-transparent text-gray-400 hover:text-white'}`}>Anúncios da operação <span className="ml-1 text-xs opacity-70">({creatives.filter(c => c.origin === 'own').length})</span></button>
      </div>

      {/* Estatísticas Globais */}
      {activeCollection === 'campaigns' && <HubAdsStats creatives={collectionCreatives} leads={leads} clients={clients} />}

      {/* Barra de Filtros */}
      <div className="bg-[#0b0e14]/40 border border-white/10 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Busca textual */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeCollection === 'swipes' ? 'Buscar por texto, produto, nicho, público, mercado, tags ou link...' : 'Buscar por título, headline, copy, produto, tags ou código...'}
              className="w-full pl-11 pr-4 py-2.5 bg-[#0d1117]/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de plataforma */}
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="px-3 py-2.5 bg-[#0d1117]/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary-500/50 transition-colors"
            >
              <option value="all">Todas Plataformas</option>
              <option value="Meta">Meta Ads</option>
              <option value="Google">Google Ads</option>
              <option value="TikTok">TikTok Ads</option>
              <option value="LinkedIn">LinkedIn Ads</option>
            </select>

            {/* Seletor de status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 bg-[#0d1117]/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary-500/50 transition-colors"
            >
              <option value="all">Todos Status</option>
              <option value="draft">Rascunho</option>
              <option value="approved">Aprovado</option>
              <option value="active">Ativo (Rodando)</option>
              <option value="paused">Pausado</option>
              <option value="archived">Arquivado</option>
            </select>

            {/* Seletor de categoria */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2.5 bg-[#0d1117]/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary-500/50 transition-colors"
            >
              <option value="all">Todas Peças</option>
              <option value="full_ad">Anúncio Completo</option>
              <option value="visual">Visual</option>
              <option value="headline">Headline</option>
              <option value="copy">Copy</option>
              <option value="cta">CTA</option>
              <option value="landing_page">Landing Page</option>
            </select>

            {/* Alternador de filtros avançados */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2.5 border rounded-xl transition-colors ${
                showAdvancedFilters || filterOrigin !== 'all' || filterScore !== 'all'
                  ? 'border-primary-500/40 bg-primary-500/10 text-primary-400'
                  : 'border-white/10 bg-[#0d1117]/60 text-gray-400 hover:text-white hover:border-white/20'
              }`}
              title="Filtros Avançados"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Limpar filtros */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2.5 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Filtros Avançados (Expansível) */}
        {(activeCollection === 'swipes' || showAdvancedFilters || filterOrigin !== 'all' || filterScore !== 'all') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-white/5 flex-wrap">
            {activeCollection === 'swipes' && <>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nicho<select value={filterNiche} onChange={event => setFilterNiche(event.target.value)} className="mt-1.5 w-full px-3 py-2 bg-[#0d1117]/60 border border-white/10 rounded-xl text-xs text-white"><option value="all">Todos os nichos</option>{uniqueValues('niche').map(value => <option key={value} value={value}>{value}</option>)}</select></label>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gênero / público<select value={filterGender} onChange={event => setFilterGender(event.target.value)} className="mt-1.5 w-full px-3 py-2 bg-[#0d1117]/60 border border-white/10 rounded-xl text-xs text-white"><option value="all">Todos os públicos</option>{uniqueValues('audienceGender').map(value => <option key={value} value={value}>{value}</option>)}</select></label>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mercado<select value={filterMarket} onChange={event => setFilterMarket(event.target.value)} className="mt-1.5 w-full px-3 py-2 bg-[#0d1117]/60 border border-white/10 rounded-xl text-xs text-white"><option value="all">Todos os mercados</option>{uniqueValues('market').map(value => <option key={value} value={value}>{value}</option>)}</select></label>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo de produto<select value={filterProductType} onChange={event => setFilterProductType(event.target.value)} className="mt-1.5 w-full px-3 py-2 bg-[#0d1117]/60 border border-white/10 rounded-xl text-xs text-white"><option value="all">Todos os tipos</option><option value="own">Próprio</option><option value="affiliate">Afiliado</option><option value="unlinked">Referência geral</option></select></label>
            </>}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Origem da Peça</label>
              <select
                value={filterOrigin}
                onChange={(e) => setFilterOrigin(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d1117]/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary-500/50"
              >
                <option value="all">Todas as Origens</option>
                <option value="own">Produção Própria</option>
                <option value="competitor">Referência de Concorrente</option>
                <option value="inspiration">Inspiração Externa</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Classificação / Performance</label>
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d1117]/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary-500/50"
              >
                <option value="all">Todas as Classificações</option>
                <option value="pending">Pendente de Avaliação</option>
                <option value="success">Criativo Vencedor (🟢)</option>
                <option value="average">Criativo Mediano (🟡)</option>
                <option value="failure">Criativo Ruim (🔴)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Grid de Criativos ou State Vazio */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-sm text-gray-400">Carregando banco de criativos...</p>
        </div>
      ) : filteredCreatives.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredCreatives.map(c => {
            const counts = realCounts[c.trackingCode] || { leads: 0, revenue: 0 };
            return (
              <CreativeCard
                key={c.id}
                creative={c}
                realLeadsCount={counts.leads}
                realRevenueCount={counts.revenue}
                onClick={() => handleOpenEdit(c)}
              />
            );
          })}
        </div>
      ) : (
        <div className="border border-white/10 rounded-2xl bg-[#0b0e14]/20 p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto mt-8">
          <AlertCircle className="w-12 h-12 text-gray-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Nenhum Criativo Encontrado</h3>
          <p className="text-sm text-gray-400 mb-6">
            {hasActiveFilters 
              ? 'Tente ajustar ou limpar os filtros de busca para encontrar o que procura.' 
              : activeCollection === 'swipes' ? 'Guarde referências de qualquer canal e classifique-as por produto, nicho, público e mercado.' : 'Cadastre anúncios da operação e acompanhe os criativos ativos e pausados.'
            }
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-semibold text-white transition-colors"
            >
              Limpar Todos os Filtros
            </button>
          ) : (
            <button
              onClick={handleOpenNew}
              className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg"
            >
              <Plus className="w-4 h-4" />
              {activeCollection === 'swipes' ? 'Guardar primeira referência' : 'Criar primeiro anúncio'}
            </button>
          )}
        </div>
      )}

      {/* Modal Criar/Editar */}
      <CreativeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        creative={selectedCreative}
        defaultOrigin={activeCollection === 'swipes' ? 'inspiration' : 'own'}
        products={products.map(product => ({ id: product.id, name: product.name }))}
      />
    </div>
  );
}
