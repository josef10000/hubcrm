import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Smartphone, Monitor, Play, 
  Sparkles, Eye, ChevronUp, ChevronDown, CheckCircle2, 
  HelpCircle, MessageCircle, DollarSign, ShieldCheck, Video, 
  Image as ImageIcon, Layers, RefreshCw, X, ArrowRight, Star
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { funnelService } from '@/services/funnelService';
import { FunnelBlueprint, PageQuizSection, PageQuizSectionType, PageQuizBlueprintData } from '@/types';
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

  // Simulador Interativo
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorDevice, setSimulatorDevice] = useState<'mobile' | 'desktop'>('mobile');
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

  const handleAddSection = (type: PageQuizSectionType) => {
    const newSec: PageQuizSection = {
      id: `sec-${Date.now()}`,
      type,
      title: type === 'quiz_question' ? `Passo ${sections.length + 1}: Pergunta` : `Dobra ${sections.length + 1}: Nova Seção`,
      headline: 'Título da Seção de Alta Conversão',
      subtitle: 'Subtítulo explicativo com a promessa ou direcionamento do lead.',
      ...(type === 'quiz_question' ? {
        quizQuestion: {
          questionType: 'single_choice',
          options: [
            { id: `opt-1-${Date.now()}`, label: 'Opção A', score: 10 },
            { id: `opt-2-${Date.now()}`, label: 'Opção B', score: 20 }
          ]
        }
      } : {}),
      ...(type === 'hero_vsl' ? {
        buttonText: 'QUERO COMEÇAR AGORA',
        buttonLink: '#pricing'
      } : {})
    };

    setSections(prev => [...prev, newSec]);
    toast.success('Seção adicionada com sucesso!');
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

  const handleDeleteSection = (secId: string) => {
    if (sections.length <= 1) {
      toast.error('Deve haver pelo menos uma seção.');
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

  // Efeito para animação da tela de carregamento do simulador
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
          return prev + 15;
        });
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isSimulatorOpen, simulatorStepIndex, sections]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#050914] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Carregando Construtor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050914] text-white overflow-hidden">
      
      {/* ── CABEÇALHO ────────────────────────────────────────────────────────── */}
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
                {mode === 'quiz_funnel' ? '🧠 Quiz Interativo' : '📄 Página de Vendas'}
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

          <button
            onClick={() => {
              setSimulatorStepIndex(0);
              setSimulatorAnswers({});
              setIsSimulatorOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-500/40 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 text-indigo-300" />
            <span>Simulador Interativo</span>
          </button>

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

      {/* ── CORPO PRINCIPAL ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Painel Central: Lista de Dobras / Passos */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  {mode === 'quiz_funnel' ? 'Estrutura de Passos do Quiz' : 'Estrutura de Dobras da Página de Vendas'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {mode === 'quiz_funnel'
                    ? 'Cada bloco representa um passo interativo ou tela que o usuário visualiza no quiz.'
                    : 'Cada bloco representa uma seção vertical da página de vendas da primeira até a última dobra.'}
                </p>
              </div>
              <span className="text-xs font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                {sections.length} {mode === 'quiz_funnel' ? 'passos configurados' : 'dobras configuradas'}
              </span>
            </div>

            {/* Lista de Seções / Passos */}
            <div className="space-y-5">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className="rounded-2xl border border-white/10 bg-[#090e1f] hover:border-white/20 transition-all overflow-hidden shadow-lg"
                >
                  {/* Cabeçalho da Dobra / Passo */}
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-black flex items-center justify-center shrink-0 border border-indigo-500/30">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                        className="bg-transparent font-bold text-xs lg:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
                        {section.type}
                      </span>

                      <button
                        onClick={() => handleMoveSection(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveSection(index, 'down')}
                        disabled={index === sections.length - 1}
                        className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-1 rounded-lg bg-white/5 hover:bg-rose-500 hover:text-white text-gray-400 transition-colors"
                        title="Excluir Seção"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Formulário de Configuração dos Campos da Dobra */}
                  <div className="p-4 space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Headline / Título Principal</label>
                      <input
                        type="text"
                        value={section.headline || ''}
                        onChange={(e) => handleUpdateSection(section.id, { headline: e.target.value })}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Título da seção..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Subtítulo / Texto de Apoio</label>
                      <input
                        type="text"
                        value={section.subtitle || ''}
                        onChange={(e) => handleUpdateSection(section.id, { subtitle: e.target.value })}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Subtítulo..."
                      />
                    </div>

                    {/* Vídeo / Mini-VSL */}
                    {(section.type === 'hero_vsl' || section.videoUrl !== undefined) && (
                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                        <label className="text-[10px] font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5" /> URL do Vídeo (YouTube / Vimeo / Panda / VTurb)
                        </label>
                        <input
                          type="url"
                          value={section.videoUrl || ''}
                          onChange={(e) => handleUpdateSection(section.id, { videoUrl: e.target.value })}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                          placeholder="https://..."
                        />
                      </div>
                    )}

                    {/* Opções de Pergunta do Quiz */}
                    {section.type === 'quiz_question' && (
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-purple-300 uppercase">
                            Opções de Resposta do Quiz
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const opts = section.quizQuestion?.options || [];
                              const newOpts = [...opts, { id: `opt-${Date.now()}`, label: `Nova Opção ${opts.length + 1}`, score: 10 }];
                              handleUpdateSection(section.id, {
                                quizQuestion: { questionType: 'single_choice', options: newOpts }
                              });
                            }}
                            className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Adicionar Opção</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {section.quizQuestion?.options.map((opt, optIdx) => (
                            <div key={opt.id} className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                              <span className="w-5 h-5 rounded bg-white/10 text-[10px] font-bold text-gray-300 flex items-center justify-center shrink-0">
                                {optIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) => {
                                  const updated = (section.quizQuestion?.options || []).map(o => o.id === opt.id ? { ...o, label: e.target.value } : o);
                                  handleUpdateSection(section.id, {
                                    quizQuestion: { questionType: 'single_choice', options: updated }
                                  });
                                }}
                                className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                                placeholder="Texto da opção..."
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (section.quizQuestion?.options || []).filter(o => o.id !== opt.id);
                                  handleUpdateSection(section.id, {
                                    quizQuestion: { questionType: 'single_choice', options: updated }
                                  });
                                }}
                                className="p-1 text-gray-500 hover:text-rose-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preço e Oferta */}
                    {section.type === 'pricing_box' && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                        <label className="text-[10px] font-bold text-emerald-300 uppercase flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5" /> Configuração do Preço da Oferta
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-gray-400 uppercase">Preço Promocional (R$)</span>
                            <input
                              type="number"
                              value={section.pricingData?.offerPrice || 297}
                              onChange={(e) => handleUpdateSection(section.id, {
                                pricingData: { ...(section.pricingData || { offerPrice: 297 }), offerPrice: Number(e.target.value) }
                              })}
                              className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-xs mt-1"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-400 uppercase">Parcelamento</span>
                            <input
                              type="text"
                              value={section.pricingData?.installments || '12x de R$ 29,70'}
                              onChange={(e) => handleUpdateSection(section.id, {
                                pricingData: { ...(section.pricingData || { offerPrice: 297 }), installments: e.target.value }
                              })}
                              className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-xs mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botão de Chamada para Ação */}
                    {(section.type === 'hero_vsl' || section.type === 'pricing_box') && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Texto do Botão (CTA)</label>
                          <input
                            type="text"
                            value={section.buttonText || ''}
                            onChange={(e) => handleUpdateSection(section.id, { buttonText: e.target.value })}
                            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs mt-1"
                            placeholder="Ex: QUERO GARANTIR MINHA VAGA"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Link de Destino / Checkout</label>
                          <input
                            type="text"
                            value={section.buttonLink || ''}
                            onChange={(e) => handleUpdateSection(section.id, { buttonLink: e.target.value })}
                            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs mt-1"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Barra Lateral Direita: Biblioteca de Blocos para Inserir */}
        <div className="w-80 bg-[#080d1e] border-l border-white/10 p-5 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Adicionar Nova Dobra / Passo
            </h3>
            <p className="text-[11px] text-gray-400 mt-1">
              {mode === 'quiz_funnel' ? 'Selecione um elemento para incluir no quiz:' : 'Selecione uma seção para a página de vendas:'}
            </p>
          </div>

          <div className="space-y-2">
            {mode === 'quiz_funnel' ? (
              <>
                <button
                  onClick={() => handleAddSection('quiz_question')}
                  className="w-full p-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-purple-200">❓ Pergunta de Diagnóstico</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">Múltipla escolha ou imagens</p>
                  </div>
                  <Plus className="w-4 h-4 text-purple-400" />
                </button>

                <button
                  onClick={() => handleAddSection('hero_vsl')}
                  className="w-full p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-indigo-200">🎬 Mini-VSL Intermediária</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">Vídeo curto de explicação</p>
                  </div>
                  <Plus className="w-4 h-4 text-indigo-400" />
                </button>

                <button
                  onClick={() => handleAddSection('quiz_diagnostic_loading')}
                  className="w-full p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-amber-200">⏳ Tela de Análise / Espera</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">"Calculando seu perfil..."</p>
                  </div>
                  <Plus className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  onClick={() => handleAddSection('quiz_result_pitch')}
                  className="w-full p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-emerald-200">🎁 Resultado + Oferta</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">Diagnóstico e checkout final</p>
                  </div>
                  <Plus className="w-4 h-4 text-emerald-400" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleAddSection('hero_vsl')}
                  className="w-full p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-indigo-200">🎬 Hero Section com VSL</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">Dobra 1: Headline, Vídeo e CTA</p>
                  </div>
                  <Plus className="w-4 h-4 text-indigo-400" />
                </button>

                <button
                  onClick={() => handleAddSection('pain_mirror')}
                  className="w-full p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-rose-200">🎯 Espelho da Dor & Qualificação</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">Para quem é / Para quem não é</p>
                  </div>
                  <Plus className="w-4 h-4 text-rose-400" />
                </button>

                <button
                  onClick={() => handleAddSection('social_proof_wall')}
                  className="w-full p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-blue-200">💬 Provas Sociais & Depoimentos</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">Prints e relatos reais de clientes</p>
                  </div>
                  <Plus className="w-4 h-4 text-blue-400" />
                </button>

                <button
                  onClick={() => handleAddSection('pricing_box')}
                  className="w-full p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-emerald-200">💰 Box de Preço & Oferta</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">Tabela de checkout e parcelamento</p>
                  </div>
                  <Plus className="w-4 h-4 text-emerald-400" />
                </button>

                <button
                  onClick={() => handleAddSection('faq_accordion')}
                  className="w-full p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-amber-200">❓ FAQ & Quebra de Dúvidas</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">Perguntas frequentes em acordeão</p>
                  </div>
                  <Plus className="w-4 h-4 text-amber-400" />
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── 📱 MODAL DO SIMULADOR INTERATIVO (TEST DRIVE DO QUIZ / PÁGINA) ─── */}
      {isSimulatorOpen && (
        <div 
          onClick={() => setIsSimulatorOpen(false)}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`bg-[#060a16] border border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 max-h-[90vh] ${
              simulatorDevice === 'mobile' ? 'w-full max-w-sm h-[720px]' : 'w-full max-w-4xl h-[780px]'
            }`}
          >
            {/* Topo do Simulador */}
            <div className="p-3.5 bg-black/80 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Simulador Ao Vivo
                </span>
                <span className="text-xs text-gray-400 font-bold">
                  {mode === 'quiz_funnel' ? `Passo ${simulatorStepIndex + 1}/${sections.length}` : 'Visualização da Página'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSimulatorDevice('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${simulatorDevice === 'mobile' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Modo Celular"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSimulatorDevice('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${simulatorDevice === 'desktop' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Modo Computador"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsSimulatorOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tela Interativa do Simulador */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-[#090f24] to-[#040711] flex flex-col">
              {mode === 'quiz_funnel' ? (
                // ── SIMULAÇÃO DE QUIZ PASSO A PASSO
                (() => {
                  const currentSec = sections[simulatorStepIndex];
                  if (!currentSec) return null;

                  return (
                    <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full space-y-6 animate-in fade-in slide-in-from-right-4">
                      {/* Barra de Progresso do Quiz */}
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${Math.round(((simulatorStepIndex + 1) / sections.length) * 100)}%` }}
                        />
                      </div>

                      <div className="space-y-4 text-center">
                        <h3 className="text-base lg:text-lg font-black text-white leading-snug">
                          {currentSec.headline || currentSec.title}
                        </h3>
                        {currentSec.subtitle && (
                          <p className="text-xs text-gray-300">{currentSec.subtitle}</p>
                        )}

                        {/* Se for vídeo */}
                        {currentSec.videoUrl && (
                          <div className="aspect-video bg-black/60 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden my-4 shadow-xl">
                            <Play className="w-12 h-12 text-indigo-400 opacity-80" />
                          </div>
                        )}

                        {/* Se for tela de carregamento */}
                        {currentSec.type === 'quiz_diagnostic_loading' && (
                          <div className="py-8 space-y-4 text-center">
                            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-200"
                                style={{ width: `${simulatorLoadingProgress}%` }}
                              />
                            </div>
                            <p className="text-xs text-emerald-300 font-bold">{simulatorLoadingProgress}% concluído</p>
                          </div>
                        )}

                        {/* Se for opções de pergunta */}
                        {currentSec.quizQuestion && (
                          <div className="space-y-2.5 text-left pt-2">
                            {currentSec.quizQuestion.options.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  setSimulatorAnswers(prev => ({ ...prev, [currentSec.id]: opt.id }));
                                  if (simulatorStepIndex < sections.length - 1) {
                                    setSimulatorStepIndex(prev => prev + 1);
                                  }
                                }}
                                className="w-full p-3.5 rounded-xl bg-white/[0.04] hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/50 text-white text-xs font-bold transition-all flex items-center justify-between group active:scale-[0.98]"
                              >
                                <span>{opt.label}</span>
                                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Se for resultado com preço */}
                        {currentSec.pricingData && (
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3 text-center my-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                              Oferta Exclusiva Recomendada
                            </span>
                            <div className="text-2xl font-black text-white">
                              {currentSec.pricingData.installments || `R$ ${currentSec.pricingData.offerPrice}`}
                            </div>
                            <button
                              onClick={() => toast.success('Redirecionando para o checkout...')}
                              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25"
                            >
                              QUERO COMEÇAR AGORA
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Navegação Inferior do Quiz */}
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
                  );
                })()
              ) : (
                // ── SIMULAÇÃO DA PÁGINA DE VENDAS COMPLETA (ROLAGEM VERTICAL)
                <div className="max-w-2xl mx-auto space-y-12 py-4">
                  {sections.map(sec => (
                    <div key={sec.id} className="space-y-4 text-center border-b border-white/5 pb-8">
                      {sec.badge && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {sec.badge}
                        </span>
                      )}
                      <h2 className="text-xl lg:text-2xl font-black text-white leading-tight">
                        {sec.headline || sec.title}
                      </h2>
                      {sec.subtitle && (
                        <p className="text-xs lg:text-sm text-gray-300">{sec.subtitle}</p>
                      )}

                      {sec.videoUrl && (
                        <div className="aspect-video bg-black/80 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl my-4">
                          <Play className="w-14 h-14 text-indigo-400" />
                        </div>
                      )}

                      {sec.buttonText && (
                        <button
                          onClick={() => toast.info('Simulação: CTA clicado!')}
                          className="px-6 py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-xs lg:text-sm font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/30 hover:scale-105 transition-transform"
                        >
                          {sec.buttonText}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
