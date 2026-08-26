import { FunnelNodeSubType, FunnelNodeType, FunnelNode, FunnelConnection, FunnelCategory } from '@/types';

export interface BlockMeta {
  type: FunnelNodeType;
  subType: FunnelNodeSubType;
  name: string;
  categoryLabel: string;
  iconName: string;
  badgeColor: string;
  bgGradient: string;
  defaultPrice?: number;
  defaultConversion: number; // %
  defaultCostPerClick?: number;
  strategicGuide: {
    title: string;
    description: string;
    goldenRules: string[];
    actionItems: string[];
  };
}

export const FUNNEL_BLOCK_CATALOG: BlockMeta[] = [
  // ── 🌐 TRÁFEGO (Orgânico & Pago) ──────────────────────────
  {
    type: 'traffic',
    subType: 'pinterest',
    name: 'Pinterest Orgânico / Ads',
    categoryLabel: 'Tráfego & Atração',
    iconName: 'Pin',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    bgGradient: 'from-rose-500/20 to-red-600/10',
    defaultConversion: 2.5,
    defaultCostPerClick: 0.40,
    strategicGuide: {
      title: 'Máquina de Tráfego Perpétuo no Pinterest',
      description: 'O Pinterest funciona como um motor de busca visual. Pins duram meses trazendo leads orgânicos contínuos.',
      goldenRules: [
        'Crie imagens verticais (2:3 / 1000x1500px) com títulos altamente contrastantes.',
        'Use palavras-chave de cauda longa no título do Pin e na descrição da pasta.',
        'Direcione para uma isca digital ou artigo de blog antes da oferta direta.'
      ],
      actionItems: ['Criar 5 variações de Pins', 'Configurar rich pins', 'Organizar 3 pastas temáticas']
    }
  },
  {
    type: 'traffic',
    subType: 'tiktok',
    name: 'TikTok Orgânico / Ads',
    categoryLabel: 'Tráfego & Atração',
    iconName: 'Video',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    bgGradient: 'from-cyan-500/20 to-slate-900/30',
    defaultConversion: 3.0,
    defaultCostPerClick: 0.60,
    strategicGuide: {
      title: 'Vídeos Virais & Tráfego Direto no TikTok',
      description: 'Vídeos curtos de 15 a 45 segundos com ganchos fortes nos primeiros 3 segundos para reter atenção.',
      goldenRules: [
        'Gancho visual + texto nos primeiros 3 segundos.',
        'Entregue uma dica rápida e quebre uma crença comum do nicho.',
        'CTA direto para o link da bio com benefício claro ("Link na bio para baixar o template").'
      ],
      actionItems: ['Gravar 3 roteiros de ganchos virais', 'Adicionar link bio rastreável (UTMs)', 'Fixar 3 melhores vídeos']
    }
  },
  {
    type: 'traffic',
    subType: 'instagram',
    name: 'Instagram (Reels / Stories)',
    categoryLabel: 'Tráfego & Atração',
    iconName: 'Instagram',
    badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    bgGradient: 'from-pink-500/20 to-purple-600/10',
    defaultConversion: 4.0,
    defaultCostPerClick: 1.20,
    strategicGuide: {
      title: 'Aquecimento e Conversão no Instagram',
      description: 'Reels para atração de novas pessoas; Stories e Direct para conexão profunda e fechamento de vendas.',
      goldenRules: [
        'Use Stories para quebrar objeções diárias e mostrar bastidores reais.',
        'Ative automações de direct (ex: "Comente QUERO para receber o link").',
        'Destaques estratégicos organizados como mini-páginas de vendas.'
      ],
      actionItems: ['Planejar sequência de 5 stories de venda', 'Configurar palavra-chave no Direct', 'Organizar destaques']
    }
  },
  {
    type: 'traffic',
    subType: 'youtube',
    name: 'YouTube (Vídeo / Shorts)',
    categoryLabel: 'Tráfego & Atração',
    iconName: 'PlaySquare',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
    bgGradient: 'from-red-500/20 to-orange-600/10',
    defaultConversion: 5.5,
    defaultCostPerClick: 1.50,
    strategicGuide: {
      title: 'Autoridade e Tráfego Quente no YouTube',
      description: 'O melhor canal para gerar compradores conscientes e qualificados através de conteúdo aprofundado.',
      goldenRules: [
        'Thumbnail de alto clique + título focado na dor do cliente.',
        'Coloque o link do checkout/isca nos primeiros 2 parágrafos da descrição e no comentário fixado.',
        'Cards interativos nos momentos de maior retenção do vídeo.'
      ],
      actionItems: ['Criar thumbnail de alto contraste', 'Escrever roteiro focado em retenção', 'Fixar link na descrição']
    }
  },
  {
    type: 'traffic',
    subType: 'google_seo',
    name: 'Google Ads / Artigo SEO',
    categoryLabel: 'Tráfego & Atração',
    iconName: 'Search',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-teal-600/10',
    defaultConversion: 6.0,
    defaultCostPerClick: 2.10,
    strategicGuide: {
      title: 'Tráfego de Intenção de Compra no Google',
      description: 'Pessoas buscando ativamente a solução para o problema que você resolve.',
      goldenRules: [
        'Foque em palavras-chave de fundo de funil (ex: "comprar X", "melhor ferramenta para Y").',
        'Página de destino ultrarrápida com copy alinhada exatamente com o termo buscado.',
        'Extensões de anúncio e prova social em destaque.'
      ],
      actionItems: ['Mapear 10 palavras-chave fundo de funil', 'Criar variações de títulos', 'Otimizar velocidade da LP']
    }
  },
  {
    type: 'traffic',
    subType: 'whatsapp',
    name: 'Lista VIP WhatsApp / Telegram',
    categoryLabel: 'Tráfego & Atração',
    iconName: 'MessageCircle',
    badgeColor: 'bg-green-500/10 text-green-400 border-green-500/30',
    bgGradient: 'from-green-500/20 to-emerald-700/10',
    defaultConversion: 12.0,
    defaultCostPerClick: 0,
    strategicGuide: {
      title: 'Canal Direto de Alta Abertura no WhatsApp',
      description: 'Abertura superior a 85%. Perfeito para ofertas relâmpago, abertura de turmas e lembretes.',
      goldenRules: [
        'Nunca faça spam; envie apenas mensagens de alto valor e comunicados importantes.',
        'Use formatação clara (*negrito*, emojis pontuais e links curtos).',
        'Crie senso de urgência real com vagas ou bônus por tempo limitado.'
      ],
      actionItems: ['Escrever copy do disparo', 'Preparar link rastreado com UTM', 'Criar mensagem de contagem regressiva']
    }
  },
  {
    type: 'traffic',
    subType: 'meta_ads',
    name: 'Meta Ads (Facebook / Instagram Ads)',
    categoryLabel: 'Tráfego & Atração',
    iconName: 'Flame',
    badgeColor: 'bg-blue-600/10 text-blue-400 border-blue-500/30',
    bgGradient: 'from-blue-600/20 to-indigo-700/10',
    defaultConversion: 3.8,
    defaultCostPerClick: 0.95,
    strategicGuide: {
      title: 'Tráfego Pago de Conversão Direta (Meta Ads)',
      description: 'Campanhas de conversão no Feed, Stories e Reels segmentadas por interesses e públicos semelhantes (Lookalike).',
      goldenRules: [
        'Teste pelo menos 3 ganchos visuais e 2 copies para cada conjunto de anúncios.',
        'Otimize para o evento mais profundo do funil com volume (ex: Compra ou Iniciar Checkout).',
        'Mantenha a coerência visual entre o anúncio e a primeira dobra da página de destino.'
      ],
      actionItems: ['Configurar Pixel e CAPI (API de Conversões)', 'Subir 5 criativos validados no HubAds', 'Definir orçamento diário']
    }
  },
  {
    type: 'traffic',
    subType: 'influencer_partner',
    name: 'Parcerias & Influenciadores (Collabs)',
    categoryLabel: 'Tráfego & Atração',
    iconName: 'Users',
    badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    bgGradient: 'from-violet-500/20 to-pink-700/10',
    defaultConversion: 7.5,
    defaultCostPerClick: 1.80,
    strategicGuide: {
      title: 'Tráfego de Autoridade Emprestada & Parcerias',
      description: 'Divulgação através de influenciadores de nicho, publieditoriais e lives conjuntas com cupom exclusivo.',
      goldenRules: [
        'Exija métricas reais de visualizações de Stories e retenção de público antes de fechar.',
        'Entregue um roteiro com os pontos obrigatórios e o cupom/link personalizado.',
        'Combine sequências de 3 stories em formato de indicação genuína do dia a dia.'
      ],
      actionItems: ['Mapear 10 influenciadores de micro-nicho', 'Gerar cupom de desconto rastreável', 'Enviar briefing de gravação']
    }
  },
  {
    type: 'traffic',
    subType: 'native_ads',
    name: 'Tráfego Nativo (Taboola / Outbrain)',
    categoryLabel: 'Tráfego & Atração',
    iconName: 'Layers3',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bgGradient: 'from-amber-500/20 to-orange-700/10',
    defaultConversion: 2.2,
    defaultCostPerClick: 0.35,
    strategicGuide: {
      title: 'Escala em Massa com Anúncios Nativos',
      description: 'Anúncios integrados em grandes portais de notícias como recomendações de leitura, ideais para Advertorials.',
      goldenRules: [
        'Títulos estilo curiosidade jornalística ("Novo método surpreende especialistas...").',
        'Imagens reais, não polidas e sem cara de publicidade comercial.',
        'Direcione obrigatoriamente para um artigo advertorial ou página pre-sell antes da oferta.'
      ],
      actionItems: ['Criar 10 headlines de curiosidade', 'Selecionar imagens de estilo editorial', 'Configurar tracking no Taboola/Outbrain']
    }
  },

  // ── 📄 PÁGINAS & ETAPAS WEB ────────────────────────────────
  {
    type: 'page',
    subType: 'quiz_page',
    name: 'Página de Quiz Interativo',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'HelpCircle',
    badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    bgGradient: 'from-violet-500/20 to-purple-700/10',
    defaultConversion: 28.0,
    strategicGuide: {
      title: 'Quiz Interativo de Alta Conversão',
      description: 'Engaja o visitante através de micro-perguntas personalizadas, qualificando o lead e entregando um diagnóstico sob medida.',
      goldenRules: [
        'Primeira pergunta deve ser ultra-fácil e rápida (ex: "Qual é o seu objetivo principal?").',
        'Use barra de progresso visual para gerar sensação de avanço.',
        'Colete o WhatsApp/E-mail apenas no final para liberar o resultado do diagnóstico.'
      ],
      actionItems: ['Estruturar 5 a 7 perguntas rápidas', 'Definir 3 perfis de diagnóstico', 'Configurar captura de lead no final']
    }
  },
  {
    type: 'page',
    subType: 'quiz_vsl_page',
    name: 'Quiz + VSL Híbrido',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'Sparkles',
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
    bgGradient: 'from-fuchsia-500/20 to-pink-700/10',
    defaultConversion: 12.0,
    strategicGuide: {
      title: 'Funil Híbrido: Quiz ➡️ VSL Personalizada',
      description: 'O lead responde ao quiz e é direcionado para um vídeo de vendas customizado que resolve exatamente a dor que ele selecionou.',
      goldenRules: [
        'O vídeo deve abrir citando o resultado do teste ("Com base no seu perfil X, este é o seu maior obstáculo...").',
        'Gera conexão emocional imediata porque o lead sente que o produto foi feito sob medida para ele.',
        'Pitch direto para a oferta certa de acordo com a resposta do quiz.'
      ],
      actionItems: ['Gravar introduções personalizadas por perfil', 'Conectar lógica de redirecionamento', 'Adicionar botão de checkout delay']
    }
  },
  {
    type: 'page',
    subType: 'static_page',
    name: 'Página Estática / Pre-sell / Artigo',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'FileText',
    badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    bgGradient: 'from-slate-500/20 to-gray-700/10',
    defaultConversion: 15.0,
    strategicGuide: {
      title: 'Página Estática de Aquecimento (Pre-sell)',
      description: 'Página de leitura rápida estilo editorial/notícia que conscientiza tráfego frio antes de enviar para a oferta.',
      goldenRules: [
        'Formato leve sem cara de anúncio agressivo ("Artigo de Descoberta").',
        'História em primeira pessoa com quebra de preconceitos.',
        'Links contextuais no meio do texto direcionando para a página de vendas.'
      ],
      actionItems: ['Escrever artigo no tom de notícia/editorial', 'Inserir links de texto sutis', 'Otimizar para carregamento instantâneo']
    }
  },
  {
    type: 'page',
    subType: 'webinar_page',
    name: 'Página de Webnário / Masterclass',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'Tv',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
    bgGradient: 'from-red-500/20 to-amber-700/10',
    defaultConversion: 8.0,
    strategicGuide: {
      title: 'Webnário / Aula Magna ao Vivo ou Replay',
      description: 'Transmissão com conteúdo aprofundado de 30 a 60 minutos, chat ao vivo e pitch irresistível no final.',
      goldenRules: [
        'Entregue uma aula prática que prove sua autoridade nos primeiros 20 minutos.',
        'Ative o botão de oferta no momento exato do pitch com bônus para quem comprar durante a live.',
        'Dispare lembretes no WhatsApp 1 hora, 15 minutos e "Estamos ao Vivo!".'
      ],
      actionItems: ['Preparar slides da apresentação', 'Configurar player de transmissão', 'Programar disparos de contagem regressiva']
    }
  },
  {
    type: 'page',
    subType: 'capture_page',
    name: 'Página de Captura (Squeeze)',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'Magnet',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    bgGradient: 'from-blue-500/20 to-indigo-600/10',
    defaultConversion: 35.0,
    strategicGuide: {
      title: 'Página de Captura de Alta Conversão',
      description: 'Foco único: transformar visitantes desconhecidos em leads cadastrados com nome e WhatsApp.',
      goldenRules: [
        'Zero distrações: sem menu superior, sem links de rodapé desnecessários.',
        'Headline com a promessa principal da isca em destaque.',
        'Formulário curto: apenas Nome e WhatsApp/E-mail.'
      ],
      actionItems: ['Testar 2 headlines diferentes', 'Integrar com envio automático', 'Adicionar selo de privacidade']
    }
  },
  {
    type: 'page',
    subType: 'vsl_page',
    name: 'Página de VSL (Vídeo de Vendas)',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'Play',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    bgGradient: 'from-purple-500/20 to-violet-700/10',
    defaultConversion: 4.5,
    strategicGuide: {
      title: 'Página com Vídeo de Vendas Magnético (VSL)',
      description: 'Vídeo persuasivo que conduz o espectador pela dor, mecanismo único e apresentação da oferta.',
      goldenRules: [
        'Botão de compra atrasado (delay) para aparecer no momento exato do pitch de vendas.',
        'Player otimizado com autoplay inteligente (som desativado + aviso "Clique para ouvir").',
        'Seção de perguntas frequentes e garantia logo abaixo do vídeo.'
      ],
      actionItems: ['Gravar VSL com roteiro validado', 'Configurar delay do botão de checkout', 'Adicionar FAQ']
    }
  },
  {
    type: 'page',
    subType: 'sales_page',
    name: 'Página de Vendas Longa (LP)',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'FileText',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    bgGradient: 'from-indigo-500/20 to-blue-700/10',
    defaultConversion: 3.5,
    strategicGuide: {
      title: 'Landing Page Completa de Vendas',
      description: 'Estrutura completa com prova social, depoimentos, quebra de objeções e ancoragem de preço.',
      goldenRules: [
        'Promessa clara e específica na primeira dobra (acima do scroll).',
        'Depoimentos em vídeo e prints de resultados reais.',
        'Múltiplos botões de chamada para ação direcionando para o checkout.'
      ],
      actionItems: ['Revisar contraste dos botões CTA', 'Inserir depoimentos reais', 'Configurar selos de segurança']
    }
  },
  {
    type: 'page',
    subType: 'checkout',
    name: 'Checkout Transparente',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'CreditCard',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-teal-700/10',
    defaultConversion: 65.0,
    strategicGuide: {
      title: 'Checkout Transparente de Alta Conversão',
      description: 'O momento da verdade. O checkout do HubCRM já conta com Dark Mode, prova social e PIX instantâneo.',
      goldenRules: [
        'Mantenha o menor número de campos possível no formulário.',
        'Ative Order Bumps atraentes e complementares.',
        'Deixe o selo de garantia incondicional visível ao lado do botão de pagamento.'
      ],
      actionItems: ['Vincular oferta do CRM', 'Ativar Order Bump complementar', 'Testar fluxo PIX e Cartão']
    }
  },
  {
    type: 'page',
    subType: 'thank_you_page',
    name: 'Página de Obrigado / Entrega',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'CheckCircle2',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    bgGradient: 'from-teal-500/20 to-emerald-700/10',
    defaultConversion: 100,
    strategicGuide: {
      title: 'Página de Confirmação & Onboarding',
      description: 'Confirma o pagamento e orienta os próximos passos imediatos do cliente.',
      goldenRules: [
        'Vídeo curto de boas-vindas do fundador orientando como acessar o produto.',
        'Botão para entrar no grupo VIP ou chamar o suporte no WhatsApp.',
        'Pixel de conversão de compra disparado exclusivamente aqui.'
      ],
      actionItems: ['Gravar vídeo de boas-vindas', 'Adicionar link do grupo VIP', 'Verificar disparo de pixel']
    }
  },
  {
    type: 'page',
    subType: 'application_page',
    name: 'Página de Aplicação / Formulário (High-Ticket)',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'FileSpreadsheet',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bgGradient: 'from-amber-500/20 to-yellow-700/10',
    defaultConversion: 18.0,
    strategicGuide: {
      title: 'Formulário de Aplicação & Qualificação',
      description: 'Questionário detalhado para selecionar os melhores perfis para mentorias, consultorias e contratos High-Ticket.',
      goldenRules: [
        'Faça perguntas eliminatórias (ex: "Faturamento mensal atual", "Disponibilidade para investir").',
        'Crie percepção de processo seletivo concorrido e exclusivo.',
        'Redirecione quem for aprovado diretamente para a agenda de agendamento da call.'
      ],
      actionItems: ['Configurar 6 perguntas eliminatórias', 'Integrar respostas ao CRM', 'Configurar redirecionamento para agendamento']
    }
  },
  {
    type: 'page',
    subType: 'upsell_page',
    name: 'Página de Upsell 1-Click (OTO)',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'Zap',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-teal-700/10',
    defaultConversion: 16.0,
    strategicGuide: {
      title: 'Página Dedicada de Oferta Única (One-Time Offer)',
      description: 'Apresentada imediatamente após a compra inicial para dobrar o LTV do cliente com 1 único clique.',
      goldenRules: [
        'Aviso no topo: "ATENÇÃO: Não feche esta página, seu pedido ainda está sendo finalizado...".',
        'Vídeo curto de 90 segundos explicando a oferta de aceleração com super desconto.',
        'Botão "Sim, Adicionar ao Meu Pedido por apenas R$ X" + Link "Não, obrigado".'
      ],
      actionItems: ['Gravar vídeo de oferta de 90 segundos', 'Configurar cobrança de 1 clique no Asaas', 'Adicionar link de recusa para downsell']
    }
  },
  {
    type: 'page',
    subType: 'bridge_page',
    name: 'Página Ponte / Link da Bio (Mobile)',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'Share2',
    badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    bgGradient: 'from-pink-500/20 to-purple-700/10',
    defaultConversion: 32.0,
    strategicGuide: {
      title: 'Página Centralizadora de Links (Bio)',
      description: 'Página mobile-first ultrarrápida estilo Linktree com botões para WhatsApp, Isca, Produtos e Agendamentos.',
      goldenRules: [
        'O link principal deve ter destaque visual e animação suave.',
        'Fotos e logos em alta definição e botões fáceis de tocar no celular.',
        'Instale pixel para mensurar cliques em cada botão da árvore de links.'
      ],
      actionItems: ['Cadastrar links das ofertas ativas', 'Adicionar botão direto do WhatsApp VIP', 'Testar carregamento mobile']
    }
  },
  {
    type: 'page',
    subType: 'member_area',
    name: 'Área de Membros / Portal do Aluno',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'GraduationCap',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    bgGradient: 'from-indigo-500/20 to-blue-800/10',
    defaultConversion: 95.0,
    strategicGuide: {
      title: 'Ambiente de Entrega de Conteúdo & Comunidade',
      description: 'Plataforma onde o aluno assiste às aulas, baixa materiais complementares e interage com a turma.',
      goldenRules: [
        'Organize os módulos com trilhas claras de progresso e barra de conclusão.',
        'Insira botões de suporte e indicação de amigos dentro das aulas.',
        'Destaque ofertas complementares (Upgrades de plano) na barra lateral.'
      ],
      actionItems: ['Organizar grade de módulos', 'Liberar acesso automático pós-compra', 'Inserir links de suporte']
    }
  },

  // ── 💰 MONETIZAÇÃO & OFERTAS ──────────────────────────────
  {
    type: 'offer',
    subType: 'lead_magnet',
    name: 'Isca Digital Gratuita',
    categoryLabel: 'Ofertas & Monetização',
    iconName: 'Gift',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bgGradient: 'from-amber-500/20 to-yellow-600/10',
    defaultPrice: 0,
    defaultConversion: 40.0,
    strategicGuide: {
      title: 'Isca Digital de Alto Valor Percebido',
      description: 'Um conteúdo gratuito prático que gera uma vitória rápida e prepara o lead para a oferta paga.',
      goldenRules: [
        'Deve resolver 1 problema específico em menos de 15 minutos.',
        'Formato de fácil consumo: Checklist, Planilha, Template, Mapa Mental ou Aula Rápida.',
        'A última página da isca deve apresentar a oferta do produto seguinte.'
      ],
      actionItems: ['Criar PDF/Planilha da isca', 'Incluir pitch do produto pago no final', 'Hospedar arquivo no Cloudflare R2']
    }
  },
  {
    type: 'offer',
    subType: 'front_end',
    name: 'Produto de Entrada (Baixo Ticket)',
    categoryLabel: 'Ofertas & Monetização',
    iconName: 'Package',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    bgGradient: 'from-blue-500/20 to-indigo-700/10',
    defaultPrice: 27.00,
    defaultConversion: 5.0,
    strategicGuide: {
      title: 'Produto Front-End (Quebrador de Fricção)',
      description: 'Produto de R$ 19 a R$ 47 projetado para transformar leads em clientes pagantes e pagar o tráfego.',
      goldenRules: [
        'Preço tão acessível que não exige reunião nem pensar duas vezes ("compra por impulso").',
        'Entrega rápida e objetiva que surpreende pelo nível de qualidade.',
        'Objetivo primário: liquidar os custos de anúncios (ad spend).'
      ],
      actionItems: ['Definir nome chiclete da oferta', 'Criar arte de capa 3D', 'Cadastrar no CRM com checkout direto']
    }
  },
  {
    type: 'offer',
    subType: 'order_bump',
    name: 'Order Bump (1-Clique no Checkout)',
    categoryLabel: 'Ofertas & Monetização',
    iconName: 'Zap',
    badgeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    bgGradient: 'from-yellow-500/20 to-amber-700/10',
    defaultPrice: 19.90,
    defaultConversion: 35.0,
    strategicGuide: {
      title: 'Order Bump de Alta Lucratividade',
      description: 'Uma caixinha de seleção na tela de pagamento que aumenta o ticket médio instantaneamente.',
      goldenRules: [
        'Deve complementar perfeitamente o produto principal (ex: "Áudio MP3 + Resumo" ou "Modelos Prontos").',
        'Preço não deve ultrapassar 40% do valor do produto principal.',
        'Copy curta de 2 linhas explicando o benefício imediato.'
      ],
      actionItems: ['Escrever texto de destaque da caixa', 'Definir preço de impulso', 'Ativar checkbox no produto']
    }
  },
  {
    type: 'offer',
    subType: 'upsell',
    name: 'Upsell de 1-Clique (Pós-Compra)',
    categoryLabel: 'Ofertas & Monetização',
    iconName: 'ArrowUpRight',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-teal-700/10',
    defaultPrice: 97.00,
    defaultConversion: 15.0,
    strategicGuide: {
      title: 'Upsell Imediato Pós-Pagamento',
      description: 'Oferecido imediatamente após o cliente aprovar o pagamento, antes da tela de obrigado.',
      goldenRules: [
        'Ajude o cliente a ter o resultado do produto principal de forma mais rápida ou fácil ("Aceleração").',
        'Condição exclusiva de oportunidade única com desconto especial.',
        'Vídeo curto de 2 minutos direto ao ponto sem enrolação.'
      ],
      actionItems: ['Montar página de upsell', 'Gravar vídeo de oferta exclusiva', 'Configurar redirecionamento']
    }
  },
  {
    type: 'offer',
    subType: 'downsell',
    name: 'Downsell (Alternativa Acessível)',
    categoryLabel: 'Ofertas & Monetização',
    iconName: 'ArrowDownRight',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    bgGradient: 'from-orange-500/20 to-amber-700/10',
    defaultPrice: 47.00,
    defaultConversion: 10.0,
    strategicGuide: {
      title: 'Downsell de Recuperação',
      description: 'Aparece apenas se o cliente recusar o Upsell, oferecendo uma versão enxuta ou plano parcelado.',
      goldenRules: [
        'Reduza o escopo do produto para justificar o preço menor.',
        'Ou ofereça exatamente o mesmo produto com mais parcelas sem juros.',
        'Remova qualquer atrito e facilite a decisão.'
      ],
      actionItems: ['Definir produto enxuto', 'Configurar gatilho de recusa do upsell', 'Revisar preço']
    }
  },
  {
    type: 'offer',
    subType: 'subscription',
    name: 'Assinatura / SaaS / Comunidade',
    categoryLabel: 'Ofertas & Monetização',
    iconName: 'Repeat',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    bgGradient: 'from-indigo-500/20 to-purple-800/10',
    defaultPrice: 97.00,
    defaultConversion: 8.0,
    strategicGuide: {
      title: 'Motor de Receita Recorrente (MRR / LTV)',
      description: 'O verdadeiro coração financeiro do ecossistema. Transforma clientes pontuais em receita previsível.',
      goldenRules: [
        'Entregue novos conteúdos, ferramentas, encontros ou suporte contínuo todo mês.',
        'Gamificação e comunidade ativa reduzem drasticamente o cancelamento (churn).',
        'Ofereça bônus de permanência no 3º e 6º mês.'
      ],
      actionItems: ['Configurar plano de assinatura no Asaas', 'Definir benefícios mensais', 'Criar calendário de rituais']
    }
  },
  {
    type: 'offer',
    subType: 'high_ticket',
    name: 'Mentoria / High-Ticket / Consultoria',
    categoryLabel: 'Ofertas & Monetização',
    iconName: 'Crown',
    badgeColor: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
    bgGradient: 'from-amber-400/20 to-yellow-600/10',
    defaultPrice: 2500.00,
    defaultConversion: 2.0,
    strategicGuide: {
      title: 'Oferta de Alto Valor (Back-End)',
      description: 'Acompanhamento próximo, consultoria personalizada ou implementação direta para clientes VIP.',
      goldenRules: [
        'Venda através de formulário de aplicação ou sessão diagnóstica 1 a 1 no WhatsApp.',
        'Foco em retorno sobre investimento claro e redução de tempo para o cliente.',
        'Escassez real com limite restrito de vagas para manter a qualidade de entrega.'
      ],
      actionItems: ['Criar formulário de qualificação', 'Roteiro de fechamento consultivo', 'Definir limite de mentorados']
    }
  },
  {
    type: 'offer',
    subType: 'tripwire_offer',
    name: 'Oferta Tripwire (Ativação de Baixo Custo)',
    categoryLabel: 'Ofertas & Monetização',
    iconName: 'Ticket',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-teal-700/10',
    defaultPrice: 10.00,
    defaultConversion: 12.0,
    strategicGuide: {
      title: 'Oferta Tripwire / Quebra de Fricção Financeira',
      description: 'Produto de R$ 7 a R$ 19 oferecido logo após a isca digital para transformar leads gratuitos em compradores pagantes.',
      goldenRules: [
        'Deve ter valor percebido 10x maior que o preço cobrado.',
        'Objetivo não é o lucro imediato, mas construir a lista de compradores.',
        'Ative Order Bump e Upsell imediatamente após a aprovação.'
      ],
      actionItems: ['Criar produto de ativação rápida', 'Configurar oferta na página de obrigado da isca', 'Conectar ao checkout direto']
    }
  },
  {
    type: 'offer',
    subType: 'bundle_offer',
    name: 'Combo / Kit Promocional (Bundle)',
    categoryLabel: 'Ofertas & Monetização',
    iconName: 'Package',
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
    bgGradient: 'from-fuchsia-500/20 to-purple-700/10',
    defaultPrice: 147.00,
    defaultConversion: 6.5,
    strategicGuide: {
      title: 'Pacote / Combo com Ancoragem de Valor',
      description: 'Combinação de 2 a 4 produtos da sua esteira com desconto progressivo no checkout.',
      goldenRules: [
        'Mostre o preço individual de cada item somado vs o valor promocional do combo.',
        'Exemplo: "Leve Produto A (R$ 97) + Produto B (R$ 97) por apenas R$ 147".',
        'Gera sensação imediata de economia inteligente.'
      ],
      actionItems: ['Selecionar produtos do pacote', 'Cadastrar oferta do combo no CRM', 'Criar mockup 3D do kit']
    }
  },
  {
    type: 'page',
    subType: 'blog_site',
    name: 'Blog / Site de Conteúdo & SEO',
    categoryLabel: 'Páginas & Etapas',
    iconName: 'Globe',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-teal-700/10',
    defaultConversion: 5.0,
    strategicGuide: {
      title: 'Portal de Conteúdo & Geração de Audiência',
      description: 'Seu hub central de autoridade na internet. Onde você publica artigos de SEO, reviews, notícias e converte visitantes em compradores através de banners e links contextuais.',
      goldenRules: [
        'Insira CTAs (Chamadas para Ação) no topo, meio e final de cada artigo.',
        'Use popups de saída (Exit-intent) oferecendo uma Isca Digital gratuita.',
        'Conecte links para produtos próprios e produtos de afiliados nas recomendações.'
      ],
      actionItems: ['Publicar 3 artigos pilares com SEO', 'Configurar banners laterais para ofertas', 'Inserir formulário de newsletter']
    }
  },

  // ── 🛒 AFILIAÇÃO & LOJAS PARCEIRAS ──────────────────────────
  {
    type: 'offer',
    subType: 'affiliate_amazon',
    name: 'Produto Afiliado Amazon',
    categoryLabel: 'Afiliação & Parcerias',
    iconName: 'ShoppingBag',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bgGradient: 'from-amber-500/20 to-orange-700/10',
    defaultPrice: 150.00,
    defaultConversion: 8.0,
    strategicGuide: {
      title: 'Monetização com Programa de Associados Amazon',
      description: 'Recomende livros, equipamentos, eletrônicos ou produtos físicos da Amazon e receba comissão automática por cada venda gerada pelo seu link.',
      goldenRules: [
        'A Amazon paga comissão sobre todo o carrinho que o cliente comprar nas próximas 24 horas.',
        'Crie reviews honestos em vídeo ou artigo mostrando os benefícios práticos do produto.',
        'Use links curtos e rastreáveis com a sua tag de associado Amazon.'
      ],
      actionItems: ['Cadastrar ID de Associado Amazon', 'Gerar link de afiliado do produto', 'Inserir botão de compra nos artigos e vídeos']
    }
  },
  {
    type: 'offer',
    subType: 'affiliate_shopee',
    name: 'Achadinho / Afiliado Shopee',
    categoryLabel: 'Afiliação & Parcerias',
    iconName: 'ShoppingBag',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    bgGradient: 'from-orange-500/20 to-red-600/10',
    defaultPrice: 45.00,
    defaultConversion: 12.0,
    strategicGuide: {
      title: 'Vendas em Massa com Afiliados Shopee',
      description: 'Ideal para produtos virais de baixo custo ("Achadinhos") promovidos no TikTok, Pinterest, Reels e canais do Telegram/WhatsApp.',
      goldenRules: [
        'Foque em produtos curiosos, úteis para o dia a dia e com preço abaixo de R$ 50.',
        'Divulgue cupons de frete grátis e promoções relâmpago para acelerar a decisão.',
        'Crie uma coleção/loja vitrine na Shopee com todos os seus produtos indicados.'
      ],
      actionItems: ['Pegar link de afiliado Shopee', 'Criar vídeo de demonstração do produto', 'Disparar no grupo de Achadinhos do WhatsApp']
    }
  },
  {
    type: 'offer',
    subType: 'affiliate_mercadolivre',
    name: 'Produto Afiliado Mercado Livre',
    categoryLabel: 'Afiliação & Parcerias',
    iconName: 'ShoppingBag',
    badgeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    bgGradient: 'from-yellow-500/20 to-amber-600/10',
    defaultPrice: 120.00,
    defaultConversion: 9.0,
    strategicGuide: {
      title: 'Programa de Afiliados Mercado Livre',
      description: 'Aproveite a força da entrega Full e da confiança do Mercado Livre para indicar produtos com alta taxa de conversão.',
      goldenRules: [
        'Destaque produtos com selo "Chegará Amanhã / Full" para matar a objeção de tempo de entrega.',
        'Compare 2 modelos do mesmo produto para guiar o cliente na melhor escolha.',
        'Insira seu link de afiliado ML no comparativo.'
      ],
      actionItems: ['Gerar link do Mercado Livre Afiliados', 'Destacar prazo de entrega Full', 'Criar card de recomendação']
    }
  },
  {
    type: 'offer',
    subType: 'affiliate_product',
    name: 'Infoproduto / Curso Afiliado (Hotmart/Kiwify)',
    categoryLabel: 'Afiliação & Parcerias',
    iconName: 'ExternalLink',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    bgGradient: 'from-purple-500/20 to-indigo-700/10',
    defaultPrice: 197.00,
    defaultConversion: 4.0,
    strategicGuide: {
      title: 'Afiliação de Infoprodutos e Ferramentas',
      description: 'Venda cursos, mentorias ou softwares de terceiros com comissões altas (de 30% a 70% por venda).',
      goldenRules: [
        'Ofereça um bônus exclusivo seu para quem comprar pelo seu link de afiliado.',
        'Escolha produtos com página de vendas impecável e recuperação de vendas ativa.',
        'Use sua própria experiência como aluno/usuário como depoimento.'
      ],
      actionItems: ['Pegar link de afiliado na plataforma', 'Criar bônus exclusivo de entrega', 'Adicionar no fluxo do funil']
    }
  },

  // ── 🤖 AUTOMAÇÕES & RECUPERAÇÃO ───────────────────────────
  {
    type: 'automation',
    subType: 'email_seq',
    name: 'Sequência de E-mails Inteligente',
    categoryLabel: 'Automação & Régua',
    iconName: 'Mail',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    bgGradient: 'from-sky-500/20 to-blue-800/10',
    defaultConversion: 6.0,
    strategicGuide: {
      title: 'Régua de E-mails de Nutrição & Vendas',
      description: 'Sequência automática disparada após o cadastro na isca ou abandono de checkout.',
      goldenRules: [
        'E-mail 1: Entrega imediata da isca + história de conexão.',
        'E-mail 2: O maior erro cometido no nicho e como evitar.',
        'E-mail 3: Prova social e apresentação da oferta.',
        'E-mail 4: Quebra da maior objeção.',
        'E-mail 5: Última chamada com bônus relâmpago.'
      ],
      actionItems: ['Redigir os 5 e-mails da régua', 'Configurar tags e disparos automáticos', 'Testar entrega']
    }
  },
  {
    type: 'automation',
    subType: 'whatsapp_auto',
    name: 'Disparo de WhatsApp Automático',
    categoryLabel: 'Automação & Régua',
    iconName: 'Send',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-green-700/10',
    defaultConversion: 18.0,
    strategicGuide: {
      title: 'Recuperação Ativa de Vendas no WhatsApp',
      description: 'Mensagem personalizada para quem gerou Pix/Boleto e ainda não pagou, ou abandonou o carrinho.',
      goldenRules: [
        'Tom humano e consultivo ("Oi [Nome], vi que você tentou garantir o acesso... teve alguma dúvida?").',
        'Envie a chave Pix Copia e Cola diretamente no texto.',
        'Disparo ideal: 15 minutos após a tentativa de compra.'
      ],
      actionItems: ['Configurar webhook de recuperação', 'Escrever template humanizado', 'Testar envio no WhatsApp']
    }
  },
  {
    type: 'automation',
    subType: 'whatsapp_x1',
    name: 'Atendimento WhatsApp X1 (Closer / Vendas)',
    categoryLabel: 'Automação & Régua',
    iconName: 'MessageSquare',
    badgeColor: 'bg-green-500/10 text-green-400 border-green-500/30',
    bgGradient: 'from-green-500/20 to-emerald-700/10',
    defaultConversion: 38.0,
    strategicGuide: {
      title: 'Atendimento Consultivo 1 a 1 no WhatsApp (X1)',
      description: 'Negociação direta com o cliente para tirar dúvidas, quebrar objeções específicas e enviar link de checkout personalizado.',
      goldenRules: [
        'Responda em menos de 5 minutos com áudios curtos e acolhedores.',
        'Faça perguntas para entender a real situação do cliente antes de mandar o link de compra.',
        'Envie prints de resultados de outros clientes durante a conversa.'
      ],
      actionItems: ['Configurar script de fechamento X1', 'Cadastrar respostas rápidas no WhatsApp Business', 'Acompanhar taxa de conversão do atendente']
    }
  },
  {
    type: 'automation',
    subType: 'whatsapp_bot',
    name: 'Chatbot / Triagem Inteligente (Typebot / IA)',
    categoryLabel: 'Automação & Régua',
    iconName: 'Bot',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    bgGradient: 'from-cyan-500/20 to-teal-700/10',
    defaultConversion: 25.0,
    strategicGuide: {
      title: 'Atendimento Automatizado & Triagem de Leads',
      description: 'Fluxo conversacional no WhatsApp com inteligência artificial para qualificar o lead, coletar dados e direcionar para o atendente ideal.',
      goldenRules: [
        'Primeira mensagem com botões de múltipla escolha para resposta em 1 toque.',
        'Se o lead for de alto valor (High-Ticket), transfira imediatamente para um vendedor humano.',
        'Salve as respostas do lead automaticamente no CRM.'
      ],
      actionItems: ['Montar fluxo de perguntas no Typebot/IA', 'Configurar tag de lead quente', 'Integrar webhook de transferência']
    }
  },
  {
    type: 'automation',
    subType: 'whatsapp_group',
    name: 'Grupo VIP WhatsApp / Comunidade',
    categoryLabel: 'Automação & Régua',
    iconName: 'Users',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-green-700/10',
    defaultConversion: 22.0,
    strategicGuide: {
      title: 'Lançamento & Grupos VIP no WhatsApp',
      description: 'Grupo fechado com administradores para criar grande expectativa, liberar aulas ao vivo e abrir o carrinho com bônus exclusivos.',
      goldenRules: [
        'Mantenha o grupo silenciado a maior parte do tempo para não gerar dispersão.',
        'Abra o grupo em horários agendados (ex: "Plantão de Dúvidas de 1h").',
        'Dispare contagem regressiva e ofertas com vagas limitadas.'
      ],
      actionItems: ['Criar link de redirecionador de grupos', 'Agendar cronograma de mensagens de aquecimento', 'Preparar cópia da abertura de carrinho']
    }
  },
  {
    type: 'automation',
    subType: 'live_chat',
    name: 'Chat ao Vivo no Site / Webchat',
    categoryLabel: 'Automação & Régua',
    iconName: 'MessageSquareCode',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    bgGradient: 'from-blue-500/20 to-indigo-700/10',
    defaultConversion: 28.0,
    strategicGuide: {
      title: 'Atendimento Flutuante no Checkout & Landing Page',
      description: 'Widget de chat no canto inferior da página para tirar dúvidas de compradores indecisos antes de abandonarem o site.',
      goldenRules: [
        'Ative mensagem automática após 30 segundos na página de checkout ("Posso te ajudar com sua compra?").',
        'Ofereça suporte direto no WhatsApp se o atendente estiver offline.',
        'Tenha respostas prontas sobre garantia, formas de pagamento e acesso.'
      ],
      actionItems: ['Instalar widget no checkout e LP', 'Configurar horário de atendimento online', 'Cadastrar templates de suporte']
    }
  },
  {
    type: 'automation',
    subType: 'tag_lead',
    name: 'Tag / Pontuação de Lead (Lead Scoring)',
    categoryLabel: 'Automação & Régua',
    iconName: 'Tag',
    badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    bgGradient: 'from-violet-500/20 to-purple-700/10',
    defaultConversion: 100.0,
    strategicGuide: {
      title: 'Segmentação Comportamental & Tags no CRM',
      description: 'Aplica etiquetas e pontuações no contato quando ele executa ações específicas no funil (baixou isca, visitou checkout, comprou).',
      goldenRules: [
        'Tags claras e padronizadas (ex: `STATUS_LEAD_QUENTE`, `ORIGEM_INSTAGRAM`, `COMPROU_PRODUTO_A`).',
        'Use para filtrar e disparar campanhas hiper-segmentadas de remarketing.',
        'Aumente o score do lead a cada nova interação de valor.'
      ],
      actionItems: ['Definir taxonomia de tags', 'Configurar gatilho de adição de tag', 'Conectar ao fluxo de automação']
    }
  },
  {
    type: 'automation',
    subType: 'pix_recovery',
    name: 'Recuperação Pix Imediata',
    categoryLabel: 'Automação & Régua',
    iconName: 'Zap',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    bgGradient: 'from-teal-500/20 to-emerald-700/10',
    defaultConversion: 42.0,
    strategicGuide: {
      title: 'Resgate de Pix Gerado & Não Pago',
      description: 'Ação rápida nos primeiros 5 a 10 minutos após o comprador gerar o QR Code Pix no checkout transparente.',
      goldenRules: [
        'Envie o código Copia e Cola limpo em mensagem separada para facilitar a cópia com 1 toque no celular.',
        'Lembre que a chave expira em pouco tempo e a vaga pode ser liberada.',
        'Pergunte se houve alguma instabilidade no aplicativo do banco.'
      ],
      actionItems: ['Configurar gatilho de Pix pendente', 'Personalizar mensagem com QR Code/Chave', 'Testar envio imediato']
    }
  },
  {
    type: 'automation',
    subType: 'remarketing',
    name: 'Campanha de Remarketing (Meta/Google)',
    categoryLabel: 'Automação & Régua',
    iconName: 'RefreshCw',
    badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    bgGradient: 'from-violet-500/20 to-purple-800/10',
    defaultConversion: 8.5,
    defaultCostPerClick: 0.90,
    strategicGuide: {
      title: 'Remarketing Cirúrgico de Fundo de Funil',
      description: 'Anúncios direcionados exclusivamente para quem visitou a página de vendas ou checkout nos últimos 7 dias.',
      goldenRules: [
        'Criativo estilo "Quebra de Objeção" ou "Depoimento de Aluno".',
        'Criativo de "Últimos dias com condição especial".',
        'Exclua quem já comprou da lista de público.'
      ],
      actionItems: ['Criar público personalizado no Gerenciador de Anúncios', 'Subir 2 criativos de prova social', 'Configurar exclusão de compradores']
    }
  },
  {
    type: 'automation',
    subType: 'email_broadcast',
    name: 'E-mail Único / Broadcast',
    categoryLabel: 'E-mail & Multicanal',
    iconName: 'Inbox',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    bgGradient: 'from-blue-500/20 to-sky-700/10',
    defaultConversion: 5.0,
    strategicGuide: {
      title: 'Disparo de E-mail Único / Comunicado',
      description: 'Envio pontual para toda a base ou lista segmentada com novidades, avisos ou ofertas relâmpago.',
      goldenRules: [
        'Assunto com alta taxa de abertura e sem palavras que ativem filtro de spam.',
        'Um único objetivo e CTA bem definido no corpo do texto.',
        'Segmentar por engajamento dos últimos 30 a 90 dias.'
      ],
      actionItems: ['Escrever assunto com pré-header', 'Testar links do corpo', 'Filtrar segmento ativo']
    }
  },
  {
    type: 'automation',
    subType: 'delay_timer',
    name: 'Delay / Temporizador de Espera',
    categoryLabel: 'E-mail & Multicanal',
    iconName: 'Clock',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bgGradient: 'from-amber-500/20 to-yellow-700/10',
    defaultConversion: 100.0,
    strategicGuide: {
      title: 'Controle de Tempo e Cadência no Fluxo',
      description: 'Pausa a execução do fluxo por horas ou dias para respeitar o tempo de decisão do lead.',
      goldenRules: [
        'Dê espaço entre mensagens para não saturar o lead (1 a 3 dias entre e-mails).',
        'Para WhatsApp, use pausas curtas (15 a 45 minutos) na recuperação de carrinho.',
        'Evite disparos automáticos de madrugada (programe para horário comercial).'
      ],
      actionItems: ['Definir tempo de espera (dias/horas)', 'Ajustar janela de horário comercial', 'Conectar ao próximo nó']
    }
  },
  {
    type: 'automation',
    subType: 'condition_branch',
    name: 'Condicional / Decisão (Se/Então)',
    categoryLabel: 'E-mail & Multicanal',
    iconName: 'GitBranch',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    bgGradient: 'from-indigo-500/20 to-violet-700/10',
    defaultConversion: 50.0,
    strategicGuide: {
      title: 'Ramificação Inteligente por Comportamento',
      description: 'Divide o fluxo em dois caminhos (Sim/Não) com base em ações do contato (abertura, clique, compra).',
      goldenRules: [
        'Exemplo 1: Se clicou na proposta ➡️ Notificar vendedor / Enviar WhatsApp.',
        'Exemplo 2: Se não abriu o e-mail em 24h ➡️ Reenviar com novo assunto.',
        'Evite condicionais em cascata muito complexas para manter a clareza.'
      ],
      actionItems: ['Definir critério de decisão', 'Conectar caminho positivo', 'Conectar caminho de fallback']
    }
  },
  {
    type: 'automation',
    subType: 'sms_transactional',
    name: 'SMS Transacional / Cobrança',
    categoryLabel: 'E-mail & Multicanal',
    iconName: 'Smartphone',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    bgGradient: 'from-cyan-500/20 to-teal-700/10',
    defaultConversion: 14.0,
    strategicGuide: {
      title: 'Disparo de SMS de Alta Urgência',
      description: 'Mensagem de texto curta de até 160 caracteres com taxa de entrega instantânea no celular.',
      goldenRules: [
        'Ideal para códigos 2FA, aviso de Pix gerado e lembretes no dia do vencimento.',
        'Use links curtos personalizados com UTMs de rastreio.',
        'Identifique o nome da sua empresa no início da mensagem.'
      ],
      actionItems: ['Escrever texto de até 160 caracteres', 'Encurtar link de pagamento', 'Testar envio no celular']
    }
  },
  {
    type: 'automation',
    subType: 'voice_bot',
    name: 'Robô de Voz / Ligação Automatizada',
    categoryLabel: 'E-mail & Multicanal',
    iconName: 'Mic',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    bgGradient: 'from-purple-500/20 to-fuchsia-700/10',
    defaultConversion: 22.0,
    strategicGuide: {
      title: 'Confirmação e Cobrança por Voz',
      description: 'Ligação telefônica automática com gravação profissional para confirmar presenças ou resgatar vendas.',
      goldenRules: [
        'Mensagem de áudio clara e objetiva com menos de 30 segundos.',
        'Ofereça opção de interação (ex: "Disque 1 para confirmar sua presença").',
        'Dispare no momento de maior disponibilidade do cliente.'
      ],
      actionItems: ['Gravar áudio profissional', 'Configurar árvore de resposta DTMF', 'Testar ligação de teste']
    }
  },

  // ── 🏢 VENDAS B2B & NEGOCIAÇÃO CORPORATIVA ────────────────
  {
    type: 'b2b',
    subType: 'b2b_meeting',
    name: 'Agendamento de Reunião (Demo / Call)',
    categoryLabel: 'Vendas B2B & Corporativo',
    iconName: 'Calendar',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    bgGradient: 'from-indigo-500/20 to-blue-700/10',
    defaultConversion: 35.0,
    strategicGuide: {
      title: 'Agendamento de Demonstração Comercial',
      description: 'Etapa onde o lead seleciona o melhor dia e horário na agenda do executivo de contas.',
      goldenRules: [
        'Envie confirmação imediata por e-mail e WhatsApp com link do Google Meet.',
        'Dispare lembretes automáticos 24h e 1h antes da reunião.',
        'Inclua perguntas pré-call para o executivo estudar o cliente antes da call.'
      ],
      actionItems: ['Conectar link da agenda Calendly/Meet', 'Configurar régua de lembretes', 'Definir duração padrão (30/45 min)']
    }
  },
  {
    type: 'b2b',
    subType: 'b2b_qualification',
    name: 'Qualificação SDR / Diagnóstico',
    categoryLabel: 'Vendas B2B & Corporativo',
    iconName: 'PhoneCall',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-teal-700/10',
    defaultConversion: 40.0,
    strategicGuide: {
      title: 'Diagnóstico & Qualificação Comercial (SDR)',
      description: 'Ligação de 10 a 15 minutos para entender orçamento, autoridade, necessidade e timing (BANT).',
      goldenRules: [
        'Faça perguntas abertas sobre as dores e gargalos atuais da empresa.',
        'Valide se a pessoa que está na call é a tomadora de decisão.',
        'Só passe para a demo executiva os leads que atenderem ao perfil ICP.'
      ],
      actionItems: ['Criar roteiro de perguntas BANT', 'Definir pontuação mínima de corte', 'Configurar repasse para o Closer']
    }
  },
  {
    type: 'b2b',
    subType: 'b2b_proposal',
    name: 'Envio de Proposta Comercial / Orçamento',
    categoryLabel: 'Vendas B2B & Corporativo',
    iconName: 'Briefcase',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bgGradient: 'from-amber-500/20 to-orange-700/10',
    defaultConversion: 45.0,
    defaultPrice: 5000,
    strategicGuide: {
      title: 'Apresentação e Envio de Proposta B2B',
      description: 'Envio formal do PDF de proposta com escopo, cronograma, entregáveis e investimento.',
      goldenRules: [
        'Apresente a proposta ao vivo em call antes de apenas enviar o arquivo.',
        'Coloque prazo de validade de 5 a 7 dias para ancorar a condição negociada.',
        'Destaque o ROI esperado e cases de clientes semelhantes.'
      ],
      actionItems: ['Montar modelo de proposta padrão', 'Definir opções de pacotes (Tier 1 / Tier 2)', 'Configurar tracking de visualização']
    }
  },
  {
    type: 'b2b',
    subType: 'contract_signing',
    name: 'Assinatura Eletrônica de Contrato',
    categoryLabel: 'Vendas B2B & Corporativo',
    iconName: 'FileSignature',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    bgGradient: 'from-cyan-500/20 to-blue-700/10',
    defaultConversion: 80.0,
    strategicGuide: {
      title: 'Fechamento Jurídico com Assinatura Digital',
      description: 'Etapa de envio do contrato para assinatura eletrônica com validade jurídica (DocuSign/ZapSign).',
      goldenRules: [
        'Envie o link de assinatura para todos os signatários e testemunhas.',
        'Ative lembrete automático diário até a assinatura completa.',
        'Notifique o financeiro e o time de onboarding assim que assinado.'
      ],
      actionItems: ['Subir minuta padrão de contrato', 'Cadastrar dados dos signatários', 'Integrar webhook de contrato assinado']
    }
  },
  {
    type: 'b2b',
    subType: 'corporate_invoice',
    name: 'Faturamento PJ & Nota Fiscal (NF-e)',
    categoryLabel: 'Vendas B2B & Corporativo',
    iconName: 'Receipt',
    badgeColor: 'bg-green-500/10 text-green-400 border-green-500/30',
    bgGradient: 'from-green-500/20 to-emerald-700/10',
    defaultConversion: 95.0,
    defaultPrice: 10000,
    strategicGuide: {
      title: 'Emissão de Fatura Corporativa & NF-e',
      description: 'Geração de boleto bancário corporativo a prazo (ex: 15/30/60 dias) e emissão de nota fiscal de serviço.',
      goldenRules: [
        'Confira os dados cadastrais (Razão Social, CNPJ, Inscrição Estadual/Municipal).',
        'Envie a NF-e e o boleto diretamente para o e-mail do setor financeiro do cliente.',
        'Régua de lembrete 3 dias antes do vencimento do boleto.'
      ],
      actionItems: ['Coletar dados de faturamento PJ', 'Emitir NF-e na prefeitura', 'Enviar boleto e fatura detalhada']
    }
  },

  // ── ⚙️ PÓS-VENDA, SUCESSO DO CLIENTE (CS) & RETENÇÃO ───────
  {
    type: 'cs',
    subType: 'client_onboarding',
    name: 'Onboarding de Cliente / Kick-off',
    categoryLabel: 'Pós-Venda & Sucesso (CS)',
    iconName: 'Rocket',
    badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    bgGradient: 'from-violet-500/20 to-purple-700/10',
    defaultConversion: 90.0,
    strategicGuide: {
      title: 'Boas-Vindas & Alinhamento Inicial (Kick-off)',
      description: 'Reunião com o gestor de contas para entrega de acessos, alinhamento de metas e cronograma de implementação.',
      goldenRules: [
        'Realize o kick-off nos primeiros 5 dias após a assinatura do contrato.',
        'Entregue um checklist claro de primeiras tarefas para o cliente.',
        'Estabeleça os canais de comunicação direta (Slack, WhatsApp VIP ou HubChat).'
      ],
      actionItems: ['Agendar reunião de kick-off', 'Liberar acessos e credenciais', 'Criar grupo de comunicação dedicado']
    }
  },
  {
    type: 'cs',
    subType: 'support_ticket',
    name: 'Abertura de Chamado / Helpdesk',
    categoryLabel: 'Pós-Venda & Sucesso (CS)',
    iconName: 'LifeBuoy',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    bgGradient: 'from-rose-500/20 to-pink-700/10',
    defaultConversion: 100.0,
    strategicGuide: {
      title: 'Atendimento & Resolução de Dúvidas',
      description: 'Centralização de solicitações técnicas ou operacionais do cliente com controle de SLA e prioridade.',
      goldenRules: [
        'Responda à primeira mensagem em menos de 15 minutos em horário útil.',
        'Classifique a criticidade (Baixa, Média, Alta, Urgente).',
        'Mantenha o cliente atualizado em cada etapa da resolução.'
      ],
      actionItems: ['Definir SLA de atendimento', 'Criar categorias de chamados', 'Treinar equipe de suporte']
    }
  },
  {
    type: 'cs',
    subType: 'nps_survey',
    name: 'Pesquisa de Satisfação NPS (0 a 10)',
    categoryLabel: 'Pós-Venda & Sucesso (CS)',
    iconName: 'Star',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bgGradient: 'from-amber-500/20 to-yellow-700/10',
    defaultConversion: 45.0,
    strategicGuide: {
      title: 'Medição Contínua de Satisfação (NPS)',
      description: 'Disparo da pergunta padrão: "Em uma escala de 0 a 10, o quanto você recomendaria nossa empresa para um colega?".',
      goldenRules: [
        'Dispare aos 30 dias de uso e depois a cada trimestre.',
        'Clientes Promotores (9-10): Peça depoimento ou indicação no Hub Rewards.',
        'Clientes Detratores (0-6): Ligue imediatamente para entender e reverter a insatisfação.'
      ],
      actionItems: ['Configurar formulário de 1 clique', 'Automatizar alerta para notas menores que 7', 'Conectar promotores ao programa de indicações']
    }
  },
  {
    type: 'cs',
    subType: 'contract_renewal',
    name: 'Renovação de Contrato / Up-Sell',
    categoryLabel: 'Pós-Venda & Sucesso (CS)',
    iconName: 'RefreshCcw',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    bgGradient: 'from-teal-500/20 to-emerald-700/10',
    defaultConversion: 75.0,
    defaultPrice: 12000,
    strategicGuide: {
      title: 'Renovação Anual & Expansão de Contrato (Up-Sell)',
      description: 'Etapa de apresentação dos resultados alcançados no período para renovação ou upgrade de plano.',
      goldenRules: [
        'Inicie as conversas de renovação 45 a 60 dias antes do término do contrato.',
        'Apresente um relatório consolidado com o valor gerado (ROI e metas batidas).',
        'Ofereça novos módulos ou suporte premium como oportunidade de expansão.'
      ],
      actionItems: ['Montar relatório executivo de resultados', 'Agendar call de revisão de contas', 'Enviar aditivo de renovação']
    }
  },
  {
    type: 'cs',
    subType: 'referral_program',
    name: 'Indique e Ganhe / Programa de Indicação',
    categoryLabel: 'Pós-Venda & Sucesso (CS)',
    iconName: 'UserPlus',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-teal-700/10',
    defaultConversion: 20.0,
    strategicGuide: {
      title: 'Motor de Crescimento por Indicação (Member Get Member)',
      description: 'Incentivo para clientes satisfeitos indicarem amigos e colegas em troca de descontos na mensalidade, bônus ou comissões.',
      goldenRules: [
        'Ative o convite de indicação logo após uma nota alta no NPS (9 ou 10).',
        'Ofereça benefício para os dois lados (quem indica ganha desconto, o indicado ganha bônus).',
        'Facilite o compartilhamento com botão direto "Enviar Convite no WhatsApp".'
      ],
      actionItems: ['Definir recompensa de indicação', 'Gerar link de convite exclusivo por cliente', 'Criar mensagem padrão de WhatsApp']
    }
  },
  {
    type: 'cs',
    subType: 'testimonial_request',
    name: 'Coleta de Depoimento / Prova Social',
    categoryLabel: 'Pós-Venda & Sucesso (CS)',
    iconName: 'Star',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bgGradient: 'from-amber-500/20 to-yellow-700/10',
    defaultConversion: 30.0,
    strategicGuide: {
      title: 'Coleta Estruturada de Prova Social em Vídeo/Texto',
      description: 'Solicitação de depoimento e print de faturamento/resultado quando o cliente atinge sua primeira vitória ou marco.',
      goldenRules: [
        'Peça o depoimento no auge do entusiasmo do cliente (ex: primeira venda realizada ou projeto entregue).',
        'Envie 3 perguntas simples de guia ("Como era antes?", "Qual resultado teve?", "O que diria para quem está em dúvida?").',
        'Suba as fotos e vídeos coletados no construtor de checkouts do CRM.'
      ],
      actionItems: ['Montar formulário rápido de depoimento', 'Gravar vídeo de pedido com carinho', 'Adicionar depoimentos na página de checkout']
    }
  },

  // ── 👥 RH & PROCESSOS INTERNOS ───────────────────────────
  {
    type: 'hr',
    subType: 'hr_recruitment',
    name: 'Triagem & Recrutamento de Talentos',
    categoryLabel: 'RH & Processos Internos',
    iconName: 'UserCheck',
    badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    bgGradient: 'from-pink-500/20 to-rose-700/10',
    defaultConversion: 25.0,
    strategicGuide: {
      title: 'Funil de Atração & Seleção de Candidatos',
      description: 'Etapa de divulgação de vagas, recebimento de currículos e triagem dos melhores perfis.',
      goldenRules: [
        'Descrição da vaga clara com requisitos indispensáveis e diferenciais.',
        'Formulário com perguntas de teste prático antes da primeira entrevista.',
        'Feedback transparente para todos os candidatos em cada fase.'
      ],
      actionItems: ['Publicar página da vaga', 'Configurar formulário de inscrição', 'Criar scorecard de avaliação']
    }
  },
  {
    type: 'hr',
    subType: 'team_training',
    name: 'Treinamento & Capacitação de Equipe',
    categoryLabel: 'RH & Processos Internos',
    iconName: 'GraduationCap',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    bgGradient: 'from-sky-500/20 to-indigo-700/10',
    defaultConversion: 85.0,
    strategicGuide: {
      title: 'Onboarding Interno & Treinamento de Colaboradores',
      description: 'Trilha de vídeos, procedimentos operacionais padrão (POPs) e manuais para novos membros do time.',
      goldenRules: [
        'Divida o treinamento nos primeiros 15 e 30 dias com metas de aprendizagem.',
        'Designe um padrinho/mentor na equipe para tirar dúvidas diárias.',
        'Aplique um mini-quiz de fixação ao final de cada módulo crítico.'
      ],
      actionItems: ['Organizar trilha de vídeos e manuais', 'Atribuir padrinho ao novo colaborador', 'Agendar avaliação de 30 dias']
    }
  },

  // ── 🎯 INTELIGÊNCIA DO CRM & NOTAS LIVRES ─────────────────
  {
    type: 'icp',
    subType: 'icp_persona',
    name: 'Perfil ICP / Persona Ideal',
    categoryLabel: 'Inteligência do CRM',
    iconName: 'Target',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bgGradient: 'from-amber-500/20 to-orange-700/10',
    defaultConversion: 100.0,
    strategicGuide: {
      title: 'Mapeamento de Perfil de Cliente Ideal (ICP)',
      description: 'Conecta o perfil exato do cliente (dores, desejos, objeções e faixa de renda) aos canais e páginas do funil.',
      goldenRules: [
        'Selecione o ICP real cadastrado no CRM para carregar dores e objeções automaticamente.',
        'Ligue o ICP diretamente ao canal de tráfego de onde essa persona mais consome conteúdo.',
        'Alinhe a promessa da primeira página com a dor número 1 do ICP.'
      ],
      actionItems: ['Selecionar Perfil ICP cadastrado', 'Ligar ao canal de atração correspondente', 'Revisar dores e objeções mapeadas']
    }
  },
  {
    type: 'note',
    subType: 'sticky_note',
    name: 'Post-it / Nota Adesiva',
    categoryLabel: 'Anotações & Notas',
    iconName: 'StickyNote',
    badgeColor: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    bgGradient: 'from-yellow-400/20 to-amber-600/10',
    defaultConversion: 100.0,
    strategicGuide: {
      title: 'Nota Adesiva de Estratégia & Metas',
      description: 'Cartão de anotações livres para registrar metas de CAC, ideias de copy, tarefas pendentes da equipe ou observações.',
      goldenRules: [
        'Use cores diferentes para tipos de notas (ex: Amarelo para metas, Rosa para ideias, Verde para tarefas aprovadas).',
        'Posicione o post-it próximo à etapa relevante do fluxo.',
        'Mantenha anotações curtas e acionáveis.'
      ],
      actionItems: ['Digitar o texto da anotação', 'Escolher a cor do post-it', 'Posicionar no quadro']
    }
  }
];

export interface FunnelTemplate {
  id: string;
  title: string;
  category: FunnelCategory;
  categoryName: string;
  badge: string;
  description: string;
  estimatedROI: string;
  nodes: FunnelNode[];
  connections: FunnelConnection[];
}

export const MARKET_FUNNEL_TEMPLATES: FunnelTemplate[] = [
  {
    id: 'template-low-ticket-bump-sub',
    title: 'Funil Perpétuo: Baixo Ticket + Order Bump + Assinatura',
    category: 'perpetual',
    categoryName: 'Perpétuo & Escala',
    badge: '🏆 Mais Usado no Mercado',
    description: 'O modelo clássico de escala com tráfego pago: atrai compradores com produto acessível de R$ 27, lucra no checkout com Order Bump de R$ 19 e gera receita recorrente de R$ 97/mês.',
    estimatedROI: '3.8x ROAS',
    nodes: [
      {
        id: 'node-1',
        type: 'traffic',
        subType: 'instagram',
        label: 'Meta Ads (Instagram/FB)',
        subtitle: 'Criativos de Tráfego Direto',
        x: 100,
        y: 200,
        costPerClick: 1.20,
        status: 'ready'
      },
      {
        id: 'node-2',
        type: 'page',
        subType: 'vsl_page',
        label: 'Página de VSL / Oferta',
        subtitle: 'Vídeo de 8 Minutos + Pitch',
        x: 420,
        y: 200,
        conversionRate: 6.0,
        status: 'ready'
      },
      {
        id: 'node-3',
        type: 'page',
        subType: 'checkout',
        label: 'Checkout Transparente',
        subtitle: 'PIX 1-Clique + Cartão',
        x: 750,
        y: 200,
        conversionRate: 65.0,
        status: 'ready'
      },
      {
        id: 'node-4',
        type: 'offer',
        subType: 'front_end',
        label: 'Produto Front-End (R$ 27)',
        subtitle: 'Template & Método Rápido',
        x: 750,
        y: 50,
        price: 27.00,
        conversionRate: 100,
        status: 'ready'
      },
      {
        id: 'node-5',
        type: 'offer',
        subType: 'order_bump',
        label: 'Order Bump (+R$ 19,90)',
        subtitle: 'Pack de Áudios & Resumos',
        x: 750,
        y: 350,
        price: 19.90,
        conversionRate: 38.0,
        status: 'ready'
      },
      {
        id: 'node-6',
        type: 'offer',
        subType: 'subscription',
        label: 'Assinatura Hub (R$ 97/mês)',
        subtitle: 'Portal de Membros / Ferramentas',
        x: 1080,
        y: 200,
        price: 97.00,
        conversionRate: 12.0,
        status: 'ready'
      },
      {
        id: 'node-7',
        type: 'automation',
        subType: 'whatsapp_auto',
        label: 'Recuperação no WhatsApp',
        subtitle: 'Pix Gerado & Carrinho',
        x: 750,
        y: 500,
        conversionRate: 20.0,
        status: 'ready'
      }
    ],
    connections: [
      { id: 'c-1-2', fromNodeId: 'node-1', toNodeId: 'node-2', style: 'solid' },
      { id: 'c-2-3', fromNodeId: 'node-2', toNodeId: 'node-3', style: 'solid' },
      { id: 'c-3-4', fromNodeId: 'node-3', toNodeId: 'node-4', style: 'solid' },
      { id: 'c-3-5', fromNodeId: 'node-3', toNodeId: 'node-5', style: 'solid' },
      { id: 'c-3-6', fromNodeId: 'node-3', toNodeId: 'node-6', style: 'animated' },
      { id: 'c-3-7', fromNodeId: 'node-3', toNodeId: 'node-7', style: 'dashed' }
    ]
  },
  {
    id: 'template-organic-pinterest-tiktok',
    title: 'Funil Orgânico: Pinterest & TikTok ➡️ Isca ➡️ WhatsApp',
    category: 'organic',
    categoryName: 'Orgânico & Sem Anúncios',
    badge: '🌿 100% Tráfego Gratuito',
    description: 'Atraia milhares de visualizações gratuitas por mês no Pinterest e TikTok, converta em leads com uma Isca Digital irresistível e feche vendas no 1 a 1 pelo WhatsApp.',
    estimatedROI: '∞ ROI (Sem custo de mídia)',
    nodes: [
      {
        id: 'node-1',
        type: 'traffic',
        subType: 'pinterest',
        label: 'Pinterest Orgânico',
        subtitle: 'Pins Diários de Infográficos',
        x: 100,
        y: 100,
        costPerClick: 0,
        status: 'ready'
      },
      {
        id: 'node-2',
        type: 'traffic',
        subType: 'tiktok',
        label: 'TikTok Orgânico',
        subtitle: 'Vídeos Curtos & Ganchos Virais',
        x: 100,
        y: 320,
        costPerClick: 0,
        status: 'ready'
      },
      {
        id: 'node-3',
        type: 'page',
        subType: 'capture_page',
        label: 'Página de Captura da Isca',
        subtitle: 'Download Gratuito de Checklist',
        x: 440,
        y: 200,
        conversionRate: 42.0,
        status: 'ready'
      },
      {
        id: 'node-4',
        type: 'offer',
        subType: 'lead_magnet',
        label: 'Isca Digital (Checklist PDF)',
        subtitle: 'Vitória Rápida em 10 Minutos',
        x: 750,
        y: 80,
        price: 0,
        conversionRate: 100,
        status: 'ready'
      },
      {
        id: 'node-5',
        type: 'traffic',
        subType: 'whatsapp',
        label: 'Grupo VIP / Chat WhatsApp',
        subtitle: 'Conexão Direta & Oferta Especial',
        x: 750,
        y: 320,
        conversionRate: 15.0,
        status: 'ready'
      },
      {
        id: 'node-6',
        type: 'page',
        subType: 'checkout',
        label: 'Checkout Exclusivo de Grupo',
        subtitle: 'Condição Especial para a Lista',
        x: 1080,
        y: 320,
        conversionRate: 70.0,
        status: 'ready'
      }
    ],
    connections: [
      { id: 'c-1-3', fromNodeId: 'node-1', toNodeId: 'node-3', style: 'solid' },
      { id: 'c-2-3', fromNodeId: 'node-2', toNodeId: 'node-3', style: 'solid' },
      { id: 'c-3-4', fromNodeId: 'node-3', toNodeId: 'node-4', style: 'solid' },
      { id: 'c-3-5', fromNodeId: 'node-3', toNodeId: 'node-5', style: 'animated' },
      { id: 'c-5-6', fromNodeId: 'node-5', toNodeId: 'node-6', style: 'solid' }
    ]
  },
  {
    id: 'template-b2b-high-ticket',
    title: 'Funil B2B: Anúncio ➡️ Diagnóstico ➡️ High-Ticket',
    category: 'high_ticket',
    categoryName: 'High-Ticket & B2B',
    badge: '💎 Alto Valor por Venda',
    description: 'Projetado para consultorias, serviços premium de R$ 2.500 a R$ 10.000 e clientes corporativos que exigem qualificação prévia e reunião estratégica.',
    estimatedROI: '5.2x ROAS',
    nodes: [
      {
        id: 'node-1',
        type: 'traffic',
        subType: 'google_seo',
        label: 'Google Ads (Fundo de Funil)',
        subtitle: 'Termos de Alta Intenção B2B',
        x: 100,
        y: 200,
        costPerClick: 3.50,
        status: 'ready'
      },
      {
        id: 'node-2',
        type: 'page',
        subType: 'advertorial',
        label: 'Página de Estudo de Caso',
        subtitle: 'Como o Cliente X Aumentou 3x',
        x: 420,
        y: 200,
        conversionRate: 18.0,
        status: 'ready'
      },
      {
        id: 'node-3',
        type: 'page',
        subType: 'capture_page',
        label: 'Formulário de Aplicação',
        subtitle: 'Qualificação de Faturamento',
        x: 750,
        y: 200,
        conversionRate: 25.0,
        status: 'ready'
      },
      {
        id: 'node-4',
        type: 'offer',
        subType: 'high_ticket',
        label: 'Mentoria / Projeto (R$ 5.000)',
        subtitle: 'Fechamento em Reunião 1 a 1',
        x: 1080,
        y: 200,
        price: 5000.00,
        conversionRate: 20.0,
        status: 'ready'
      },
      {
        id: 'node-5',
        type: 'automation',
        subType: 'remarketing',
        label: 'Remarketing de Depoimentos',
        subtitle: 'Vídeos de Prova Social',
        x: 420,
        y: 420,
        costPerClick: 1.10,
        status: 'ready'
      }
    ],
    connections: [
      { id: 'c-1-2', fromNodeId: 'node-1', toNodeId: 'node-2', style: 'solid' },
      { id: 'c-2-3', fromNodeId: 'node-2', toNodeId: 'node-3', style: 'solid' },
      { id: 'c-3-4', fromNodeId: 'node-3', toNodeId: 'node-4', style: 'solid' },
      { id: 'c-2-5', fromNodeId: 'node-2', toNodeId: 'node-5', style: 'dashed' },
      { id: 'c-5-3', fromNodeId: 'node-5', toNodeId: 'node-3', style: 'dashed' }
    ]
  },
  {
    id: 'template-meteoric-launch',
    title: 'Funil de Lançamento no WhatsApp (24 Horas)',
    category: 'launch',
    categoryName: 'Lançamento & Picos',
    badge: '⚡ Explosão de Vendas',
    description: 'Concentra o tráfego em grupos silenciosos do WhatsApp durante 5 a 7 dias e abre o carrinho por apenas 24 horas com desconto e bônus relâmpago.',
    estimatedROI: '6.5x ROAS',
    nodes: [
      {
        id: 'node-1',
        type: 'traffic',
        subType: 'instagram',
        label: 'Tráfego Pago & Orgânico',
        subtitle: 'Chamada para o Grupo VIP',
        x: 100,
        y: 200,
        costPerClick: 0.90,
        status: 'ready'
      },
      {
        id: 'node-2',
        type: 'page',
        subType: 'capture_page',
        label: 'Página de Entrada do Grupo',
        subtitle: 'Botão Direto "Entrar no Grupo"',
        x: 420,
        y: 200,
        conversionRate: 55.0,
        status: 'ready'
      },
      {
        id: 'node-3',
        type: 'traffic',
        subType: 'whatsapp',
        label: 'Grupos VIP Silenciosos',
        subtitle: 'Aquecimento de 5 Dias',
        x: 750,
        y: 200,
        conversionRate: 18.0,
        status: 'ready'
      },
      {
        id: 'node-4',
        type: 'page',
        subType: 'checkout',
        label: 'Checkout de 24 Horas',
        subtitle: 'Condição Especial Exclusiva',
        x: 1080,
        y: 200,
        conversionRate: 75.0,
        status: 'ready'
      },
      {
        id: 'node-5',
        type: 'offer',
        subType: 'front_end',
        label: 'Oferta Especial (R$ 197)',
        subtitle: 'Curso Completo + 3 Bônus',
        x: 1080,
        y: 40,
        price: 197.00,
        conversionRate: 100,
        status: 'ready'
      },
      {
        id: 'node-6',
        type: 'offer',
        subType: 'upsell',
        label: 'Upsell VIP (+R$ 297)',
        subtitle: 'Acompanhamento de 30 Dias',
        x: 1080,
        y: 380,
        price: 297.00,
        conversionRate: 22.0,
        status: 'ready'
      }
    ],
    connections: [
      { id: 'c-1-2', fromNodeId: 'node-1', toNodeId: 'node-2', style: 'solid' },
      { id: 'c-2-3', fromNodeId: 'node-2', toNodeId: 'node-3', style: 'solid' },
      { id: 'c-3-4', fromNodeId: 'node-3', toNodeId: 'node-4', style: 'animated' },
      { id: 'c-4-5', fromNodeId: 'node-4', toNodeId: 'node-5', style: 'solid' },
      { id: 'c-4-6', fromNodeId: 'node-4', toNodeId: 'node-6', style: 'solid' }
    ]
  },
  {
    id: 'template-quiz-vsl-hybrid',
    title: 'Funil de Quiz Interativo + VSL Customizada',
    category: 'perpetual',
    categoryName: 'Quiz & Segmentação',
    badge: '🧩 Ultra Qualificação de Lead',
    description: 'O lead responde um teste interativo de 5 perguntas, recebe um diagnóstico em vídeo (VSL) feito sob medida para a dor dele e é direcionado para o checkout de alta conversão.',
    estimatedROI: '4.6x ROAS',
    nodes: [
      {
        id: 'node-1',
        type: 'traffic',
        subType: 'tiktok',
        label: 'TikTok & Meta Ads',
        subtitle: 'Chamada: "Faça o Teste Gratuito"',
        x: 100,
        y: 200,
        costPerClick: 0.70,
        status: 'ready'
      },
      {
        id: 'node-2',
        type: 'page',
        subType: 'quiz_page',
        label: 'Quiz de Diagnóstico (5 Perguntas)',
        subtitle: 'Micro-compromissos & Segmentação',
        x: 420,
        y: 200,
        conversionRate: 65.0,
        status: 'ready'
      },
      {
        id: 'node-3',
        type: 'page',
        subType: 'quiz_vsl_page',
        label: 'Resultado + VSL Personalizada',
        subtitle: 'Vídeo Focado na Dor Selecionada',
        x: 750,
        y: 200,
        conversionRate: 14.0,
        status: 'ready'
      },
      {
        id: 'node-4',
        type: 'page',
        subType: 'checkout',
        label: 'Checkout Transparente',
        subtitle: 'PIX 1-Clique + Oferta Exclusiva',
        x: 1080,
        y: 200,
        conversionRate: 70.0,
        status: 'ready'
      },
      {
        id: 'node-5',
        type: 'offer',
        subType: 'front_end',
        label: 'Solução Personalizada (R$ 67)',
        subtitle: 'Produto Específico para o Perfil',
        x: 1080,
        y: 50,
        price: 67.00,
        conversionRate: 100,
        status: 'ready'
      },
      {
        id: 'node-6',
        type: 'offer',
        subType: 'order_bump',
        label: 'Order Bump (+R$ 29,90)',
        subtitle: 'Plano de Ação Acelerador',
        x: 1080,
        y: 360,
        price: 29.90,
        conversionRate: 42.0,
        status: 'ready'
      },
      {
        id: 'node-7',
        type: 'automation',
        subType: 'whatsapp_auto',
        label: 'Envio do Diagnóstico no WhatsApp',
        subtitle: 'Entrega do Resultado + Lembrete',
        x: 750,
        y: 420,
        conversionRate: 25.0,
        status: 'ready'
      }
    ],
    connections: [
      { id: 'c-1-2', fromNodeId: 'node-1', toNodeId: 'node-2', style: 'solid' },
      { id: 'c-2-3', fromNodeId: 'node-2', toNodeId: 'node-3', style: 'solid' },
      { id: 'c-3-4', fromNodeId: 'node-3', toNodeId: 'node-4', style: 'solid' },
      { id: 'c-4-5', fromNodeId: 'node-4', toNodeId: 'node-5', style: 'solid' },
      { id: 'c-4-6', fromNodeId: 'node-4', toNodeId: 'node-6', style: 'solid' },
      { id: 'c-2-7', fromNodeId: 'node-2', toNodeId: 'node-7', style: 'dashed' },
      { id: 'c-7-4', fromNodeId: 'node-7', toNodeId: 'node-4', style: 'dashed' }
    ]
  },
  {
    id: 'template-b2b-enterprise-sales',
    title: 'Orquestração Comercial B2B: Inbound ➡️ Demo ➡️ Proposta ➡️ Contrato & NF-e',
    category: 'b2b',
    categoryName: 'Vendas B2B & Consultivo',
    badge: '🏢 B2B Enterprise (R$ 5.000 a R$ 50.000+)',
    description: 'Fluxo completo de vendas corporativas: Captação Inbound, Qualificação SDR, Demo com Executivo, Envio de Proposta, Assinatura Eletrônica e Faturamento PJ.',
    estimatedROI: 'Ticket Médio R$ 8.500 | Ciclo 14 dias',
    nodes: [
      {
        id: 'b2b-1',
        type: 'traffic',
        subType: 'google_seo',
        label: 'Google Ads / LinkedIn',
        subtitle: 'Tráfego B2B Qualificado',
        x: 50,
        y: 200,
        costPerClick: 3.50,
        status: 'ready'
      },
      {
        id: 'b2b-2',
        type: 'page',
        subType: 'capture_page',
        label: 'Landing Page Corporativa',
        subtitle: 'Apresentação da Solução B2B',
        x: 350,
        y: 200,
        conversionRate: 18.0,
        status: 'ready'
      },
      {
        id: 'b2b-3',
        type: 'b2b',
        subType: 'b2b_meeting',
        label: 'Agendamento de Call Demo',
        subtitle: 'Booking no Calendário Meet',
        x: 650,
        y: 200,
        conversionRate: 45.0,
        status: 'ready'
      },
      {
        id: 'b2b-4',
        type: 'b2b',
        subType: 'b2b_qualification',
        label: 'Qualificação SDR (BANT)',
        subtitle: 'Validação de Perfil & Orçamento',
        x: 950,
        y: 200,
        conversionRate: 60.0,
        status: 'ready'
      },
      {
        id: 'b2b-5',
        type: 'b2b',
        subType: 'b2b_proposal',
        label: 'Apresentação de Proposta (R$ 10k)',
        subtitle: 'Proposta Comercial Personalizada',
        x: 1250,
        y: 200,
        price: 10000,
        conversionRate: 50.0,
        status: 'ready'
      },
      {
        id: 'b2b-6',
        type: 'b2b',
        subType: 'contract_signing',
        label: 'Assinatura Digital (DocuSign)',
        subtitle: 'Validação Jurídica de Contrato',
        x: 1550,
        y: 200,
        conversionRate: 85.0,
        status: 'ready'
      },
      {
        id: 'b2b-7',
        type: 'b2b',
        subType: 'corporate_invoice',
        label: 'Faturamento PJ & NF-e',
        subtitle: 'Boleto Bancário Corporativo',
        x: 1850,
        y: 200,
        price: 10000,
        conversionRate: 98.0,
        status: 'ready'
      },
      {
        id: 'b2b-8',
        type: 'cs',
        subType: 'client_onboarding',
        label: 'Onboarding & Kick-off',
        subtitle: 'Reunião Inicial com Gestor de Contas',
        x: 2150,
        y: 200,
        conversionRate: 100.0,
        status: 'ready'
      },
      {
        id: 'b2b-9',
        type: 'automation',
        subType: 'email_seq',
        label: 'Régua de E-mails Educativos',
        subtitle: 'Nutrição para Não-Qualificados',
        x: 950,
        y: 380,
        conversionRate: 12.0,
        status: 'ready'
      }
    ],
    connections: [
      { id: 'cb-1-2', fromNodeId: 'b2b-1', toNodeId: 'b2b-2', style: 'solid' },
      { id: 'cb-2-3', fromNodeId: 'b2b-2', toNodeId: 'b2b-3', style: 'solid' },
      { id: 'cb-3-4', fromNodeId: 'b2b-3', toNodeId: 'b2b-4', style: 'solid' },
      { id: 'cb-4-5', fromNodeId: 'b2b-4', toNodeId: 'b2b-5', style: 'solid' },
      { id: 'cb-5-6', fromNodeId: 'b2b-5', toNodeId: 'b2b-6', style: 'solid' },
      { id: 'cb-6-7', fromNodeId: 'b2b-6', toNodeId: 'b2b-7', style: 'solid' },
      { id: 'cb-7-8', fromNodeId: 'b2b-7', toNodeId: 'b2b-8', style: 'solid' },
      { id: 'cb-4-9', fromNodeId: 'b2b-4', toNodeId: 'b2b-9', style: 'dashed' },
      { id: 'cb-9-3', fromNodeId: 'b2b-9', toNodeId: 'b2b-3', style: 'dashed' }
    ]
  },
  {
    id: 'template-cs-retention-onboarding',
    title: 'Esteira de Pós-Venda, Sucesso do Cliente (CS), NPS & Renovação',
    category: 'cs',
    categoryName: 'Pós-Venda & Sucesso do Cliente',
    badge: '🔄 Retenção & LTV (Anti-Churn)',
    description: 'Processo completo de pós-venda: Boas-vindas Kick-off, Atendimento Helpdesk, Pesquisa NPS aos 30 dias e Renovação Anual com Up-sell.',
    estimatedROI: 'Redução de Churn em 40% | Expansão de LTV',
    nodes: [
      {
        id: 'cs-1',
        type: 'cs',
        subType: 'client_onboarding',
        label: 'Kick-off de Boas-Vindas',
        subtitle: 'Liberação de Acessos & POPs',
        x: 100,
        y: 200,
        conversionRate: 100.0,
        status: 'ready'
      },
      {
        id: 'cs-2',
        type: 'automation',
        subType: 'delay_timer',
        label: 'Aguardar 30 Dias',
        subtitle: 'Período de Maturação do Cliente',
        x: 400,
        y: 200,
        conversionRate: 100.0,
        status: 'ready'
      },
      {
        id: 'cs-3',
        type: 'cs',
        subType: 'nps_survey',
        label: 'Pesquisa NPS (0 a 10)',
        subtitle: 'Diagnóstico de Satisfação',
        x: 700,
        y: 200,
        conversionRate: 65.0,
        status: 'ready'
      },
      {
        id: 'cs-4',
        type: 'automation',
        subType: 'condition_branch',
        label: 'Cliente Promotor? (NPS 9-10)',
        subtitle: 'Decisão por Nota de Satisfação',
        x: 1000,
        y: 200,
        conversionRate: 50.0,
        status: 'ready'
      },
      {
        id: 'cs-5',
        type: 'cs',
        subType: 'contract_renewal',
        label: 'Renovação + Up-Sell (R$ 15k)',
        subtitle: 'Expansão de Escopo & Módulos VIP',
        x: 1350,
        y: 100,
        price: 15000,
        conversionRate: 75.0,
        status: 'ready'
      },
      {
        id: 'cs-6',
        type: 'cs',
        subType: 'support_ticket',
        label: 'Plano de Resgate & Suporte VIP',
        subtitle: 'Reunião Imediata com Diretor de CS',
        x: 1350,
        y: 320,
        conversionRate: 80.0,
        status: 'ready'
      }
    ],
    connections: [
      { id: 'ccs-1-2', fromNodeId: 'cs-1', toNodeId: 'cs-2', style: 'solid' },
      { id: 'ccs-2-3', fromNodeId: 'cs-2', toNodeId: 'cs-3', style: 'solid' },
      { id: 'ccs-3-4', fromNodeId: 'cs-3', toNodeId: 'cs-4', style: 'solid' },
      { id: 'ccs-4-5', fromNodeId: 'cs-4', toNodeId: 'cs-5', style: 'solid' },
      { id: 'ccs-4-6', fromNodeId: 'cs-4', toNodeId: 'cs-6', style: 'dashed' },
      { id: 'ccs-6-5', fromNodeId: 'cs-6', toNodeId: 'cs-5', style: 'dashed' }
    ]
  }
];

export const FUNNEL_TEMPLATES = MARKET_FUNNEL_TEMPLATES;
