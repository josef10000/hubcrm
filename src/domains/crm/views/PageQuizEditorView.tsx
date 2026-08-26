import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Smartphone, Monitor, Play, 
  Sparkles, Eye, ChevronUp, ChevronDown, CheckCircle2, 
  HelpCircle, MessageCircle, DollarSign, ShieldCheck, Video, 
  Image as ImageIcon, Layers, RefreshCw, X, ArrowRight, Star,
  Columns, LayoutGrid, AlignCenter, FileText, Check, Copy,
  Quote, Zap, MoveUp, MoveDown, Pencil
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { funnelService } from '@/services/funnelService';
import { FunnelBlueprint, PageQuizSection, PageQuizSectionType, PageQuizBlueprintData, GridCardItem, TestimonialItem, FAQItem } from '@/types';
import { DEFAULT_SALES_PAGE_SECTIONS, DEFAULT_QUIZ_SECTIONS } from '../constants/vslPageTemplates';
import { toast } from 'sonner';

export default function PageQuizEditorView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.orgId;

  const [blueprint, setBlueprint] = useState<FunnelBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modo de Operação (Página de Vendas vs Quiz)
  const [mode, setMode] = useState<'sales_page' | 'quiz_funnel'>('sales_page');
  const [sections, setSections] = useState<PageQuizSection[]>(DEFAULT_SALES_PAGE_SECTIONS);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);

  // Simulador Interativo de Quiz
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorStepIndex, setSimulatorStepIndex] = useState(0);
  const [simulatorAnswers, setSimulatorAnswers] = useState<Record<string, string>>({});
  const [simulatorLoadingProgress, setSimulatorLoadingProgress] = useState(0);

  useEffect(() => {
    if (orgId && id) {
      loadData();
    }
  }, [orgId, id]);

  const loadData = async () => {
    if (!orgId || !id) return;
    setLoading(true);
    try {
      const data = await funnelService.getFunnel(orgId, id);
      if (data) {
        setBlueprint(data);
        const pageQuizMode = data.category === 'quiz_funnel' || data.pageQuizData?.mode === 'quiz_funnel' ? 'quiz_funnel' : 'sales_page';
        setMode(pageQuizMode);

        if (data.pageQuizData?.sections && data.pageQuizData.sections.length > 0) {
          setSections(data.pageQuizData.sections);
        } else {
          setSections(pageQuizMode === 'quiz_funnel' ? DEFAULT_QUIZ_SECTIONS : DEFAULT_SALES_PAGE_SECTIONS);
        }
      } else {
        toast.error('Ativo não encontrado.');
        navigate('/funnels');
      }
    } catch (err) {
      console.error('Erro ao carregar:', err);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = (
    type: PageQuizSectionType, 
    layout: '1_col_center' | '2_col_split' | '2_col_reverse' | '3_col_grid' | 'tsl_letter' = '1_col_center',
    atIndex?: number
  ) => {
    const newSec: PageQuizSection = {
      id: `sec-${Date.now()}`,
      type,
      layoutColumns: layout,
      title: type === 'quiz_question' ? `Passo ${sections.length + 1}: Pergunta` : `Dobra: Nova Seção`,
      headline: layout === 'tsl_letter' ? 'Uma Carta Aberta Para Quem Quer Multiplicar Suas Vendas' : 'Título da Seção de Alta Conversão',
      subtitle: 'Subtítulo explicativo com a promessa ou direcionamento do lead.',
      badge: type === 'hero_vsl' ? '🔥 Oferta Especial' : '✨ Exclusivo',
      ...(layout === '2_col_split' || layout === '2_col_reverse' ? {
        bullets: [
          'Vantagem 1: Implementação rápida sem precisar programar',
          'Vantagem 2: Método testado e validado em centenas de operações',
          'Vantagem 3: Suporte prioritário e atualizações semanais'
        ],
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        buttonText: 'QUERO COMEÇAR AGORA',
        buttonLink: '#pricing'
      } : {}),
      ...(layout === '3_col_grid' ? {
        gridCards: [
          { id: `c-1-${Date.now()}`, title: 'Módulo 1: Estratégia', description: 'Fundamentos essenciais para começar com o pé direito.', badge: 'Básico' },
          { id: `c-2-${Date.now()}`, title: 'Módulo 2: Fechamento', description: 'Técnicas de persuasão para fechar vendas no WhatsApp.', badge: 'Prático' },
          { id: `c-3-${Date.now()}`, title: 'Módulo 3: Escala', description: 'Como duplicar faturamento com equipe comercial.', badge: 'Avançado' }
        ]
      } : {}),
      ...(layout === 'tsl_letter' ? {
        bodyText: 'Prezado empreendedor,\n\nSe você chegou até aqui, é porque sabe que o método tradicional de vendas não funciona mais. Durante os últimos 5 anos, nós desenvolvemos um protocolo secreto capaz de transformar desconhecidos em compradores fiéis em menos de 10 minutos de conversa.\n\nE hoje, eu decidi abrir essa caixa preta para você.'
      } : {}),
      ...(type === 'hero_vsl' ? {
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        buttonText: 'QUERO DESBLOQUEAR MEU ACESSO AGORA',
        buttonLink: '#pricing'
      } : {}),
      ...(type === 'quiz_question' ? {
        quizQuestion: {
          questionType: 'single_choice',
          options: [
            { id: `opt-1-${Date.now()}`, label: 'Opção 1: Quero aumentar minhas vendas', score: 10 },
            { id: `opt-2-${Date.now()}`, label: 'Opção 2: Quero automatizar meu atendimento', score: 20 }
          ]
        }
      } : {})
    };

    if (atIndex !== undefined && atIndex >= 0) {
      const newSections = [...sections];
      newSections.splice(atIndex + 1, 0, newSec);
      setSections(newSections);
    } else {
      setSections(prev => [...prev, newSec]);
    }
    setInsertAfterIndex(null);
    toast.success('Bloco inserido na página!');
  };

  const handleUpdateSection = (secId: string, updates: Partial<PageQuizSection>) => {
    setSections(prev => prev.map(s => s.id === secId ? { ...s, ...updates } : s));
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    setSections(newSections);
  };

  const handleDuplicateSection = (index: number) => {
    const sec = sections[index];
    const cloned: PageQuizSection = {
      ...JSON.parse(JSON.stringify(sec)),
      id: `sec-${Date.now()}`,
      title: `${sec.title} (Cópia)`
    };
    const newSections = [...sections];
    newSections.splice(index + 1, 0, cloned);
    setSections(newSections);
    toast.success('Seção duplicada!');
  };

  const handleDeleteSection = (secId: string) => {
    if (sections.length <= 1) {
      toast.error('A página deve ter pelo menos um bloco.');
      return;
    }
    setSections(prev => prev.filter(s => s.id !== secId));
  };

  const handleSave = async () => {
    if (!orgId || !id || !blueprint) return;
    setSaving(true);
    try {
      const pageQuizData: PageQuizBlueprintData = {
        mode,
        sections
      };

      await funnelService.updateFunnel(orgId, id, {
        ...blueprint,
        category: mode === 'quiz_funnel' ? 'quiz_funnel' : 'sales_page',
        pageQuizData
      });
      toast.success(mode === 'quiz_funnel' ? 'Quiz salvo com sucesso!' : 'Página de Vendas salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar dados.');
    } finally {
      setSaving(false);
    }
  };

  // Efeito do simulador de quiz
  useEffect(() => {
    let interval: any;
    if (isSimulatorOpen && sections[simulatorStepIndex]?.type === 'quiz_diagnostic_loading') {
      setSimulatorLoadingProgress(0);
      interval = setInterval(() => {
        setSimulatorLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              if (simulatorStepIndex < sections.length - 1) {
                setSimulatorStepIndex(prevStep => prevStep + 1);
              }
            }, 600);
            return 100;
          }
          return prev + 20;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isSimulatorOpen, simulatorStepIndex, sections]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#050914] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Carregando Estúdio Visual...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050914] text-white overflow-hidden">
      
      {/* ── CABEÇALHO DO ESTÚDIO VISUAL ──────────────────────────────────────── */}
      <header className="h-16 bg-[#080e21]/95 border-b border-white/10 px-6 flex items-center justify-between z-30 shrink-0 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/funnels')}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                mode === 'quiz_funnel'
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {mode === 'quiz_funnel' ? '🧠 Quiz Interativo' : '📄 Construtor de Páginas'}
              </span>
              <span className="text-xs text-gray-500">•</span>
              <input
                type="text"
                value={blueprint?.title || ''}
                onChange={(e) => setBlueprint(prev => prev ? { ...prev, title: e.target.value } : null)}
                className="bg-transparent font-black text-sm lg:text-base text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                placeholder="Título do Ativo..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Alternador de Modo Página vs Quiz */}
          <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl text-xs">
            <button
              onClick={() => setMode('sales_page')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                mode === 'sales_page' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Modo Página
            </button>
            <button
              onClick={() => setMode('quiz_funnel')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                mode === 'quiz_funnel' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Modo Quiz
            </button>
          </div>

          {/* Alternador de Dispositivo (Desktop vs Mobile) */}
          <div className="hidden sm:flex items-center bg-black/40 border border-white/10 p-1 rounded-xl text-xs">
            <button
              onClick={() => setDeviceView('desktop')}
              className={`p-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                deviceView === 'desktop' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
              title="Visualização Desktop"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                deviceView === 'mobile' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
              title="Visualização Mobile"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          {mode === 'quiz_funnel' && (
            <button
              onClick={() => {
                setSimulatorStepIndex(0);
                setSimulatorAnswers({});
                setIsSimulatorOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-500/40 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 text-indigo-300" />
              <span>Simulador de Quiz</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/25 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </header>

      {/* ── CORPO PRINCIPAL: CANVAS VISUAL DA PÁGINA ────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Barra Lateral Esquerda: Paleta de Blocos Rápidos */}
        <div className="w-72 bg-[#080d1e] border-r border-white/10 p-4 flex flex-col gap-3 shrink-0 overflow-y-auto custom-scrollbar">
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Blocos & Disposições
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Clique para adicionar na página:
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleAddSection('hero_vsl', '1_col_center')}
              className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
            >
              <div>
                <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                  <AlignCenter className="w-3.5 h-3.5 text-indigo-400" />
                  Hero VSL (1 Coluna)
                </h5>
                <p className="text-[10px] text-gray-400">Headline + Vídeo + Botão</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
            </button>

            <button
              onClick={() => handleAddSection('pain_mirror', '2_col_split')}
              className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
            >
              <div>
                <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5 text-rose-400" />
                  Split: Texto + VSL / Imagem
                </h5>
                <p className="text-[10px] text-gray-400">Copy na esq. + Vídeo na dir.</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
            </button>

            <button
              onClick={() => handleAddSection('authority_bio', '2_col_reverse')}
              className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
            >
              <div>
                <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5 text-cyan-400" />
                  Split: Imagem + Texto
                </h5>
                <p className="text-[10px] text-gray-400">Foto na esq. + Bullets na dir.</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
            </button>

            <button
              onClick={() => handleAddSection('module_grid', '3_col_grid')}
              className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
            >
              <div>
                <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                  Grade 3 Colunas (Cards)
                </h5>
                <p className="text-[10px] text-gray-400">3 Módulos ou Entregáveis</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
            </button>

            <button
              onClick={() => handleAddSection('social_proof_wall', '3_col_grid')}
              className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
            >
              <div>
                <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                  Depoimentos / Provas Sociais
                </h5>
                <p className="text-[10px] text-gray-400">Prints de WhatsApp & Relatos</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
            </button>

            <button
              onClick={() => handleAddSection('pricing_box', '1_col_center')}
              className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
            >
              <div>
                <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Box de Oferta & Checkout
                </h5>
                <p className="text-[10px] text-gray-400">Preço, parcelas e CTA</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
            </button>

            <button
              onClick={() => handleAddSection('pain_mirror', 'tsl_letter')}
              className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
            >
              <div>
                <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Carta de Vendas (TSL)
                </h5>
                <p className="text-[10px] text-gray-400">Texto corrido persuasivo</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
            </button>

            <button
              onClick={() => handleAddSection('faq_accordion', '1_col_center')}
              className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
            >
              <div>
                <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
                  FAQ em Acordeão
                </h5>
                <p className="text-[10px] text-gray-400">Quebra de 8 objeções</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* ── ÁREA CENTRAL: WIREFRAME VISUAL DA PÁGINA COM SCROLL ────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 bg-[#040712] flex justify-center">
          
          <div 
            className={`transition-all duration-300 bg-[#090e1f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col ${
              deviceView === 'mobile' ? 'w-full max-w-[390px] min-h-[750px]' : 'w-full max-w-5xl'
            }`}
          >
            {/* Top Bar da Janela Simulada */}
            <div className="px-4 py-2.5 bg-black/60 border-b border-white/10 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[11px] font-mono text-gray-500 ml-2">https://seusite.com.br/oferta</span>
              </div>
              <span className="text-[10px] font-bold text-gray-500">
                {sections.length} dobras • {deviceView.toUpperCase()}
              </span>
            </div>

            {/* Conteúdo Renderizado da Página de Vendas */}
            <div className="divide-y divide-white/5">
              {sections.map((sec, index) => {
                const layout = sec.layoutColumns || '1_col_center';
                const isSelected = activeSectionId === sec.id;

                return (
                  <div
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`relative p-6 lg:p-10 transition-all group ${
                      isSelected ? 'bg-indigo-950/20 ring-1 ring-indigo-500/50' : 'hover:bg-white/[0.01]'
                    }`}
                  >
                    {/* Barra Flutuante de Ferramentas da Dobra */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center gap-1.5 bg-black/90 border border-white/10 p-1.5 rounded-xl shadow-xl backdrop-blur-md">
                      {/* Seletor Rápido de Layout */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateSection(sec.id, { layoutColumns: '1_col_center' });
                        }}
                        className={`p-1.5 rounded-lg text-xs ${layout === '1_col_center' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        title="1 Coluna Centralizada"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateSection(sec.id, { layoutColumns: '2_col_split' });
                        }}
                        className={`p-1.5 rounded-lg text-xs ${layout === '2_col_split' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        title="2 Colunas: Texto na Esquerda + Vídeo/Imagem na Direita"
                      >
                        <Columns className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateSection(sec.id, { layoutColumns: '3_col_grid' });
                        }}
                        className={`p-1.5 rounded-lg text-xs ${layout === '3_col_grid' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        title="3 Colunas em Grade"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateSection(sec.id, { layoutColumns: 'tsl_letter' });
                        }}
                        className={`p-1.5 rounded-lg text-xs ${layout === 'tsl_letter' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        title="Carta de Vendas TSL"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-px h-4 bg-white/10" />

                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveSection(index, 'up'); }}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white disabled:opacity-20"
                        title="Mover para Cima"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveSection(index, 'down'); }}
                        disabled={index === sections.length - 1}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white disabled:opacity-20"
                        title="Mover para Baixo"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicateSection(index); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white"
                        title="Duplicar Dobra"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.id); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400"
                        title="Excluir Dobra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* ── RENDERIZAÇÃO DO LAYOUT SELECIONADO ── */}

                    {/* 1. LAYOUT: 1 COLUNA CENTRALIZADO (HERO / VSL / PREÇO / FAQ) */}
                    {layout === '1_col_center' && (
                      <div className="space-y-5 text-center max-w-3xl mx-auto">
                        {sec.badge && (
                          <input
                            type="text"
                            value={sec.badge}
                            onChange={(e) => handleUpdateSection(sec.id, { badge: e.target.value })}
                            className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase px-3 py-1 rounded-full text-center focus:outline-none focus:ring-1 focus:ring-indigo-400 inline-block"
                          />
                        )}

                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          placeholder="Digite a Headline de Alta Conversão..."
                          className="w-full bg-transparent font-black text-xl sm:text-2xl lg:text-3xl text-white text-center leading-tight focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded-xl p-1 resize-none"
                        />

                        {sec.subtitle && (
                          <input
                            type="text"
                            value={sec.subtitle || ''}
                            onChange={(e) => handleUpdateSection(sec.id, { subtitle: e.target.value })}
                            placeholder="Subtítulo da promessa..."
                            className="w-full bg-transparent text-xs sm:text-sm text-gray-300 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded-lg p-1"
                          />
                        )}

                        {/* Player de Vídeo Centralizado */}
                        {(sec.type === 'hero_vsl' || sec.videoUrl) && (
                          <div className="aspect-video bg-black/80 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-4 relative group/video overflow-hidden shadow-2xl my-4">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shadow-lg group-hover/video:scale-110 transition-transform">
                              <Play className="w-8 h-8 ml-1" />
                            </div>
                            <span className="text-[11px] text-gray-400 mt-2 font-bold">🎬 Player VSL (Delay aos {sec.videoDelaySeconds || 180}s)</span>
                          </div>
                        )}

                        {/* Box de Preço e Oferta */}
                        {sec.type === 'pricing_box' && sec.pricingData && (
                          <div className="p-6 bg-gradient-to-b from-[#0e1738] to-[#080d21] border-2 border-emerald-500/40 rounded-3xl space-y-4 text-center my-6 shadow-2xl shadow-emerald-500/10">
                            <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                              Condição Especial de Lançamento
                            </span>
                            <div className="text-3xl sm:text-4xl font-black text-white">
                              {sec.pricingData.installments || `R$ ${sec.pricingData.offerPrice}`}
                            </div>
                            <p className="text-xs text-gray-400">ou R$ {sec.pricingData.offerPrice} à vista no Pix</p>
                            
                            <div className="space-y-2 text-left text-xs max-w-sm mx-auto pt-2 border-t border-white/10">
                              {sec.pricingData.bonusList?.map((bonus, bIdx) => (
                                <div key={bIdx} className="flex items-center gap-2 text-gray-300">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <span>{bonus}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* FAQ em Acordeão */}
                        {sec.type === 'faq_accordion' && (
                          <div className="space-y-2 text-left max-w-2xl mx-auto pt-4">
                            {sec.faqItems?.map((faq, fIdx) => (
                              <div key={faq.id} className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-1">
                                <h5 className="text-xs font-bold text-white flex items-center justify-between">
                                  <span>{faq.question}</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                </h5>
                                <p className="text-[11px] text-gray-400">{faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Botão de Chamada para Ação */}
                        {sec.buttonText && (
                          <div className="pt-2">
                            <input
                              type="text"
                              value={sec.buttonText}
                              onChange={(e) => handleUpdateSection(sec.id, { buttonText: e.target.value })}
                              className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer inline-block"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. LAYOUT: 2 COLUNAS (SPLIT 50/50 - TEXTO + VSL OU IMAGEM) */}
                    {(layout === '2_col_split' || layout === '2_col_reverse') && (
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center ${layout === '2_col_reverse' ? 'md:flex-row-reverse' : ''}`}>
                        {/* Coluna de Texto & Bullets */}
                        <div className="space-y-4">
                          {sec.badge && (
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                              {sec.badge}
                            </span>
                          )}
                          <textarea
                            rows={2}
                            value={sec.headline || ''}
                            onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                            placeholder="Headline do Bloco..."
                            className="w-full bg-transparent font-black text-xl lg:text-2xl text-white leading-tight focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl p-1 resize-none"
                          />
                          {sec.subtitle && (
                            <p className="text-xs text-gray-300">{sec.subtitle}</p>
                          )}

                          {sec.bullets && (
                            <div className="space-y-2 pt-2">
                              {sec.bullets.map((bullet, bIdx) => (
                                <div key={bIdx} className="flex items-start gap-2.5 text-xs text-gray-200">
                                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                  <input
                                    type="text"
                                    value={bullet}
                                    onChange={(e) => {
                                      const updated = [...(sec.bullets || [])];
                                      updated[bIdx] = e.target.value;
                                      handleUpdateSection(sec.id, { bullets: updated });
                                    }}
                                    className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {sec.buttonText && (
                            <button className="px-6 py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30">
                              {sec.buttonText}
                            </button>
                          )}
                        </div>

                        {/* Coluna de Mídia (Player de Vídeo ou Imagem) */}
                        <div>
                          {sec.videoUrl ? (
                            <div className="aspect-video bg-black/80 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-4 shadow-xl">
                              <Play className="w-10 h-10 text-indigo-400 mb-2" />
                              <span className="text-xs font-bold text-gray-300">🎬 VSL / Vídeo na Direita</span>
                            </div>
                          ) : (
                            <div className="aspect-square max-h-80 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                              <img
                                src={sec.imageUrl || 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80'}
                                alt="Mockup"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 3. LAYOUT: 3 COLUNAS EM GRADE (CARDS / MÓDULOS / DEPOIMENTOS) */}
                    {layout === '3_col_grid' && (
                      <div className="space-y-6 text-center">
                        <div>
                          {sec.badge && (
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                              {sec.badge}
                            </span>
                          )}
                          <h3 className="text-xl lg:text-2xl font-black text-white mt-2">
                            {sec.headline || 'Grade de Entregáveis / Provas'}
                          </h3>
                          {sec.subtitle && (
                            <p className="text-xs text-gray-300 mt-1">{sec.subtitle}</p>
                          )}
                        </div>

                        {/* Grade de 3 Cards de Conteúdo */}
                        {sec.gridCards && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                            {sec.gridCards.map((card, cIdx) => (
                              <div key={card.id} className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-2 hover:border-indigo-500/40 transition-colors">
                                <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                  {card.badge || `Card ${cIdx + 1}`}
                                </span>
                                <input
                                  type="text"
                                  value={card.title}
                                  onChange={(e) => {
                                    const updated = [...(sec.gridCards || [])];
                                    updated[cIdx] = { ...card, title: e.target.value };
                                    handleUpdateSection(sec.id, { gridCards: updated });
                                  }}
                                  className="w-full bg-transparent font-bold text-xs text-white focus:outline-none"
                                />
                                <textarea
                                  rows={2}
                                  value={card.description}
                                  onChange={(e) => {
                                    const updated = [...(sec.gridCards || [])];
                                    updated[cIdx] = { ...card, description: e.target.value };
                                    handleUpdateSection(sec.id, { gridCards: updated });
                                  }}
                                  className="w-full bg-transparent text-[11px] text-gray-400 focus:outline-none resize-none"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Grade de Depoimentos */}
                        {sec.testimonials && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                            {sec.testimonials.map((test, tIdx) => (
                              <div key={test.id} className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-2">
                                <div className="flex items-center gap-1 text-amber-400">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-amber-400" />
                                  ))}
                                </div>
                                <p className="text-xs text-gray-300 italic">"{test.quote}"</p>
                                <div className="pt-2 border-t border-white/5">
                                  <h6 className="text-xs font-bold text-white">{test.name}</h6>
                                  <span className="text-[10px] text-gray-500">{test.role}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. LAYOUT: CARTA DE VENDAS (TSL - LONG FORM COPY) */}
                    {layout === 'tsl_letter' && (
                      <div className="max-w-2xl mx-auto space-y-5 bg-black/30 border border-amber-500/20 p-6 lg:p-8 rounded-3xl">
                        <div className="border-b border-amber-500/20 pb-3 text-center">
                          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                            📜 Carta de Vendas Especial
                          </span>
                          <h3 className="text-lg lg:text-xl font-black text-white mt-1">
                            {sec.headline}
                          </h3>
                        </div>

                        <textarea
                          rows={8}
                          value={sec.bodyText || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { bodyText: e.target.value })}
                          className="w-full bg-transparent text-xs sm:text-sm text-gray-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded-xl p-2 resize-y font-serif custom-scrollbar"
                          placeholder="Escreva a carta de vendas em texto corrido com gatilhos de copy..."
                        />

                        <div className="p-4 bg-amber-500/10 border-l-4 border-amber-400 rounded-r-xl text-xs text-amber-200">
                          <strong>Importante:</strong> Esta carta de vendas simula a leitura do lead com ênfase nas palavras-chave e quebras de ceticismo.
                        </div>
                      </div>
                    )}

                    {/* Inserir Bloco Entre Seções */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={() => handleAddSection('hero_vsl', '2_col_split', index)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-indigo-600/50"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Inserir Bloco Aqui</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>

      {/* ── 📱 MODAL DO SIMULADOR DE QUIZ AO VIVO ───────────────────────────── */}
      {isSimulatorOpen && (
        <div 
          onClick={() => setIsSimulatorOpen(false)}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm h-[720px] bg-[#060a16] border border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Topo do Simulador */}
            <div className="p-3.5 bg-black/80 border-b border-white/10 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                Simulador Ao Vivo • Passo {simulatorStepIndex + 1}/{sections.length}
              </span>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tela Interativa do Quiz */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-[#090f24] to-[#040711] flex flex-col justify-between">
              {(() => {
                const currentSec = sections[simulatorStepIndex];
                if (!currentSec) return null;

                return (
                  <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-4">
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${Math.round(((simulatorStepIndex + 1) / sections.length) * 100)}%` }}
                      />
                    </div>

                    <h3 className="text-base font-black text-white leading-snug">
                      {currentSec.headline || currentSec.title}
                    </h3>
                    {currentSec.subtitle && (
                      <p className="text-xs text-gray-300">{currentSec.subtitle}</p>
                    )}

                    {currentSec.videoUrl && (
                      <div className="aspect-video bg-black/60 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden my-4 shadow-xl">
                        <Play className="w-10 h-10 text-indigo-400 opacity-80" />
                      </div>
                    )}

                    {currentSec.type === 'quiz_diagnostic_loading' && (
                      <div className="py-8 space-y-4 text-center">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-200"
                            style={{ width: `${simulatorLoadingProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-emerald-300 font-bold">{simulatorLoadingProgress}% concluído</p>
                      </div>
                    )}

                    {currentSec.quizQuestion && (
                      <div className="space-y-2 text-left pt-2">
                        {currentSec.quizQuestion.options.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setSimulatorAnswers(prev => ({ ...prev, [currentSec.id]: opt.id }));
                              if (simulatorStepIndex < sections.length - 1) {
                                setSimulatorStepIndex(prev => prev + 1);
                              }
                            }}
                            className="w-full p-3 rounded-xl bg-white/[0.04] hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/50 text-white text-xs font-bold transition-all flex items-center justify-between group active:scale-[0.98]"
                          >
                            <span>{opt.label}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all" />
                          </button>
                        ))}
                      </div>
                    )}

                    {currentSec.pricingData && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3 text-center my-4">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                          Oferta Recomendada
                        </span>
                        <div className="text-2xl font-black text-white">
                          {currentSec.pricingData.installments || `R$ ${currentSec.pricingData.offerPrice}`}
                        </div>
                        <button
                          onClick={() => toast.success('Checkout acessado!')}
                          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25"
                        >
                          QUERO COMEÇAR AGORA
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <button
                  onClick={() => setSimulatorStepIndex(prev => Math.max(0, prev - 1))}
                  disabled={simulatorStepIndex === 0}
                  className="text-xs text-gray-400 hover:text-white disabled:opacity-20"
                >
                  ← Voltar
                </button>
                <button
                  onClick={() => {
                    if (simulatorStepIndex < sections.length - 1) {
                      setSimulatorStepIndex(prev => prev + 1);
                    }
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  Avançar →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
