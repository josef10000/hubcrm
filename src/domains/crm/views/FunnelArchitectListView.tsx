import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitFork, Plus, Search, Sparkles, Trash2, ArrowRight, 
  Layers, CheckCircle2, DollarSign, Users, Eye, Play, 
  Compass, ShieldCheck, Flame, Tag, Clock, Rocket,
  Video, FileText, ChevronDown, X
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { funnelService } from '@/services/funnelService';
import { FunnelBlueprint, FunnelCategory } from '@/types';
import { MARKET_FUNNEL_TEMPLATES, FunnelTemplate } from '../constants/funnelTemplates';
import { DEFAULT_VSL_BLOCKS, DEFAULT_SALES_PAGE_SECTIONS, DEFAULT_QUIZ_SECTIONS } from '../constants/vslPageTemplates';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FunnelArchitectListView() {
  const [funnels, setFunnels] = useState<FunnelBlueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();
  const { userProfile, user } = useAuth();
  const { confirm, alert } = useDialog();
  const orgId = userProfile?.orgId;

  useEffect(() => {
    if (orgId) {
      loadFunnels();
    }
  }, [orgId]);

  const loadFunnels = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await funnelService.getFunnels(orgId);
      setFunnels(data);
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
      toast.error('Erro ao carregar os funis.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlankFunnel = async () => {
    if (!orgId) return;
    setCreating(true);
    setIsCreateMenuOpen(false);
    try {
      const newId = await funnelService.createFunnel(orgId, {
        title: 'Novo Funil ' + new Date().toLocaleDateString('pt-BR'),
        description: 'Estruture o tráfego, páginas e ofertas deste funil.',
        category: 'custom',
        status: 'building',
        nodes: [
          {
            id: 'node-traffic-1',
            type: 'traffic',
            subType: 'instagram',
            label: 'Instagram / Anúncios',
            subtitle: 'Tráfego Inicial',
            x: 100,
            y: 200,
            costPerClick: 1.00,
            status: 'idea'
          },
          {
            id: 'node-page-1',
            type: 'page',
            subType: 'sales_page',
            label: 'Página de Vendas',
            subtitle: 'Oferta Principal',
            x: 450,
            y: 200,
            conversionRate: 4.0,
            status: 'idea'
          },
          {
            id: 'node-checkout-1',
            type: 'page',
            subType: 'checkout',
            label: 'Checkout Hub',
            subtitle: 'PIX + Cartão',
            x: 800,
            y: 200,
            conversionRate: 65.0,
            status: 'idea'
          }
        ],
        connections: [
          { id: 'c-1-2', fromNodeId: 'node-traffic-1', toNodeId: 'node-page-1', style: 'solid' },
          { id: 'c-2-3', fromNodeId: 'node-page-1', toNodeId: 'node-checkout-1', style: 'solid' }
        ],
        metrics: {
          initialTraffic: 2000,
          projectedRevenue: 0,
          projectedROI: 0
        },
        orgId,
        createdBy: user?.uid
      });

      toast.success('Funil criado com sucesso!');
      navigate(`/funnels/${newId}?isNew=true`);
    } catch (error) {
      console.error('Erro ao criar funil em branco:', error);
      toast.error('Erro ao criar funil.');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateVSL = async () => {
    if (!orgId) return;
    setCreating(true);
    setIsCreateMenuOpen(false);
    try {
      const newId = await funnelService.createFunnel(orgId, {
        title: 'Novo Roteiro de VSL ' + new Date().toLocaleDateString('pt-BR'),
        description: 'Roteiro persuasivo com minutagem, ganchos e delay do botão.',
        category: 'vsl_script',
        status: 'building',
        nodes: [],
        connections: [],
        vslData: {
          targetWPM: 140,
          totalWords: 500,
          estimatedDurationSeconds: 215,
          pitchDelaySeconds: 150,
          blocks: DEFAULT_VSL_BLOCKS
        },
        orgId,
        createdBy: user?.uid
      });

      toast.success('Estúdio de VSL criado com sucesso!');
      navigate(`/funnels/vsl/${newId}?isNew=true`);
    } catch (error) {
      console.error('Erro ao criar VSL:', error);
      toast.error('Erro ao criar VSL.');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateSalesPage = async () => {
    if (!orgId) return;
    setCreating(true);
    setIsCreateMenuOpen(false);
    try {
      const newId = await funnelService.createFunnel(orgId, {
        title: 'Nova Página de Vendas ' + new Date().toLocaleDateString('pt-BR'),
        description: 'Estrutura de dobras de alta conversão para oferta direta.',
        category: 'sales_page',
        status: 'building',
        nodes: [],
        connections: [],
        pageQuizData: {
          mode: 'sales_page',
          sections: DEFAULT_SALES_PAGE_SECTIONS
        },
        orgId,
        createdBy: user?.uid
      });

      toast.success('Página de Vendas criada com sucesso!');
      navigate(`/funnels/page-quiz/${newId}?isNew=true`);
    } catch (error) {
      console.error('Erro ao criar Página:', error);
      toast.error('Erro ao criar Página.');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (!orgId) return;
    setCreating(true);
    setIsCreateMenuOpen(false);
    try {
      const newId = await funnelService.createFunnel(orgId, {
        title: 'Novo Quiz Interativo ' + new Date().toLocaleDateString('pt-BR'),
        description: 'Fluxo de diagnóstico com qualificação, mini-VSL e oferta.',
        category: 'quiz_funnel',
        status: 'building',
        nodes: [],
        connections: [],
        pageQuizData: {
          mode: 'quiz_funnel',
          sections: DEFAULT_QUIZ_SECTIONS
        },
        orgId,
        createdBy: user?.uid
      });

      toast.success('Quiz Interativo criado com sucesso!');
      navigate(`/funnels/page-quiz/${newId}?isNew=true`);
    } catch (error) {
      console.error('Erro ao criar Quiz:', error);
      toast.error('Erro ao criar Quiz.');
    } finally {
      setCreating(false);
    }
  };

  const handleUseTemplate = async (template: FunnelTemplate) => {
    if (!orgId) return;
    setCreating(true);
    try {
      const newId = await funnelService.createFunnel(orgId, {
        title: template.title,
        description: template.description,
        category: template.category,
        status: 'building',
        nodes: template.nodes,
        connections: template.connections,
        metrics: {
          initialTraffic: 3000,
          projectedRevenue: 0,
          projectedROI: 0
        },
        orgId,
        createdBy: user?.uid
      });

      toast.success(`Template "${template.title}" clonado com sucesso!`);
      setIsTemplateModalOpen(false);
      navigate(`/funnels/${newId}`);
    } catch (error) {
      console.error('Erro ao clonar template:', error);
      toast.error('Erro ao carregar template.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFunnel = async (e: React.MouseEvent, funnel: FunnelBlueprint) => {
    e.preventDefault();
    e.stopPropagation();
    if (!orgId || !funnel.id) return;

    try {
      const confirmed = await confirm({
        title: 'Excluir Funil',
        message: `Tem certeza que deseja excluir o funil "${funnel.title}"? Esta ação é irreversível.`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        variant: 'danger'
      });

      if (confirmed) {
        await funnelService.deleteFunnel(orgId, funnel.id);
        toast.success('Funil excluído com sucesso!');
        setFunnels(prev => prev.filter(f => f.id !== funnel.id));
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir o funil.');
    }
  };

  const filteredFunnels = funnels.filter(f => {
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050914] overflow-y-auto custom-scrollbar p-6 lg:p-10">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                <GitFork className="w-6 h-6" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                Funis & Orquestração de Processos
              </h1>
            </div>
            <p className="text-sm text-gray-400 max-w-3xl">
              Desenhe, simule e orquestre todo o seu ecossistema de vendas, réguas de e-mail, processos B2B corporativos, esteiras de pós-venda e operações em um quadro infinito com métricas reais.
            </p>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-xl border border-white/10 transition-all flex items-center gap-2 hover:border-indigo-500/50 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Templates de 1-Clique
            </button>

            <button
              onClick={() => setIsCreateMenuOpen(prev => !prev)}
              disabled={creating}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Ativo</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Menu Dropdown de Criação */}
            {isCreateMenuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-12 z-50 w-72 bg-[#090f24] border border-white/10 rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95 backdrop-blur-xl"
              >
                <button
                  onClick={handleCreateBlankFunnel}
                  className="w-full p-2.5 rounded-xl hover:bg-white/5 text-left transition-colors flex items-center gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <GitFork className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Funil / Jornada do Cliente</h5>
                    <p className="text-[10px] text-gray-400">Canvas 2D de fluxos e etapas</p>
                  </div>
                </button>

                <button
                  onClick={handleCreateVSL}
                  className="w-full p-2.5 rounded-xl hover:bg-white/5 text-left transition-colors flex items-center gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Roteiro de VSL</h5>
                    <p className="text-[10px] text-gray-400">Linha do tempo & minutagem WPM</p>
                  </div>
                </button>

                <button
                  onClick={handleCreateSalesPage}
                  className="w-full p-2.5 rounded-xl hover:bg-white/5 text-left transition-colors flex items-center gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Página de Vendas</h5>
                    <p className="text-[10px] text-gray-400">Wireframe de dobras verticais</p>
                  </div>
                </button>

                <button
                  onClick={handleCreateQuiz}
                  className="w-full p-2.5 rounded-xl hover:bg-white/5 text-left transition-colors flex items-center gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Quiz Interativo</h5>
                    <p className="text-[10px] text-gray-400">Diagnóstico & simulador ao vivo</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/[0.02] border border-white/10 p-3 rounded-2xl">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
            {[
              { id: 'all', label: 'Todos os Fluxos' },
              { id: 'journey', label: '🧭 Jornada do Cliente' },
              { id: 'vsl_script', label: '🎬 Roteiros de VSL' },
              { id: 'sales_page', label: '📄 Páginas de Venda' },
              { id: 'quiz_funnel', label: '🧠 Quizzes Interativos' },
              { id: 'perpetual', label: 'Perpétuo' },
              { id: 'b2b', label: 'Vendas B2B' },
              { id: 'cs', label: 'Pós-Venda CS' },
              { id: 'organic', label: 'Orgânico' },
              { id: 'launch', label: 'Lançamento' },
              { id: 'high_ticket', label: 'High-Ticket' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Funis */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-white/[0.02] border border-white/10 rounded-3xl animate-pulse p-6"></div>
            ))}
          </div>
        ) : filteredFunnels.length === 0 ? (
          <div className="p-12 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl max-w-xl mx-auto my-12">
            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 shadow-inner">
              <Compass className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Nenhum ativo encontrado</h3>
            <p className="text-sm text-gray-400 mb-6">
              Comece criando um novo funil, roteiro de VSL, página de vendas ou quiz interativo.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Explorar Templates
              </button>
              <button
                onClick={handleCreateBlankFunnel}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-md shadow-indigo-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Funil em Branco
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFunnels.map(funnel => {
              const nodeCount = funnel.nodes?.length || 0;
              const offerNodes = funnel.nodes?.filter(n => n.type === 'offer') || [];
              const trafficNodes = funnel.nodes?.filter(n => n.type === 'traffic') || [];
              const isVSL = funnel.category === 'vsl_script';
              const isPageQuiz = funnel.category === 'sales_page' || funnel.category === 'quiz_funnel';

              const statusColors = {
                draft: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
                building: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                archived: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }[funnel.status || 'building'];

              const statusLabels = {
                draft: 'Rascunho',
                building: 'Em Construção',
                active: 'No Ar / Ativo',
                archived: 'Arquivado'
              }[funnel.status || 'building'];

              return (
                <div
                  key={funnel.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) {
                      return;
                    }
                    if (isVSL) {
                      navigate(`/funnels/vsl/${funnel.id}`);
                    } else if (isPageQuiz) {
                      navigate(`/funnels/page-quiz/${funnel.id}`);
                    } else {
                      navigate(`/funnels/${funnel.id}`);
                    }
                  }}
                  className="group cursor-pointer bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/50 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between hover:shadow-2xl hover:shadow-indigo-500/10 relative overflow-hidden backdrop-blur-xl"
                >
                  {/* Glow de Fundo */}
                  <div className="absolute -right-16 -top-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors"></div>

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors}`}>
                          {statusLabels}
                        </span>
                        {isVSL && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                            🎬 VSL
                          </span>
                        )}
                        {funnel.category === 'quiz_funnel' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            🧠 Quiz
                          </span>
                        )}
                        {funnel.category === 'sales_page' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            📄 Página
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFunnel(e, funnel)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors relative z-10"
                        title="Excluir item"
                      >
                        <Trash2 className="w-4 h-4 pointer-events-none" />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1 mb-2">
                      {funnel.title}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-6">
                      {funnel.description || 'Sem descrição cadastrada.'}
                    </p>

                    {/* Resumo dos Nós ou Métricas */}
                    {isVSL ? (
                      <div className="grid grid-cols-2 gap-2 p-3 bg-black/40 rounded-2xl border border-white/5 mb-6 text-center">
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">Blocos de Copy</span>
                          <span className="text-sm font-black text-rose-400">{funnel.vslData?.blocks?.length || DEFAULT_VSL_BLOCKS.length}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">Duração Estimada</span>
                          <span className="text-sm font-black text-emerald-400">
                            ~{Math.round((funnel.vslData?.estimatedDurationSeconds || 215) / 60)} min
                          </span>
                        </div>
                      </div>
                    ) : isPageQuiz ? (
                      <div className="grid grid-cols-2 gap-2 p-3 bg-black/40 rounded-2xl border border-white/5 mb-6 text-center">
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">
                            {funnel.category === 'quiz_funnel' ? 'Passos do Quiz' : 'Dobras da Página'}
                          </span>
                          <span className="text-sm font-black text-indigo-400">
                            {funnel.pageQuizData?.sections?.length || 5}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">Simulador</span>
                          <span className="text-sm font-black text-purple-400">Interativo 📱</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 p-3 bg-black/40 rounded-2xl border border-white/5 mb-6 text-center">
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">Etapas</span>
                          <span className="text-sm font-black text-white">{nodeCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">Canais</span>
                          <span className="text-sm font-black text-cyan-400">{trafficNodes.length}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">Ofertas</span>
                          <span className="text-sm font-black text-emerald-400">{offerNodes.length}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      {funnel.updatedAt ? format(new Date(funnel.updatedAt), "dd 'de' MMM", { locale: ptBR }) : 'Recente'}
                    </span>
                    <span className="font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      {isVSL ? 'Abrir VSL' : isPageQuiz ? 'Abrir Editor' : 'Abrir Quadro'} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Templates de 1-Clique */}
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#0b1222] border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Galeria de Templates de Funis & Orquestração
                  </h3>
                  <p className="text-xs text-gray-400">
                    Escolha um modelo validado de vendas B2C/B2B ou processos empresariais para clonar no seu quadro.
                  </p>
                </div>
                <button
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4">
                {MARKET_FUNNEL_TEMPLATES.map(template => (
                  <div
                    key={template.id}
                    className="p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-indigo-500/50 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          {template.badge}
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          {template.estimatedROI}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors mb-2">
                        {template.title}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-3 mb-4">
                        {template.description}
                      </p>

                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-2 py-1 bg-black/40 rounded-lg text-[10px] text-gray-400 border border-white/5">
                          {template.nodes.length} Blocos
                        </span>
                        <span className="px-2 py-1 bg-black/40 rounded-lg text-[10px] text-gray-400 border border-white/5">
                          {template.connections.length} Conexões
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUseTemplate(template)}
                      disabled={creating}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      Clonar este Template
                    </button>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
