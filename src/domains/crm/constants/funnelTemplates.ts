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
  }
];
