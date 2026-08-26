import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Smartphone, Monitor, Play, 
  Sparkles, Eye, ChevronUp, ChevronDown, CheckCircle2, 
  HelpCircle, MessageCircle, DollarSign, ShieldCheck, Video, 
  Image as ImageIcon, Layers, RefreshCw, X, ArrowRight, Star,
  Columns, LayoutGrid, AlignCenter, FileText, Check, Copy,
  Quote, Zap, MoveUp, MoveDown, Pencil, Download, Code,
  Clock, Shield, CreditCard, Lock, CheckCheck, XCircle,
  Maximize2, ExternalLink
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

  // Modo Fixo derivado do Ativo (Página de Vendas vs Quiz)
  const [mode, setMode] = useState<'sales_page' | 'quiz_funnel'>('sales_page');
  const [sections, setSections] = useState<PageQuizSection[]>(DEFAULT_SALES_PAGE_SECTIONS);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Simulador Online (Visualização Real da Página)
  const [isOnlinePreviewOpen, setIsOnlinePreviewOpen] = useState(false);
  const [onlinePreviewDevice, setOnlinePreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Simulador Interativo de Quiz
  const [isQuizSimulatorOpen, setIsQuizSimulatorOpen] = useState(false);
  const [quizSimulatorStepIndex, setQuizSimulatorStepIndex] = useState(0);
  const [quizSimulatorAnswers, setQuizSimulatorAnswers] = useState<Record<string, string>>({});
  const [quizSimulatorProgress, setQuizSimulatorProgress] = useState(0);

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
      headline: 'Título da Seção de Alta Conversão',
      subtitle: 'Subtítulo explicativo com a promessa ou direcionamento do lead.',
      badge: '✨ Destaque',
      
      // Defaults por tipo
      ...(type === 'image_banner' ? {
        headline: 'Visão Geral do Ecossistema e da Plataforma',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
        imageCaption: 'Acesso instantâneo a todos os módulos, playbooks e robôs de automação'
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
      } : {}),

      ...(type === 'quiz_image_choice' ? {
        headline: 'Qual é o seu nicho de atuação principal?',
        subtitle: 'Selecione a categoria que melhor representa o seu modelo de vendas:',
        quizQuestion: {
          questionType: 'image_choice',
          options: [
            { id: 'opt-img-1', label: 'Infoprodutos & Cursos', imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80', score: 10 },
            { id: 'opt-img-2', label: 'Mentorias & Serviços High-Ticket', imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&auto=format&fit=crop&q=80', score: 20 },
            { id: 'opt-img-3', label: 'E-commerce & Produtos Físicos', imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&auto=format&fit=crop&q=80', score: 30 }
          ]
        }
      } : {}),

      ...(type === 'quiz_mini_vsl' ? {
        headline: 'Veja esta mensagem importante antes de continuar:',
        subtitle: 'Assista a este vídeo rápido de 45 segundos para liberar o próximo passo:',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      } : {}),

      ...(type === 'quiz_lead_capture' ? {
        headline: 'Para onde devemos enviar o seu Diagnóstico Personalizado?',
        subtitle: 'Preencha seus dados abaixo para liberar o resultado completo:',
        leadCaptureData: {
          submitButtonText: 'VER MEU DIAGNÓSTICO COMPLETO',
          requireName: true,
          requirePhone: true,
          requireEmail: true
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
    toast.success('Dobra duplicada!');
  };

  const handleDeleteSection = (secId: string) => {
    if (sections.length <= 1) {
      toast.error('A página deve ter pelo menos uma dobra.');
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

  // Compilador de Instruções Completas
  const generateInstructionsText = () => {
    let doc = `# ESPECIFICAÇÃO TÉCNICA: ${blueprint?.title || 'Página de Vendas'}\n`;
    doc += `Tipo de Ativo: ${mode === 'quiz_funnel' ? 'Quiz Interativo com Diagnóstico' : 'Página de Vendas de Alta Conversão'}\n`;
    doc += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    doc += `Total de Dobras/Passos: ${sections.length}\n\n`;

    sections.forEach((sec, idx) => {
      doc += `[DOBRA ${idx + 1}: ${sec.title.toUpperCase()}]\n`;
      doc += `• Tipo de Bloco: ${sec.type} (${sec.layoutColumns || '1_col_center'})\n`;
      if (sec.badge) doc += `• Tag/Badge: "${sec.badge}"\n`;
      if (sec.headline) doc += `• Headline: "${sec.headline}"\n`;
      if (sec.subtitle) doc += `• Subtítulo: "${sec.subtitle}"\n`;
      if (sec.videoUrl) doc += `• Vídeo/VSL: ${sec.videoUrl} (Delay: ${sec.videoDelaySeconds || 0}s)\n`;
      if (sec.imageUrl) doc += `• Imagem/Banner: ${sec.imageUrl}\n`;
      if (sec.bullets) {
        doc += `• Benefícios:\n`;
        sec.bullets.forEach(b => doc += `   - ${b}\n`);
      }
      if (sec.comparisonData) {
        doc += `• Tabela Comparativa:\n`;
        doc += `   ${sec.comparisonData.competitorTitle}:\n`;
        sec.comparisonData.competitorItems.forEach(i => doc += `     ❌ ${i}\n`);
        doc += `   ${sec.comparisonData.ourTitle}:\n`;
        sec.comparisonData.ourItems.forEach(i => doc += `     ✅ ${i}\n`);
      }
      if (sec.pricingData) {
        doc += `• Preço: De R$ ${sec.pricingData.regularPrice || 997} por ${sec.pricingData.installments || `R$ ${sec.pricingData.offerPrice}`}\n`;
        if (sec.pricingData.bonusList) {
          doc += `• Bônus:\n`;
          sec.pricingData.bonusList.forEach(b => doc += `   + ${b}\n`);
        }
      }
      if (sec.faqItems) {
        doc += `• Perguntas Frequentes (FAQ):\n`;
        sec.faqItems.forEach(f => doc += `   - P: ${f.question}\n     R: ${f.answer}\n`);
      }
      if (sec.buttonText) {
        doc += `• Botão CTA: "${sec.buttonText}" (Link: ${sec.buttonLink || '#pricing'})\n`;
      }
      doc += `\n-----------------------------------------------------------------\n\n`;
    });

    return doc;
  };

  const handleCopyInstructions = () => {
    const text = generateInstructionsText();
    navigator.clipboard.writeText(text);
    toast.success('Instruções completas copiadas!');
  };

  const handleDownloadInstructions = () => {
    const content = generateInstructionsText();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${blueprint?.title || 'Instrucoes_Pagina'}.txt`;
    link.click();
    toast.success('Arquivo de instruções exportado!');
  };

  // Gerador de Código HTML Pronto
  const handleExportHTML = () => {
    let html = `<!DOCTYPE html>
<html lang="pt-BR" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blueprint?.title || 'Página de Vendas'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .pulse-cta { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
  </style>
</head>
<body class="bg-[#060a17] text-white min-h-screen antialiased">
  <main class="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
`;

    sections.forEach((sec, idx) => {
      html += `    <!-- DOBRA ${idx + 1}: ${sec.title} -->\n`;
      html += `    <section id="${sec.id}" class="py-8">\n`;

      if (sec.type === 'cta_button_block' || sec.type === 'pricing_box') {
        html += `      <div class="text-center max-w-2xl mx-auto p-8 bg-gradient-to-b from-[#0e1738] to-[#080d21] border-2 border-emerald-500/40 rounded-3xl space-y-6 shadow-2xl">\n`;
        if (sec.headline) html += `        <h2 class="text-2xl sm:text-3xl font-black text-white">${sec.headline}</h2>\n`;
        if (sec.pricingData) html += `        <div class="text-4xl font-black text-white">${sec.pricingData.installments || `R$ ${sec.pricingData.offerPrice}`}</div>\n`;
        if (sec.buttonText) html += `        <a href="${sec.buttonLink || '#pricing'}" class="pulse-cta inline-block px-10 py-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-black text-base uppercase rounded-2xl shadow-xl shadow-emerald-500/30">${sec.buttonText}</a>\n`;
        if (sec.ctaData?.subtext) html += `        <p class="text-xs text-gray-400">${sec.ctaData.subtext}</p>\n`;
        html += `      </div>\n`;
      } else {
        html += `      <div class="text-center max-w-3xl mx-auto space-y-4">\n`;
        if (sec.badge) html += `        <span class="inline-block bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black uppercase px-3 py-1 rounded-full">${sec.badge}</span>\n`;
        if (sec.headline) html += `        <h2 class="text-3xl sm:text-4xl font-black text-white">${sec.headline}</h2>\n`;
        if (sec.subtitle) html += `        <p class="text-sm text-gray-300">${sec.subtitle}</p>\n`;
        if (sec.imageUrl) html += `        <img src="${sec.imageUrl}" alt="Imagem" class="rounded-2xl border border-white/10 shadow-xl mx-auto my-6">\n`;
        html += `      </div>\n`;
      }

      html += `    </section>\n`;
    });

    html += `  </main>\n  <footer class="border-t border-white/10 py-8 text-center text-xs text-gray-500"><p>© ${new Date().getFullYear()} ${blueprint?.title}. Todos os direitos reservados.</p></footer>\n</body>\n</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${blueprint?.title || 'pagina-de-vendas'}.html`;
    link.click();
    toast.success('Página HTML exportada com sucesso!');
  };

  // Efeito do simulador de quiz
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
          return prev + 20;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isQuizSimulatorOpen, quizSimulatorStepIndex, sections]);

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
      
      {/* ── CABEÇALHO LIMPO (SEM BOTÃO DE ALTERNAR MODO) ────────────────────── */}
      <header className="h-16 bg-[#080e21]/95 border-b border-white/10 px-6 flex items-center justify-between z-30 shrink-0 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/funnels')}
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
                onChange={(e) => setBlueprint(prev => prev ? { ...prev, title: e.target.value } : null)}
                className="bg-transparent font-black text-sm lg:text-base text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                placeholder="Título do Ativo..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Alternador de Dispositivo no Canvas de Edição */}
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

          {/* Botão de Simulação Online / Real */}
          {mode === 'sales_page' ? (
            <button
              onClick={() => setIsOnlinePreviewOpen(true)}
              className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-500/40 shadow-sm"
              title="Simular página online completa sem barras de edição"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-300" />
              <span>Visualizar Online</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setQuizSimulatorStepIndex(0);
                setQuizSimulatorAnswers({});
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
            title="Copiar todas as instruções formatadas"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Copiar Instruções</span>
          </button>

          {mode === 'sales_page' && (
            <button
              onClick={handleExportHTML}
              className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-500/40 shadow-sm"
              title="Baixar arquivo HTML pronto"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Baixar HTML</span>
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
            {mode === 'sales_page' ? (
              <>
                {/* 1. Hero VSL */}
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

                {/* 2. Split Texto + Imagem/Vídeo */}
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

                {/* 3. Banner / Mockup de Imagem */}
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

                {/* 4. Mural de Prints / Provas Sociais com Imagens */}
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

                {/* 5. Botão de CTA & Venda Imediata */}
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

                {/* 6. Barra de Urgência & Escassez */}
                <button
                  onClick={() => handleAddSection('urgency_timer', '1_col_center')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      Barra de Escassez & Timer
                    </h5>
                    <p className="text-[10px] text-gray-400">Cronômetro de contagem</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>

                {/* 7. Tabela Comparativa */}
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

                {/* 8. Grade de Módulos (3 Colunas) */}
                <button
                  onClick={() => handleAddSection('module_grid', '3_col_grid')}
                  className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                      Grade de Módulos (3 Cards)
                    </h5>
                    <p className="text-[10px] text-gray-400">Entregáveis do treinamento</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                </button>

                {/* 9. Box da Oferta & Checkout */}
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

                {/* 10. Carta de Vendas (TSL) */}
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

                {/* 11. FAQ em Acordeão */}
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
            ) : (
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
                    <p className="text-[10px] text-gray-400">Opções com pontuação</p>
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
                  onClick={() => handleAddSection('pricing_box', '1_col_center')}
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
            )}
          </div>
        </div>

        {/* ── ÁREA CENTRAL: WIREFRAME VISUAL COM SCROLL COMPLETO ─────────────── */}
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
                <span className="text-[11px] font-mono text-gray-500 ml-2">https://seusite.com.br/oferta</span>
              </div>
              <span className="text-[10px] font-bold text-gray-500">
                {sections.length} seções • {deviceView.toUpperCase()}
              </span>
            </div>

            {/* Conteúdo Renderizado da Página de Vendas / Quiz */}
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

                    {/* ── 1. BLOCO: BANNER / IMAGEM FULL-WIDTH ── */}
                    {sec.type === 'image_banner' && (
                      <div className="space-y-4 text-center max-w-4xl mx-auto">
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-xl lg:text-2xl text-white text-center leading-tight focus:outline-none rounded p-1 resize-none"
                        />
                        <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-black/60 aspect-[16/9] max-h-96 flex items-center justify-center relative group/img">
                          <img
                            src={sec.imageUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80'}
                            alt="Banner"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <input
                          type="text"
                          value={sec.imageCaption || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { imageCaption: e.target.value })}
                          placeholder="Legenda da imagem..."
                          className="w-full bg-transparent text-xs text-gray-400 text-center focus:outline-none"
                        />
                      </div>
                    )}

                    {/* ── 2. BLOCO: MURAL DE PRINTS DE PROVA SOCIAL ── */}
                    {sec.type === 'image_social_proof' && (
                      <div className="space-y-6 text-center">
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-xl lg:text-2xl text-white text-center leading-tight focus:outline-none rounded p-1 resize-none"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {sec.imageGallery?.map((item, gIdx) => (
                            <div key={item.id} className="p-3 bg-black/40 border border-white/10 rounded-2xl space-y-2 text-left">
                              <div className="aspect-[4/3] bg-black/60 rounded-xl overflow-hidden border border-white/5">
                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                              </div>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => {
                                  const updated = [...(sec.imageGallery || [])];
                                  updated[gIdx] = { ...item, title: e.target.value };
                                  handleUpdateSection(sec.id, { imageGallery: updated });
                                }}
                                className="w-full bg-transparent font-bold text-xs text-white focus:outline-none"
                              />
                              <p className="text-[10px] text-gray-400">{item.caption}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── 3. BLOCO: BOTÃO DEDICADO DE CTA & OFERTA ── */}
                    {sec.type === 'cta_button_block' && (
                      <div className="text-center max-w-2xl mx-auto space-y-5 p-6 bg-gradient-to-b from-[#0e1738] to-[#080d21] border border-emerald-500/40 rounded-3xl shadow-xl shadow-emerald-500/10">
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-xl lg:text-2xl text-white text-center leading-tight focus:outline-none rounded p-1 resize-none"
                        />
                        <input
                          type="text"
                          value={sec.buttonText || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { buttonText: e.target.value })}
                          className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 text-center focus:outline-none cursor-pointer inline-block"
                        />
                        <div className="text-xs text-gray-300 flex items-center justify-center gap-2 pt-2 border-t border-white/10">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>🔒 Compra 100% Segura • ⚡ Acesso Imediato • 🛡️ 7 Dias de Garantia</span>
                        </div>
                      </div>
                    )}

                    {/* ── 4. BLOCO: BARRA DE ESCASSEZ & URGÊNCIA ── */}
                    {sec.type === 'urgency_timer' && (
                      <div className="p-4 bg-gradient-to-r from-rose-950/40 via-amber-950/40 to-rose-950/40 border border-rose-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-center sm:text-left">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300">
                            <Clock className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={sec.headline || ''}
                              onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                              className="bg-transparent font-black text-xs sm:text-sm text-white focus:outline-none w-full"
                            />
                            <p className="text-[10px] text-gray-400">Esta condição especial não ficará disponível por muito tempo.</p>
                          </div>
                        </div>
                        <div className="text-lg font-black text-amber-300 font-mono bg-black/60 px-4 py-1.5 rounded-xl border border-amber-500/30 mx-auto sm:mx-0">
                          ⏱️ 14:59
                        </div>
                      </div>
                    )}

                    {/* ── 5. BLOCO: TABELA COMPARATIVA ── */}
                    {sec.type === 'comparison_table' && sec.comparisonData && (
                      <div className="space-y-6 text-center max-w-3xl mx-auto">
                        <h3 className="text-xl lg:text-2xl font-black text-white">{sec.headline}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                          {/* Concorrente */}
                          <div className="p-5 bg-rose-950/20 border border-rose-500/30 rounded-2xl space-y-3">
                            <h4 className="text-xs font-black uppercase text-rose-400 flex items-center gap-1.5">
                              <XCircle className="w-4 h-4" />
                              {sec.comparisonData.competitorTitle}
                            </h4>
                            <div className="space-y-2 text-xs text-gray-300">
                              {sec.comparisonData.competitorItems.map((item, cIdx) => (
                                <div key={cIdx} className="flex items-start gap-2">
                                  <span className="text-rose-400 font-bold">✕</span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Nosso Método */}
                          <div className="p-5 bg-emerald-950/20 border border-emerald-500/40 rounded-2xl space-y-3">
                            <h4 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              {sec.comparisonData.ourTitle}
                            </h4>
                            <div className="space-y-2 text-xs text-gray-200">
                              {sec.comparisonData.ourItems.map((item, oIdx) => (
                                <div key={oIdx} className="flex items-start gap-2">
                                  <span className="text-emerald-400 font-bold">✓</span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── 6. BLOCOS DE QUIZ COM CARDS DE IMAGEM & VSL ── */}
                    {sec.type === 'quiz_image_choice' && sec.quizQuestion && (
                      <div className="space-y-6 text-center max-w-3xl mx-auto">
                        <h3 className="text-xl font-black text-white">{sec.headline}</h3>
                        <p className="text-xs text-gray-300">{sec.subtitle}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-2">
                          {sec.quizQuestion.options.map(opt => (
                            <div key={opt.id} className="p-3 bg-black/40 border border-white/10 rounded-2xl space-y-2 hover:border-purple-500/50 transition-all cursor-pointer">
                              <div className="aspect-[4/3] bg-black/60 rounded-xl overflow-hidden">
                                <img src={opt.imageUrl} alt={opt.label} className="w-full h-full object-cover" />
                              </div>
                              <span className="text-xs font-bold text-white block">{opt.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sec.type === 'quiz_mini_vsl' && (
                      <div className="space-y-4 text-center max-w-2xl mx-auto">
                        <h3 className="text-lg font-black text-white">{sec.headline}</h3>
                        <p className="text-xs text-gray-300">{sec.subtitle}</p>
                        <div className="aspect-video bg-black rounded-2xl border border-white/10 flex items-center justify-center shadow-xl">
                          <Play className="w-10 h-10 text-purple-400" />
                        </div>
                      </div>
                    )}

                    {/* ── 7. LAYOUTS PADRÃO (1 COLUNA, 2 COLUNAS, 3 COLUNAS, TSL) ── */}
                    {layout === '1_col_center' && sec.type === 'hero_vsl' && (
                      <div className="space-y-5 text-center max-w-3xl mx-auto">
                        {sec.badge && (
                          <input
                            type="text"
                            value={sec.badge}
                            onChange={(e) => handleUpdateSection(sec.id, { badge: e.target.value })}
                            className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase px-3 py-1 rounded-full text-center focus:outline-none inline-block"
                          />
                        )}
                        <textarea
                          rows={2}
                          value={sec.headline || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                          className="w-full bg-transparent font-black text-xl sm:text-2xl lg:text-3xl text-white text-center leading-tight focus:outline-none rounded p-1 resize-none"
                        />
                        <div className="aspect-video bg-black/80 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-4 relative shadow-2xl my-4">
                          <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shadow-lg">
                            <Play className="w-8 h-8 ml-1" />
                          </div>
                          <span className="text-[11px] text-gray-400 mt-2 font-bold">🎬 Player VSL (Delay aos {sec.videoDelaySeconds || 180}s)</span>
                        </div>
                        {sec.buttonText && (
                          <input
                            type="text"
                            value={sec.buttonText}
                            onChange={(e) => handleUpdateSection(sec.id, { buttonText: e.target.value })}
                            className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white text-xs sm:text-sm font-black uppercase rounded-2xl shadow-xl shadow-emerald-500/25 text-center focus:outline-none cursor-pointer inline-block"
                          />
                        )}
                      </div>
                    )}

                    {(layout === '2_col_split' || layout === '2_col_reverse') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-4">
                          <textarea
                            rows={2}
                            value={sec.headline || ''}
                            onChange={(e) => handleUpdateSection(sec.id, { headline: e.target.value })}
                            className="w-full bg-transparent font-black text-xl lg:text-2xl text-white leading-tight focus:outline-none rounded p-1 resize-none"
                          />
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
                                    className="w-full bg-transparent focus:outline-none rounded"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          {sec.videoUrl ? (
                            <div className="aspect-video bg-black/80 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-4 shadow-xl">
                              <Play className="w-10 h-10 text-indigo-400 mb-2" />
                              <span className="text-xs font-bold text-gray-300">🎬 VSL na Direita</span>
                            </div>
                          ) : (
                            <div className="aspect-square max-h-80 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                              <img src={sec.imageUrl || 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80'} alt="Mockup" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inserir Bloco Entre Seções */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={() => handleAddSection('cta_button_block', '1_col_center', index)}
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

      {/* ── 🌐 MODAL DE SIMULAÇÃO DA PÁGINA ONLINE (100% LIMPA & REAL) ─────── */}
      {isOnlinePreviewOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-xl flex flex-col text-white animate-in fade-in select-none">
          {/* Barra de Controle do Simulador Online */}
          <div className="p-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                🌐 Visualização Online da Página
              </span>
              <span className="text-xs text-zinc-400 hidden sm:inline">
                Simulação real sem ferramentas de edição
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setOnlinePreviewDevice('desktop')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    onlinePreviewDevice === 'desktop' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setOnlinePreviewDevice('mobile')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    onlinePreviewDevice === 'mobile' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
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

          {/* Área de Visualização com Scroll Limpo */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 flex justify-center bg-[#050816]">
            <div 
              className={`transition-all duration-300 bg-[#060a17] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-fit mb-32 ${
                onlinePreviewDevice === 'mobile' ? 'w-full max-w-[390px]' : 'w-full max-w-5xl'
              }`}
            >
              {/* Renderização das Dobras */}
              <div className="p-6 lg:p-12 space-y-16 lg:space-y-24">
                {sections.map((sec, idx) => (
                  <div key={sec.id} className="space-y-6">
                    {/* Hero VSL */}
                    {sec.type === 'hero_vsl' && (
                      <div className="text-center max-w-3xl mx-auto space-y-6">
                        {sec.badge && (
                          <span className="inline-block bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black uppercase px-3 py-1 rounded-full">{sec.badge}</span>
                        )}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">{sec.headline}</h1>
                        <p className="text-sm sm:text-base text-gray-300">{sec.subtitle}</p>
                        <div className="aspect-video bg-black rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center">
                          <Play className="w-12 h-12 text-indigo-400 opacity-80" />
                        </div>
                        {sec.buttonText && (
                          <button
                            onClick={() => toast.success('Redirecionando para o Checkout Seguro...')}
                            className="px-10 py-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-black text-sm sm:text-base uppercase rounded-2xl shadow-xl shadow-emerald-500/25 hover:scale-105 transition-transform cursor-pointer"
                          >
                            {sec.buttonText}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Banner de Imagem */}
                    {sec.type === 'image_banner' && (
                      <div className="text-center space-y-4 max-w-4xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-black text-white">{sec.headline}</h2>
                        <img src={sec.imageUrl} alt="Banner" className="rounded-3xl border border-white/10 shadow-2xl w-full" />
                        {sec.imageCaption && <p className="text-xs text-gray-400">{sec.imageCaption}</p>}
                      </div>
                    )}

                    {/* Mural de Prints */}
                    {sec.type === 'image_social_proof' && (
                      <div className="text-center space-y-6">
                        <h2 className="text-2xl sm:text-3xl font-black text-white">{sec.headline}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          {sec.imageGallery?.map(item => (
                            <div key={item.id} className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2 text-left">
                              <img src={item.imageUrl} alt={item.title} className="rounded-xl aspect-[4/3] object-cover w-full" />
                              <h4 className="text-xs font-bold text-white">{item.title}</h4>
                              <p className="text-[10px] text-gray-400">{item.caption}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botão de CTA Dedicado */}
                    {sec.type === 'cta_button_block' && (
                      <div className="text-center max-w-2xl mx-auto p-8 bg-gradient-to-b from-[#0e1738] to-[#080d21] border-2 border-emerald-500/40 rounded-3xl space-y-6 shadow-2xl">
                        <h2 className="text-2xl sm:text-3xl font-black text-white">{sec.headline}</h2>
                        <p className="text-xs sm:text-sm text-gray-300">{sec.subtitle}</p>
                        <button
                          onClick={() => toast.success('Redirecionando para o Checkout Seguro...')}
                          className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-black text-sm sm:text-base uppercase rounded-2xl shadow-xl shadow-emerald-500/30 hover:scale-105 transition-transform"
                        >
                          {sec.buttonText}
                        </button>
                        <p className="text-xs text-gray-400">{sec.ctaData?.subtext}</p>
                      </div>
                    )}

                    {/* Tabela Comparativa */}
                    {sec.type === 'comparison_table' && sec.comparisonData && (
                      <div className="max-w-3xl mx-auto space-y-6 text-center">
                        <h2 className="text-2xl sm:text-3xl font-black text-white">{sec.headline}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                          <div className="p-6 bg-rose-950/20 border border-rose-500/30 rounded-2xl space-y-3">
                            <h4 className="text-xs font-black uppercase text-rose-400">{sec.comparisonData.competitorTitle}</h4>
                            {sec.comparisonData.competitorItems.map((item, i) => (
                              <div key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                <span className="text-rose-400">✕</span> <span>{item}</span>
                              </div>
                            ))}
                          </div>
                          <div className="p-6 bg-emerald-950/20 border border-emerald-500/40 rounded-2xl space-y-3">
                            <h4 className="text-xs font-black uppercase text-emerald-400">{sec.comparisonData.ourTitle}</h4>
                            {sec.comparisonData.ourItems.map((item, i) => (
                              <div key={i} className="text-xs text-gray-200 flex items-start gap-2">
                                <span className="text-emerald-400">✓</span> <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

                    {currentSec.quizQuestion?.options && (
                      <div className="space-y-2 text-left pt-2">
                        {currentSec.quizQuestion.options.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setQuizSimulatorAnswers(prev => ({ ...prev, [currentSec.id]: opt.id }));
                              if (quizSimulatorStepIndex < sections.length - 1) {
                                setQuizSimulatorStepIndex(prev => prev + 1);
                              }
                            }}
                            className="w-full p-3 rounded-xl bg-white/[0.04] hover:bg-purple-600/30 border border-white/10 hover:border-purple-500/50 text-white text-xs font-bold transition-all flex items-center justify-between group"
                          >
                            <span>{opt.label}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-300" />
                          </button>
                        ))}
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

    </div>
  );
}
