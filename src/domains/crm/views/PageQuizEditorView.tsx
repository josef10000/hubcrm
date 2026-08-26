import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Smartphone, Monitor, Play, 
  Sparkles, Eye, ChevronUp, ChevronDown, CheckCircle2, 
  HelpCircle, MessageCircle, DollarSign, ShieldCheck, Video, 
  Image as ImageIcon, Layers, RefreshCw, X, ArrowRight, Star,
  Columns, LayoutGrid, AlignCenter, FileText, Check, Copy,
  Quote, Zap, MoveUp, MoveDown, Pencil, Download, Code,
  Clock, Shield, CreditCard, Lock, CheckCheck, XCircle,
  AlertTriangle, User, Phone, Mail
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { funnelService } from '@/services/funnelService';
import { FunnelBlueprint, PageQuizSection, PageQuizSectionType, PageQuizBlueprintData, GridCardItem, TestimonialItem, FAQItem, QuizOptionItem } from '@/types';
import { DEFAULT_SALES_PAGE_SECTIONS, DEFAULT_QUIZ_SECTIONS } from '../constants/vslPageTemplates';
import { toast } from 'sonner';

export default function PageQuizEditorView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.orgId;

  const [blueprint, setBlueprint] = useState<FunnelBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Modal de Confirmação para Salvar Rascunho ao Sair
  const [showExitModal, setShowExitModal] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  // Modo Fixo derivado do Ativo (Página de Vendas vs Quiz)
  const [mode, setMode] = useState<'sales_page' | 'quiz_funnel'>('sales_page');
  const [sections, setSections] = useState<PageQuizSection[]>(DEFAULT_SALES_PAGE_SECTIONS);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Simulador Online (Visualização Real da Página)
  const [isOnlinePreviewOpen, setIsOnlinePreviewOpen] = useState(false);
  const [onlinePreviewDevice, setOnlinePreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Simulador Interativo de Quiz
  const [isQuizSimulatorOpen, setIsQuizSimulatorOpen] = useState(false);
  const [quizSimulatorStepIndex, setQuizSimulatorStepIndex] = useState(0);
  const [quizSimulatorAnswers, setQuizSimulatorAnswers] = useState<Record<string, string>>({});
  const [quizSimulatorProgress, setQuizSimulatorProgress] = useState(0);
  const [simulatorLeadName, setSimulatorLeadName] = useState('');
  const [simulatorLeadPhone, setSimulatorLeadPhone] = useState('');

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
    setIsDirty(true);
    const newSec: PageQuizSection = {
      id: `sec-${Date.now()}`,
      type,
      layoutColumns: layout,
      title: type === 'quiz_question' ? `Passo ${sections.length + 1}: Pergunta` : `Dobra: Nova Seção`,
      headline: 'Título da Seção de Alta Conversão',
      subtitle: 'Subtítulo explicativo com a promessa ou direcionamento do lead.',
      badge: '✨ Destaque',
      
      // Defaults por tipo
      ...(type === 'quiz_question' ? {
        headline: 'Qual é o seu principal objetivo no momento?',
        subtitle: 'Selecione a opção que melhor se alinha com seu momento atual:',
        quizQuestion: {
          questionType: 'single_choice',
          options: [
            { id: `opt-1-${Date.now()}`, label: 'Quero atrair mais leads qualificados todos os dias', score: 10 },
            { id: `opt-2-${Date.now()}`, label: 'Quero aumentar minha taxa de fechamento no WhatsApp', score: 20 },
            { id: `opt-3-${Date.now()}`, label: 'Quero automatizar a recuperação de vendas perdidas', score: 30 }
          ]
        }
      } : {}),

      ...(type === 'quiz_image_choice' ? {
        headline: 'Qual é o seu nicho de atuação principal?',
        subtitle: 'Selecione a categoria que melhor representa o seu modelo de vendas:',
        quizQuestion: {
          questionType: 'image_choice',
          options: [
            { id: `opt-img-1-${Date.now()}`, label: 'Infoprodutos & Cursos', imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80', score: 10 },
            { id: `opt-img-2-${Date.now()}`, label: 'Mentorias High-Ticket', imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&auto=format&fit=crop&q=80', score: 20 },
            { id: `opt-img-3-${Date.now()}`, label: 'E-commerce & Produtos', imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&auto=format&fit=crop&q=80', score: 30 }
          ]
        }
      } : {}),

      ...(type === 'quiz_mini_vsl' ? {
        headline: 'Veja esta explicação rápida de 60 segundos antes do seu diagnóstico:',
        subtitle: 'Entenda como esse método acelera seus resultados:',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        buttonText: 'CONTINUAR PARA O DIAGNÓSTICO ➔'
      } : {}),

      ...(type === 'quiz_lead_capture' ? {
        headline: 'Para onde devemos enviar o seu Diagnóstico Personalizado?',
        subtitle: 'Preencha seus dados abaixo para liberar o resultado completo:',
        leadCaptureData: {
          submitButtonText: 'LIBERAR MEU DIAGNÓSTICO COMPLETO ➔',
          requireName: true,
          requirePhone: true,
          requireEmail: true
        }
      } : {}),

      ...(type === 'quiz_diagnostic_loading' ? {
        headline: 'Analisando o seu perfil de vendas...',
        subtitle: 'Nossa inteligência está cruzando suas respostas com playbooks validados.',
        bodyText: 'Calculando taxa de recuperação potencial... Ajustando recomendação personalizada...'
      } : {}),

      ...(type === 'quiz_result_pitch' ? {
        headline: 'Seu Diagnóstico Está Pronto: Perfil de Alto Potencial de Escala',
        subtitle: 'Com base nas suas respostas, você tem um potencial de multiplicar suas vendas em até 3x.',
        badge: '🏆 Diagnóstico Concluído',
        pricingData: {
          regularPrice: 997,
          offerPrice: 297,
          installments: '12x de R$ 29,70',
          checkoutUrl: 'https://pay.exemplo.com/checkout',
          guaranteeDays: 7,
          bonusList: [
            'Diagnóstico Personalizado de Conversão',
            'Playbook de Scripts de Fechamento no WhatsApp',
            'Pack de Áudios Gravados de Alta Retenção'
          ]
        },
        buttonText: 'QUERO DESBLOQUEAR MEU ACESSO AGORA'
      } : {}),

      ...(type === 'image_banner' ? {
        headline: 'Visão Geral do Ecossistema e da Plataforma',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
        imageCaption: 'Acesso instantâneo a todos os módulos, playbooks e ferramentas'
      } : {}),

      ...(type === 'image_social_proof' ? {
        layoutColumns: '3_col_grid',
        headline: 'Resultados Reais dos Nossos Clientes no WhatsApp',
        subtitle: 'Prints e notificações de vendas recebidas nas últimas 24 horas:',
        imageGallery: [
          { id: 'g-1', title: 'R$ 14.850 em 3 dias', imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80', caption: 'Recuperação de Pix no 1 a 1' },
          { id: 'g-2', title: '24% de Conversão', imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80', caption: 'Com áudios humanizados' },
          { id: 'g-3', title: 'R$ 48.000 no Mês', imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80', caption: 'Operação High-Ticket' }
        ]
      } : {}),

      ...(type === 'cta_button_block' ? {
        headline: 'Comece Hoje Mesmo a Escalar Suas Vendas',
        subtitle: 'Oferta especial por tempo limitado com acesso imediato e 7 dias de garantia.',
        buttonText: 'QUERO GARANTIR MINHA VAGA COM DESCONTO',
        buttonLink: '#pricing',
        ctaData: {
          subtext: '🔒 Compra 100% Segura • ⚡ Acesso Imediato • 🛡️ 7 Dias de Garantia',
          urgencyTimer: '14:59'
        }
      } : {}),

      ...(type === 'urgency_timer' ? {
        headline: '🚨 ATENÇÃO: As condições especiais desta página encerram em breve!',
        ctaData: { urgencyTimer: '14:59' }
      } : {}),

      ...(type === 'comparison_table' ? {
        headline: 'Por que o Nosso Método é Diferente de Tudo?',
        comparisonData: {
          competitorTitle: '❌ Mercado Tradicional',
          competitorItems: [
            'Empurra o lead para um checkout frio e sem suporte',
            'Perde 80% das vendas nas objeções de "está caro"',
            'Não possui esteira ativa de recuperação de Pix'
          ],
          ourTitle: '✅ Método com HubCRM',
          ourItems: [
            'Condução consultiva com gatilhos de micro-compromisso',
            'Playbooks com scripts de áudios gravados que convertem na hora',
            'Recuperação automática de pagamentos em menos de 10 minutos'
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
    toast.success('Novo bloco inserido!');
  };

  const handleUpdateSection = (secId: string, updates: Partial<PageQuizSection>) => {
    setIsDirty(true);
    setSections(prev => prev.map(s => s.id === secId ? { ...s, ...updates } : s));
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    setIsDirty(true);
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    setSections(newSections);
  };

  const handleDuplicateSection = (index: number) => {
    setIsDirty(true);
    const sec = sections[index];
    const cloned: PageQuizSection = {
      ...JSON.parse(JSON.stringify(sec)),
      id: `sec-${Date.now()}`,
      title: `${sec.title} (Cópia)`
    };
    const newSections = [...sections];
    newSections.splice(index + 1, 0, cloned);
    setSections(newSections);
    toast.success('Dobra duplicada!');
  };

  const handleDeleteSection = (secId: string) => {
    if (sections.length <= 1) {
      toast.error('O fluxo deve ter pelo menos uma seção.');
      return;
    }
    setIsDirty(true);
    setSections(prev => prev.filter(s => s.id !== secId));
  };

  // Funções Auxiliares para Manipulação de Alternativas de Quiz
  const handleAddQuizOption = (secId: string) => {
    setIsDirty(true);
    setSections(prev => prev.map(sec => {
      if (sec.id !== secId) return sec;
      const currentOptions = sec.quizQuestion?.options || [];
      const newOption: QuizOptionItem = {
        id: `opt-${Date.now()}`,
        label: `Nova Alternativa ${currentOptions.length + 1}`,
        score: 10
      };
      return {
        ...sec,
        quizQuestion: {
          questionType: sec.quizQuestion?.questionType || 'single_choice',
          options: [...currentOptions, newOption]
        }
      };
    }));
    toast.success('Nova alternativa adicionada!');
  };

  const handleUpdateQuizOption = (secId: string, optId: string, updates: Partial<QuizOptionItem>) => {
    setIsDirty(true);
    setSections(prev => prev.map(sec => {
      if (sec.id !== secId) return sec;
      const updatedOptions = (sec.quizQuestion?.options || []).map(opt => 
        opt.id === optId ? { ...opt, ...updates } : opt
      );
      return {
        ...sec,
        quizQuestion: {
          questionType: sec.quizQuestion?.questionType || 'single_choice',
          options: updatedOptions
        }
      };
    }));
  };

  const handleDeleteQuizOption = (secId: string, optId: string) => {
    setIsDirty(true);
    setSections(prev => prev.map(sec => {
      if (sec.id !== secId) return sec;
      const updatedOptions = (sec.quizQuestion?.options || []).filter(opt => opt.id !== optId);
      return {
        ...sec,
        quizQuestion: {
          questionType: sec.quizQuestion?.questionType || 'single_choice',
          options: updatedOptions
        }
      };
    }));
  };

  const handleSave = async (andExit = false) => {
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
      setIsDirty(false);
      toast.success(mode === 'quiz_funnel' ? 'Quiz salvo com sucesso!' : 'Página de Vendas salva com sucesso!');
      if (andExit) {
        navigate('/funnels');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar dados.');
    } finally {
      setSaving(false);
    }
  };

  // Tratamento da Saída com Confirmação de Rascunho
  const handleBackNavigation = () => {
    if (isDirty || isNew) {
      setShowExitModal(true);
    } else {
      navigate('/funnels');
    }
  };

  const handleDiscardAndExit = async () => {
    setDiscarding(true);
    try {
      if (isNew && orgId && id) {
        // Se era um novo rascunho não salvo, remove do Firestore para não poluir a lista
        await funnelService.deleteFunnel(orgId, id);
        toast.info('Rascunho não salvo foi descartado.');
      }
      navigate('/funnels');
    } catch (err) {
      console.error('Erro ao descartar rascunho:', err);
      navigate('/funnels');
    } finally {
      setDiscarding(false);
    }
  };

  // Compilador de Instruções Completas
  const generateInstructionsText = () => {
    let doc = `# ESPECIFICAÇÃO TÉCNICA: ${blueprint?.title || 'Ativo Digital'}\n`;
    doc += `Tipo de Ativo: ${mode === 'quiz_funnel' ? 'Quiz Interativo com Diagnóstico' : 'Página de Vendas de Alta Conversão'}\n`;
    doc += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    doc += `Total de Dobras/Passos: ${sections.length}\n\n`;

    sections.forEach((sec, idx) => {
      doc += `[ETAPA ${idx + 1}: ${sec.title.toUpperCase()}]\n`;
      doc += `• Tipo de Bloco: ${sec.type}\n`;
      if (sec.badge) doc += `• Tag/Badge: "${sec.badge}"\n`;
      if (sec.headline) doc += `• Headline: "${sec.headline}"\n`;
      if (sec.subtitle) doc += `• Subtítulo: "${sec.subtitle}"\n`;
      if (sec.quizQuestion) {
        doc += `• Tipo de Pergunta: ${sec.quizQuestion.questionType}\n`;
        sec.quizQuestion.options.forEach((opt, oIdx) => {
          doc += `   ${oIdx + 1}. ${opt.label} (Score: ${opt.score || 0} pts)\n`;
        });
      }
      if (sec.videoUrl) doc += `• Vídeo/VSL: ${sec.videoUrl}\n`;
      if (sec.pricingData) {
        doc += `• Preço: De R$ ${sec.pricingData.regularPrice || 997} por ${sec.pricingData.installments || `R$ ${sec.pricingData.offerPrice}`}\n`;
      }
      doc += `\n-----------------------------------------------------------------\n\n`;
    });

    return doc;
  };

  const handleCopyInstructions = () => {
    const text = generateInstructionsText();
    navigator.clipboard.writeText(text);
    toast.success('Instruções copiadas com sucesso!');
  };

  // Efeito do simulador de quiz (progresso da tela de análise)
  useEffect(() => {
    let interval: any;
    if (isQuizSimulatorOpen && sections[quizSimulatorStepIndex]?.type === 'quiz_diagnostic_loading') {
      setQuizSimulatorProgress(0);
      interval = setInterval(() => {
        setQuizSimulatorProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              if (quizSimulatorStepIndex < sections.length - 1) {
                setQuizSimulatorStepIndex(prevStep => prevStep + 1);
              }
            }, 600);
            return 100;
          }
          return prev + 25;
        });
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isQuizSimulatorOpen, quizSimulatorStepIndex, sections]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#050914] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Carregando Estúdio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050914] text-white overflow-hidden">
      
      {/* ── CABEÇALHO DO ESTÚDIO ────────────────────────────────────────────── */}
      <header className="h-16 bg-[#080e21]/95 border-b border-white/10 px-6 flex items-center justify-between z-30 shrink-0 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackNavigation}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            title="Voltar para Fluxos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                mode === 'quiz_funnel'
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {mode === 'quiz_funnel' ? '🧠 Construtor de Quiz' : '📄 Construtor de Páginas'}
              </span>
              <span className="text-xs text-gray-500">•</span>
              <input
                type="text"
                value={blueprint?.title || ''}
                onChange={(e) => {
                  setIsDirty(true);
                  setBlueprint(prev => prev ? { ...prev, title: e.target.value } : null);
                }}
                className="bg-transparent font-black text-sm lg:text-base text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                placeholder="Título do Ativo..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Alternador de Dispositivo */}
          <div className="hidden sm:flex items-center bg-black/40 border border-white/10 p-1 rounded-xl text-xs">
            <button
              onClick={() => setDeviceView('desktop')}
              className={`p-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                deviceView === 'desktop' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                deviceView === 'mobile' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          {/* Botão de Simulação */}
          {mode === 'sales_page' ? (
            <button
              onClick={() => setIsOnlinePreviewOpen(true)}
              className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-500/40 shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-300" />
              <span>Visualizar Online</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setQuizSimulatorStepIndex(0);
                setQuizSimulatorAnswers({});
                setSimulatorLeadName('');
                setSimulatorLeadPhone('');
                setIsQuizSimulatorOpen(true);
              }}
              className="px-3.5 py-2 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-purple-500/40 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 text-purple-300" />
              <span>Simulador de Quiz</span>
            </button>
          )}

          <button
            onClick={handleCopyInstructions}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10"
            title="Copiar todas as instruções"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Copiar Instruções</span>
          </button>

          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/25 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </header>

      {/* ── CORPO PRINCIPAL: CANVAS VISUAL DA PÁGINA ────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Barra Lateral Esquerda: Catálogo Filtrado pelo Modo */}
        <div className="w-72 bg-[#080d1e] border-r border-white/10 p-4 flex flex-col gap-3 shrink-0 overflow-y-auto custom-scrollbar">
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {mode === 'quiz_funnel' ? 'Passos do Quiz' : 'Blocos da Página'}
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Clique para adicionar na estrutura:
            </p>
          </div>

          <div className="space-y-2">
            {mode === 'quiz_funnel' ? (
              /* CATÁLOGO DE PASSOS DO QUIZ */
              <>
                <button
                  onClick={() => handleAddSection('quiz_question', '1_col_center')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-purple-600/20 border border-white/5 hover:border-purple-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                      Pergunta de Escolha Simples
                    </h5>
                    <p className="text-[10px] text-gray-400">Alternativas com pontuação</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>

                <button
                  onClick={() => handleAddSection('quiz_image_choice', '1_col_center')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-purple-600/20 border border-white/5 hover:border-purple-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      Cards Visuais com Imagem
                    </h5>
                    <p className="text-[10px] text-gray-400">Escolha com fotos/ícones</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>

                <button
                  onClick={() => handleAddSection('quiz_mini_vsl', '1_col_center')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-purple-600/20 border border-white/5 hover:border-purple-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-rose-400" />
                      Mini-VSL de Transição
                    </h5>
                    <p className="text-[10px] text-gray-400">Vídeo curto de aquecimento</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>

                <button
                  onClick={() => handleAddSection('quiz_lead_capture', '1_col_center')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-purple-600/20 border border-white/5 hover:border-purple-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Captura de Lead (WhatsApp)
                    </h5>
                    <p className="text-[10px] text-gray-400">Nome e número antes do resultado</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>

                <button
                  onClick={() => handleAddSection('quiz_diagnostic_loading', '1_col_center')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-purple-600/20 border border-white/5 hover:border-purple-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      Carregamento Psicológico
                    </h5>
                    <p className="text-[10px] text-gray-400">Barra de 0 a 100%</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>

                <button
                  onClick={() => handleAddSection('quiz_result_pitch', '1_col_center')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-purple-600/20 border border-white/5 hover:border-purple-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      Resultado & Oferta Final
                    </h5>
                    <p className="text-[10px] text-gray-400">Pitch do produto recomendado</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>
              </>
            ) : (
              /* CATÁLOGO DE DOBRAS DA PÁGINA DE VENDAS */
              <>
                <button
                  onClick={() => handleAddSection('hero_vsl', '1_col_center')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <AlignCenter className="w-3.5 h-3.5 text-indigo-400" />
                      Hero com VSL (1 Coluna)
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
                      Split: Texto + Mídia (50/50)
                    </h5>
                    <p className="text-[10px] text-gray-400">Copy + Bullets na esq.</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>

                <button
                  onClick={() => handleAddSection('image_banner', '1_col_center')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                      Imagem / Banner Full-Width
                    </h5>
                    <p className="text-[10px] text-gray-400">Mockup ou foto do produto</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>

                <button
                  onClick={() => handleAddSection('image_social_proof', '3_col_grid')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                      Mural de Prints & Provas
                    </h5>
                    <p className="text-[10px] text-gray-400">Grade de prints de WhatsApp</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>

                <button
                  onClick={() => handleAddSection('cta_button_block', '1_col_center')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Botão de CTA & Oferta
                    </h5>
                    <p className="text-[10px] text-gray-400">Botão pulsante com selos</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>

                <button
                  onClick={() => handleAddSection('comparison_table', '1_col_center')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
                      Tabela Comparativa
                    </h5>
                    <p className="text-[10px] text-gray-400">Nosso Método vs Outros</p>
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
                    <p className="text-[10px] text-gray-400">Preço, parcelas e bônus</p>
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
                    <p className="text-[10px] text-gray-400">Perguntas frequentes</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── ÁREA CENTRAL: WIREFRAME VISUAL COM EDIÇÃO COMPLETA ─────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 lg:p-8 bg-[#040712] flex justify-center">
          
          <div 
            className={`transition-all duration-300 bg-[#090e1f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-fit mb-32 ${
              deviceView === 'mobile' ? 'w-full max-w-[390px] min-h-[750px]' : 'w-full max-w-5xl min-h-[600px]'
            }`}
          >
            {/* Top Bar da Janela Simulada */}
            <div className="px-4 py-2.5 bg-black/60 border-b border-white/10 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[11px] font-mono text-gray-500 ml-2">https://seusite.com.br/{mode === 'quiz_funnel' ? 'diagnostico' : 'oferta'}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-500">
                {sections.length} etapas • {deviceView.toUpperCase()}
              </span>
            </div>

            {/* Conteúdo Renderizado da Página de Vendas / Quiz */}
            <div className="divide-y divide-white/5">
              {sections.map((sec, index) => {
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

                    {/* ── 1. BLOCO DE QUIZ: PERGUNTA DE ESCOLHA SIMPLES COM ALTERNATIVAS ── */}
                    {sec.type === 'quiz_question' && (
                      <div className="space-y-6 max-w-2xl mx-auto">
                        <div className="text-center space-y-2">
                          <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30 inline-block">
                            Passo {index + 1}: Pergunta de Diagnóstico
                          </span>
                          <textarea
                            rows={2}
                            value={sec.headline || ''}
                            onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                            placeholder="Digite a pergunta do quiz..."
                            className="w-full bg-transparent font-black text-xl lg:text-2xl text-white text-center leading-tight focus:outline-none rounded p-1 resize-none"
                          />
                          <input
                            type="text"
                            value={sec.subtitle || ''}
                            onChange={(e) => handleUpdateSection(sec.id, { subtitle: e.target.value })}
                            placeholder="Subtítulo de apoio da pergunta..."
                            className="w-full bg-transparent text-xs text-gray-400 text-center focus:outline-none"
                          />
                        </div>

                        {/* Lista de Alternativas com Edição e Exclusão */}
                        <div className="space-y-2.5 pt-2">
                          {sec.quizQuestion?.options.map((opt, oIdx) => (
                            <div 
                              key={opt.id}
                              className="p-3 bg-black/40 border border-white/10 hover:border-purple-500/40 rounded-2xl flex items-center justify-between gap-3 group/opt transition-all"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-black flex items-center justify-center shrink-0">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <input
                                  type="text"
                                  value={opt.label}
                                  onChange={(e) => handleUpdateQuizOption(sec.id, opt.id, { label: e.target.value })}
                                  className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                                  placeholder="Texto da alternativa..."
                                />
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg text-[10px] text-gray-400">
                                  <span>Pts:</span>
                                  <input
                                    type="number"
                                    value={opt.score || 0}
                                    onChange={(e) => handleUpdateQuizOption(sec.id, opt.id, { score: Number(e.target.value) })}
                                    className="w-10 bg-transparent text-purple-300 font-bold text-right focus:outline-none"
                                  />
                                </div>

                                <button
                                  onClick={() => handleDeleteQuizOption(sec.id, opt.id)}
                                  className="p-1 text-gray-500 hover:text-rose-400 opacity-60 group-hover/opt:opacity-100 transition-opacity"
                                  title="Excluir Alternativa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            onClick={() => handleAddQuizOption(sec.id)}
                            className="w-full py-2.5 border border-dashed border-purple-500/30 hover:border-purple-500/60 text-purple-300 hover:text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-purple-500/5 hover:bg-purple-500/10"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar Alternativa</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── 2. BLOCO DE QUIZ: CARDS VISUAIS COM IMAGEM ── */}
                    {sec.type === 'quiz_image_choice' && (
                      <div className="space-y-6 max-w-3xl mx-auto">
                        <div className="text-center space-y-2">
                          <span className="text-[10px] font-black uppercase text-cyan-400 bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/30 inline-block">
                            Passo {index + 1}: Escolha com Imagens
                          </span>
                          <textarea
                            rows={2}
                            value={sec.headline || ''}
                            onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                            placeholder="Pergunta visual..."
                            className="w-full bg-transparent font-black text-xl lg:text-2xl text-white text-center leading-tight focus:outline-none rounded p-1 resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {sec.quizQuestion?.options.map((opt, oIdx) => (
                            <div key={opt.id} className="p-3 bg-black/40 border border-white/10 rounded-2xl space-y-2 group/card text-left">
                              <div className="aspect-[4/3] bg-black/60 rounded-xl overflow-hidden relative">
                                <img src={opt.imageUrl} alt={opt.label} className="w-full h-full object-cover" />
                              </div>
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) => handleUpdateQuizOption(sec.id, opt.id, { label: e.target.value })}
                                className="w-full bg-transparent font-bold text-xs text-white focus:outline-none"
                                placeholder="Título do Card..."
                              />
                              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5">
                                <span>Pts: {opt.score || 0}</span>
                                <button
                                  onClick={() => handleDeleteQuizOption(sec.id, opt.id)}
                                  className="text-gray-500 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleAddQuizOption(sec.id)}
                          className="w-full py-2 border border-dashed border-cyan-500/30 text-cyan-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 bg-cyan-500/5 hover:bg-cyan-500/10"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Card de Imagem</span>
                        </button>
                      </div>
                    )}

                    {/* ── 3. BLOCO DE QUIZ: MINI-VSL DE TRANSIÇÃO ── */}
                    {sec.type === 'quiz_mini_vsl' && (
                      <div className="space-y-4 max-w-2xl mx-auto text-center">
                        <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30 inline-block">
                          Passo {index + 1}: Mini-VSL de Aquecimento
                        </span>
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-xl text-white text-center leading-tight focus:outline-none resize-none"
                        />
                        <div className="aspect-video bg-black rounded-2xl border border-white/10 flex flex-col items-center justify-center shadow-xl my-3">
                          <Play className="w-10 h-10 text-rose-400 mb-1" />
                          <span className="text-xs text-gray-400">🎬 Player do Vídeo</span>
                        </div>
                        <input
                          type="text"
                          value={sec.buttonText || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { buttonText: e.target.value })}
                          className="px-6 py-3 bg-rose-600 text-white font-bold text-xs uppercase rounded-xl inline-block text-center"
                        />
                      </div>
                    )}

                    {/* ── 4. BLOCO DE QUIZ: CAPTURA DE LEAD (WHATSAPP) ── */}
                    {sec.type === 'quiz_lead_capture' && (
                      <div className="space-y-5 max-w-md mx-auto text-center p-6 bg-emerald-950/20 border border-emerald-500/40 rounded-3xl shadow-xl">
                        <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 inline-block">
                          Passo {index + 1}: Captura do Lead
                        </span>
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-lg text-white text-center leading-tight focus:outline-none resize-none"
                        />
                        <div className="space-y-3 text-left">
                          <div className="p-3 bg-black/60 border border-white/10 rounded-xl flex items-center gap-2 text-xs text-gray-400">
                            <User className="w-4 h-4 text-emerald-400" />
                            <span>Campo de Nome Completo</span>
                          </div>
                          <div className="p-3 bg-black/60 border border-white/10 rounded-xl flex items-center gap-2 text-xs text-gray-400">
                            <Phone className="w-4 h-4 text-emerald-400" />
                            <span>Campo de WhatsApp (DDD + Número)</span>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={sec.leadCaptureData?.submitButtonText || 'LIBERAR RESULTADO'}
                          onChange={(e) => handleUpdateSection(sec.id, {
                            leadCaptureData: {
                              ...sec.leadCaptureData,
                              submitButtonText: e.target.value,
                              requireName: true,
                              requirePhone: true
                            }
                          })}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-500/25 text-center cursor-pointer"
                        />
                      </div>
                    )}

                    {/* ── 5. BLOCO DE QUIZ: CARREGAMENTO PSICOLÓGICO ── */}
                    {sec.type === 'quiz_diagnostic_loading' && (
                      <div className="py-8 space-y-4 text-center max-w-md mx-auto">
                        <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 inline-block">
                          Passo {index + 1}: Carregamento Psicológico
                        </span>
                        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto my-4" />
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-lg text-white text-center leading-tight focus:outline-none resize-none"
                        />
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 w-3/4 animate-pulse" />
                        </div>
                      </div>
                    )}

                    {/* ── 6. BLOCO DE QUIZ: RESULTADO & OFERTA PERSONALIZADA ── */}
                    {sec.type === 'quiz_result_pitch' && (
                      <div className="p-6 bg-gradient-to-b from-[#0e1738] to-[#080d21] border-2 border-purple-500/40 rounded-3xl space-y-5 text-center max-w-2xl mx-auto shadow-2xl shadow-purple-500/10">
                        <span className="text-xs font-black uppercase text-purple-400 bg-purple-500/20 px-4 py-1.5 rounded-full border border-purple-500/30 inline-block">
                          {sec.badge || '🏆 Diagnóstico Concluído'}
                        </span>
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-2xl text-white text-center leading-tight focus:outline-none resize-none"
                        />
                        <div className="text-3xl font-black text-white">
                          {sec.pricingData?.installments || `R$ ${sec.pricingData?.offerPrice}`}
                        </div>
                        <input
                          type="text"
                          value={sec.buttonText || 'QUERO MEU ACESSO AGORA'}
                          onChange={(e) => handleUpdateSection(sec.id, { buttonText: e.target.value })}
                          className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-xs uppercase rounded-2xl shadow-xl shadow-purple-500/25 text-center cursor-pointer"
                        />
                      </div>
                    )}

                    {/* ── 7. BLOCOS DE PÁGINA DE VENDAS ── */}
                    {sec.type === 'image_banner' && (
                      <div className="space-y-4 text-center max-w-4xl mx-auto">
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-xl lg:text-2xl text-white text-center leading-tight focus:outline-none rounded p-1 resize-none"
                        />
                        <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-black/60 aspect-[16/9] max-h-96 flex items-center justify-center">
                          <img src={sec.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}

                    {sec.type === 'image_social_proof' && (
                      <div className="space-y-6 text-center">
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-xl lg:text-2xl text-white text-center leading-tight focus:outline-none rounded p-1 resize-none"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {sec.imageGallery?.map((item, gIdx) => (
                            <div key={item.id} className="p-3 bg-black/40 border border-white/10 rounded-2xl space-y-2 text-left">
                              <img src={item.imageUrl} alt={item.title} className="w-full aspect-[4/3] object-cover rounded-xl" />
                              <h5 className="text-xs font-bold text-white">{item.title}</h5>
                              <p className="text-[10px] text-gray-400">{item.caption}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sec.type === 'cta_button_block' && (
                      <div className="text-center max-w-2xl mx-auto space-y-5 p-6 bg-gradient-to-b from-[#0e1738] to-[#080d21] border border-emerald-500/40 rounded-3xl shadow-xl">
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-xl lg:text-2xl text-white text-center leading-tight focus:outline-none resize-none"
                        />
                        <input
                          type="text"
                          value={sec.buttonText || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { buttonText: e.target.value })}
                          className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white text-xs sm:text-sm font-black uppercase rounded-2xl shadow-xl text-center focus:outline-none cursor-pointer inline-block"
                        />
                      </div>
                    )}

                    {sec.type === 'hero_vsl' && (
                      <div className="space-y-5 text-center max-w-3xl mx-auto">
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-xl sm:text-2xl lg:text-3xl text-white text-center leading-tight focus:outline-none rounded p-1 resize-none"
                        />
                        <div className="aspect-video bg-black/80 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-4 relative shadow-2xl my-4">
                          <Play className="w-12 h-12 text-indigo-300 opacity-80" />
                        </div>
                      </div>
                    )}

                    {/* Inserir Bloco Entre Seções */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={() => handleAddSection(mode === 'quiz_funnel' ? 'quiz_question' : 'cta_button_block', '1_col_center', index)}
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
      {isQuizSimulatorOpen && (
        <div 
          onClick={() => setIsQuizSimulatorOpen(false)}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm h-[720px] bg-[#060a16] border border-purple-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-3.5 bg-black/80 border-b border-white/10 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                Simulador Ao Vivo • Passo {quizSimulatorStepIndex + 1}/{sections.length}
              </span>
              <button
                onClick={() => setIsQuizSimulatorOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-[#090f24] to-[#040711] flex flex-col justify-between">
              {(() => {
                const currentSec = sections[quizSimulatorStepIndex];
                if (!currentSec) return null;

                return (
                  <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-4">
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${Math.round(((quizSimulatorStepIndex + 1) / sections.length) * 100)}%` }}
                      />
                    </div>

                    <h3 className="text-base font-black text-white leading-snug">
                      {currentSec.headline || currentSec.title}
                    </h3>
                    {currentSec.subtitle && <p className="text-xs text-gray-300">{currentSec.subtitle}</p>}

                    {/* 1. Escolha Simples de Quiz */}
                    {currentSec.type === 'quiz_question' && currentSec.quizQuestion?.options && (
                      <div className="space-y-2.5 text-left pt-2">
                        {currentSec.quizQuestion.options.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setQuizSimulatorAnswers(prev => ({ ...prev, [currentSec.id]: opt.id }));
                              if (quizSimulatorStepIndex < sections.length - 1) {
                                setQuizSimulatorStepIndex(prev => prev + 1);
                              }
                            }}
                            className="w-full p-3.5 rounded-2xl bg-white/[0.04] hover:bg-purple-600/30 border border-white/10 hover:border-purple-500/50 text-white text-xs font-bold transition-all flex items-center justify-between group active:scale-[0.98]"
                          >
                            <span>{opt.label}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-300" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 2. Escolha Visual com Cards de Imagem */}
                    {currentSec.type === 'quiz_image_choice' && currentSec.quizQuestion?.options && (
                      <div className="grid grid-cols-1 gap-2.5 text-left pt-2">
                        {currentSec.quizQuestion.options.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setQuizSimulatorAnswers(prev => ({ ...prev, [currentSec.id]: opt.id }));
                              if (quizSimulatorStepIndex < sections.length - 1) {
                                setQuizSimulatorStepIndex(prev => prev + 1);
                              }
                            }}
                            className="p-3 bg-white/[0.04] hover:bg-cyan-600/30 border border-white/10 hover:border-cyan-500/50 rounded-2xl flex items-center gap-3 group active:scale-[0.98] transition-all"
                          >
                            <img src={opt.imageUrl} alt={opt.label} className="w-12 h-12 rounded-xl object-cover" />
                            <span className="text-xs font-bold text-white flex-1">{opt.label}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-300" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 3. Mini-VSL */}
                    {(currentSec.type === 'quiz_mini_vsl' || currentSec.type === 'hero_vsl') && (
                      <div className="space-y-4">
                        <div className="aspect-video bg-black rounded-2xl border border-white/10 flex items-center justify-center">
                          <Play className="w-10 h-10 text-purple-400 opacity-80" />
                        </div>
                        <button
                          onClick={() => {
                            if (quizSimulatorStepIndex < sections.length - 1) {
                              setQuizSimulatorStepIndex(prev => prev + 1);
                            }
                          }}
                          className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-purple-500/25"
                        >
                          {currentSec.buttonText || 'CONTINUAR PARA O DIAGNÓSTICO ➔'}
                        </button>
                      </div>
                    )}

                    {/* 4. Captura de Lead */}
                    {currentSec.type === 'quiz_lead_capture' && (
                      <div className="space-y-3 pt-2">
                        <input
                          type="text"
                          value={simulatorLeadName}
                          onChange={(e) => setSimulatorLeadName(e.target.value)}
                          placeholder="Digite seu nome completo..."
                          className="w-full p-3 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          value={simulatorLeadPhone}
                          onChange={(e) => setSimulatorLeadPhone(e.target.value)}
                          placeholder="Seu WhatsApp com DDD..."
                          className="w-full p-3 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => {
                            if (!simulatorLeadName.trim() || !simulatorLeadPhone.trim()) {
                              toast.error('Preencha seu nome e WhatsApp para continuar.');
                              return;
                            }
                            if (quizSimulatorStepIndex < sections.length - 1) {
                              setQuizSimulatorStepIndex(prev => prev + 1);
                            }
                          }}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25"
                        >
                          {currentSec.leadCaptureData?.submitButtonText || 'LIBERAR DIAGNÓSTICO'}
                        </button>
                      </div>
                    )}

                    {/* 5. Carregamento Psicológico */}
                    {currentSec.type === 'quiz_diagnostic_loading' && (
                      <div className="py-8 space-y-4 text-center">
                        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-200"
                            style={{ width: `${quizSimulatorProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-emerald-300 font-bold">{quizSimulatorProgress}% concluído</p>
                      </div>
                    )}

                    {/* 6. Resultado & Pitch Final */}
                    {(currentSec.type === 'quiz_result_pitch' || currentSec.type === 'pricing_box') && (
                      <div className="p-5 bg-gradient-to-b from-purple-950/40 to-black/60 border border-purple-500/40 rounded-3xl space-y-4 text-center my-4">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-500/30">
                          {currentSec.badge || 'Diagnóstico Concluído'}
                        </span>
                        <div className="text-2xl font-black text-white">
                          {currentSec.pricingData?.installments || `R$ ${currentSec.pricingData?.offerPrice || 297}`}
                        </div>
                        <button
                          onClick={() => toast.success('Redirecionando para o checkout da oferta personalizada...')}
                          className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-purple-500/25"
                        >
                          {currentSec.buttonText || 'QUERO MEU ACESSO AGORA'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <button
                  onClick={() => setQuizSimulatorStepIndex(prev => Math.max(0, prev - 1))}
                  disabled={quizSimulatorStepIndex === 0}
                  className="text-xs text-gray-400 hover:text-white disabled:opacity-20"
                >
                  ← Voltar
                </button>
                <button
                  onClick={() => {
                    if (quizSimulatorStepIndex < sections.length - 1) {
                      setQuizSimulatorStepIndex(prev => prev + 1);
                    }
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-bold"
                >
                  Avançar →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 🌐 MODAL DE SIMULAÇÃO DA PÁGINA ONLINE ──────────────────────────── */}
      {isOnlinePreviewOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-xl flex flex-col text-white animate-in fade-in select-none">
          <div className="p-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
            <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
              🌐 Visualização Online da Página
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setOnlinePreviewDevice('desktop')}
                  className={`px-3 py-1 rounded-lg font-bold ${onlinePreviewDevice === 'desktop' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setOnlinePreviewDevice('mobile')}
                  className={`px-3 py-1 rounded-lg font-bold ${onlinePreviewDevice === 'mobile' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}
                >
                  Mobile
                </button>
              </div>
              <button
                onClick={() => setIsOnlinePreviewOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-900 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 flex justify-center bg-[#050816]">
            <div className={`transition-all duration-300 bg-[#060a17] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-fit mb-32 ${onlinePreviewDevice === 'mobile' ? 'w-full max-w-[390px]' : 'w-full max-w-5xl'}`}>
              <div className="p-6 lg:p-12 space-y-16">
                {sections.map(sec => (
                  <div key={sec.id} className="text-center space-y-6">
                    <h2 className="text-2xl sm:text-3xl font-black text-white">{sec.headline}</h2>
                    {sec.buttonText && (
                      <button
                        onClick={() => toast.success('Redirecionando para o Checkout Seguro...')}
                        className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-black text-sm uppercase rounded-2xl shadow-xl hover:scale-105 transition-transform"
                      >
                        {sec.buttonText}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 💾 MODAL DE CONFIRMAÇÃO PARA SALVAR RASCUNHO AO SAIR ────────────── */}
      {showExitModal && (
        <div 
          onClick={() => setShowExitModal(false)}
          className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0b1024] border border-white/10 rounded-3xl shadow-2xl p-6 space-y-6 text-white text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">
                Deseja salvar o rascunho antes de sair?
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Você tem alterações neste ativo. Se optar por sair sem salvar, as modificações recentes serão descartadas {isNew && 'e nenhum rascunho indesejado será criado na sua lista'}.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Salvar e Sair</span>
              </button>

              <button
                onClick={handleDiscardAndExit}
                disabled={discarding}
                className="w-full py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isNew ? 'Descartar e Não Criar Rascunho' : 'Sair sem Salvar'}</span>
              </button>

              <button
                onClick={() => setShowExitModal(false)}
                className="w-full py-2.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Continuar Editando
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
