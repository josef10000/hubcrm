import { VSLBlockType, VSLScriptBlock, PageQuizSectionType, PageQuizSection } from '@/types';

// ── 🎬 DEFINIÇÃO DOS BLOCOS DE NARRATIVA DE VSL ───────────────────────────────

export interface VSLBlockDefinition {
  type: VSLBlockType;
  title: string;
  category: 'hook' | 'story' | 'mechanism' | 'offer' | 'close';
  description: string;
  goldenRules: string[];
  defaultBulletPoints: string[];
  badgeColor: string;
}

export const VSL_BLOCK_DEFINITIONS: Record<VSLBlockType, VSLBlockDefinition> = {
  hook_a: {
    type: 'hook_a',
    title: '🪝 Gancho A: Curiosidade & Quebra de Padrão (0-30s)',
    category: 'hook',
    description: 'Abertura disruptiva que paralisa o feed e cria uma pergunta inevitável na mente do lead.',
    goldenRules: [
      'Não se apresente nos primeiros 10 segundos; foque 100% na dor ou choque do lead.',
      'Use elementos visuais ou frases que quebrem o padrão habitual do nicho.',
      'Crie um loop aberto de curiosidade que só será fechado no final do vídeo.'
    ],
    defaultBulletPoints: [
      'Declaração chocante ou estatística contra-intuitiva',
      'Apresentação do erro comum que 90% das pessoas cometem',
      'Promessa de revelar o segredo nos próximos minutos'
    ],
    badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
  },
  hook_b: {
    type: 'hook_b',
    title: '🪝 Gancho B: Controvérsia & Inimigo Comum (0-30s)',
    category: 'hook',
    description: 'Abertura que ataca um mito da indústria e expõe a razão pela qual o lead nunca teve culpa pelo fracasso.',
    goldenRules: [
      'Aponte o dedo para uma verdade que todo mundo finge que não existe.',
      'Retire o peso da culpa dos ombros do lead imediatamente.'
    ],
    defaultBulletPoints: [
      'Por que o que os "gurus" te ensinaram está te fazendo perder dinheiro',
      'A verdade oculta que a indústria tradicional não quer que você descubra'
    ],
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
  },
  hook_c: {
    type: 'hook_c',
    title: '🪝 Gancho C: Prova Visual & Caso Real (0-30s)',
    category: 'hook',
    description: 'Abertura começando diretamente com um print, extrato, foto de antes/depois ou áudio real de cliente.',
    goldenRules: [
      'Mostre a prova no primeiro frame do vídeo sem rodeios.',
      'Diga: "O que você está vendo na tela aconteceu em apenas X dias... e hoje vou te mostrar exatamente como reproduzir."'
    ],
    defaultBulletPoints: [
      'Exibição do resultado inquestionável nos 3 primeiros segundos',
      'Declaração de que qualquer pessoa comum pode aplicar o mesmo método'
    ],
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
  },
  lead_empathy: {
    type: 'lead_empathy',
    title: '🎯 Lead de Empatia & Espelho da Dor (30s-2min)',
    category: 'hook',
    description: 'Validação profunda do sofrimento diário do cliente, provando que você o entende melhor do que ele mesmo.',
    goldenRules: [
      'Descreva o dia a dia do lead com detalhes específicos (sensações físicas e pensamentos noturnos).',
      'Estabeleça a Big Idea da sua mensagem.'
    ],
    defaultBulletPoints: [
      'Descrição do momento de frustração ao tentar e não conseguir',
      'Validação de que ele já gastou tempo e dinheiro com métodos ineficazes',
      'Promessa de uma solução definitiva sem complexidade'
    ],
    badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30'
  },
  enemy_myth: {
    type: 'enemy_myth',
    title: '⚡ O Inimigo Comum & Desmascarando o Mito',
    category: 'story',
    description: 'Identificação do verdadeiro vilão que impedia o sucesso do lead até hoje.',
    goldenRules: [
      'Crie um vilão conceitual (ex: a burocracia, o algoritmo antigo, a dieta restritiva).',
      'Nunca culpe o cliente; a culpa é do método antigo.'
    ],
    defaultBulletPoints: [
      'Por que a abordagem tradicional está matematicamente condenada',
      'A armadilha oculta que ninguém te contou até hoje'
    ],
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30'
  },
  hero_story: {
    type: 'hero_story',
    title: '📖 A História de Origem & Fundo do Poço',
    category: 'story',
    description: 'A narrativa de superação do especialista ou do primeiro aluno-teste.',
    goldenRules: [
      'Mostre vulnerabilidade real no momento de fundo do poço.',
      'O momento de iluminação/descoberta deve parecer natural e fruto de muita dor/pesquisa.'
    ],
    defaultBulletPoints: [
      'O dia em que tudo deu errado e a dor chegou ao limite',
      'A busca incessante por uma resposta fora da caixa',
      'O momento do clique / epifania'
    ],
    badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30'
  },
  unique_mechanism: {
    type: 'unique_mechanism',
    title: '⚙️ O Novo Mecanismo Único (A Lógica da Solução)',
    category: 'mechanism',
    description: 'A explicação de COMO e POR QUE essa solução funciona quando todas as outras falham.',
    goldenRules: [
      'Dê um nome proprietário ao seu mecanismo (ex: "Protocolo 3X", "Método Validação Ativa").',
      'Use analogias simples do cotidiano para explicar o conceito.'
    ],
    defaultBulletPoints: [
      'Nomeação do Mecanismo Único',
      'Os 3 pilares lógicos de funcionamento',
      'Por que ele independe de sorte, experiência prévia ou ferramentas caras'
    ],
    badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
  },
  epiphany_method: {
    type: 'epiphany_method',
    title: '💡 A Sistematização do Passo a Passo',
    category: 'mechanism',
    description: 'A transformação do mecanismo em um método simples e replicável para qualquer pessoa.',
    goldenRules: [
      'Mostre que você empacotou anos de erros em um atalho de poucos cliques/dias.'
    ],
    defaultBulletPoints: [
      'Como testamos com os primeiros 10 alunos e todos tiveram o mesmo resultado',
      'A criação do checklist / roadmap passo a passo'
    ],
    badgeColor: 'bg-teal-500/10 text-teal-300 border-teal-500/30'
  },
  offer_pitch: {
    type: 'offer_pitch',
    title: '🎁 A Revelação da Oferta & Pitch (Ponto de Delay)',
    category: 'offer',
    description: 'O momento exato em que o produto é apresentado pelo nome e o botão de compra surge na tela.',
    goldenRules: [
      'Este é o PONTO DE DELAY oficial: configure o player para liberar o botão de compra neste segundo.',
      'Apresente o nome com entusiasmo e autoridade.'
    ],
    defaultBulletPoints: [
      'Apresentação oficial do produto',
      'Para quem é o treinamento/software',
      'Acesso imediato e formato de entrega'
    ],
    badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
  },
  bonus_stack: {
    type: 'bonus_stack',
    title: '🧱 Empilhamento de Bônus de Ação Rápida',
    category: 'offer',
    description: 'Bônus irresistíveis com precificação individual ancorada que eliminam as próximas barreiras do lead.',
    goldenRules: [
      'Cada bônus deve resolver a próxima dor que surgirá após ele comprar o produto principal.',
      'Atribua um preço real a cada bônus (ex: Bônus 1: R$ 497, Bônus 2: R$ 297).'
    ],
    defaultBulletPoints: [
      'Bônus 1: Acelerador de Implementação',
      'Bônus 2: Comunidade VIP / Suporte Direto',
      'Bônus 3: Templates e Scripts Prontos'
    ],
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
  },
  objection_crusher: {
    type: 'objection_crusher',
    title: '💥 Quebra Cirúrgica de Objeções (Objection Crushing)',
    category: 'close',
    description: 'Destruição das 4 maiores travas silenciosas da mente do comprador antes de passar o cartão.',
    goldenRules: [
      'Fale diretamente: "Você pode estar pensando agora: e se eu não tiver tempo?"',
      'Quebre: Tempo, Dinheiro/Limite, Nicho específico e Medo de não ter suporte.'
    ],
    defaultBulletPoints: [
      'Quebra da Objeção 1: "Não tenho tempo"',
      'Quebra da Objeção 2: "E se não funcionar para o meu caso?"',
      'Quebra da Objeção 3: "Não tenho dinheiro / Não tenho limite"'
    ],
    badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
  },
  price_anchor: {
    type: 'price_anchor',
    title: '💰 Ancoragem de Preço & Revelação da Condição Especial',
    category: 'close',
    description: 'Contraste entre o valor total empilhado (R$ 3.000+) e a oportunidade única de hoje.',
    goldenRules: [
      'Soma de tudo o que ele está levando.',
      'Contraste: "Se eu cobrasse R$ 1.500 ainda seria justo, mas hoje você não pagará nem perto disso."'
    ],
    defaultBulletPoints: [
      'Soma do valor real de mercado de tudo',
      'A revelação do preço promocional exclusivo (à vista e 12x no cartão/Pix)'
    ],
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
  },
  guarantee_dual: {
    type: 'guarantee_dual',
    title: '🛡️ Garantia Blindada (Incondicional + Condicional)',
    category: 'close',
    description: 'Remoção de 100% do risco das costas do cliente e colocação nas nossas costas.',
    goldenRules: [
      'Garantia de 7/15/30 dias incondicional sem perguntas.',
      'Opção de garantia condicional de resultado (se aplicar e não tiver resultado, devolvo + R$ 100).'
    ],
    defaultBulletPoints: [
      'Explicação clara da garantia de 7 dias com devolução em 1 clique',
      'Compromisso pessoal de satisfação garantida'
    ],
    badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30'
  },
  urgency_cta: {
    type: 'urgency_cta',
    title: '🚨 Escassez, Urgência & Chamada para Ação Final (CTA)',
    category: 'close',
    description: 'O fechamento do vídeo dando as duas escolhas finais: continuar onde está ou dar o passo hoje.',
    goldenRules: [
      'Crie a encruzilhada das 2 opções (Caminho A: continuar sofrendo; Caminho B: resolver agora).',
      'Instrua o clique exato no botão que apareceu abaixo do vídeo.'
    ],
    defaultBulletPoints: [
      'As duas opções que restam ao lead',
      'Instrução de clique no botão abaixo para garantir o desconto antes que a página saia do ar'
    ],
    badgeColor: 'bg-red-500/10 text-red-300 border-red-500/30'
  }
};

// ── 📄 TEMPLATE PADRÃO DE VSL DE ALTA CONVERSÃO ───────────────────────────────

export const DEFAULT_VSL_BLOCKS: VSLScriptBlock[] = [
  {
    id: 'vsl-1',
    type: 'hook_a',
    title: '🪝 Gancho A: Abertura Disruptiva (0-30s)',
    scriptText: 'Se você está cansado de gastar dinheiro com anúncios e ver os seus leads sumirem sem fechar vendas no WhatsApp, preste muita atenção neste vídeo de apenas 8 minutos. Porque o que você vai ver aqui não é mais um cursinho teórico, mas o mecanismo exato que destravou mais de R$ 500 mil em vendas automáticas para nós no último mês.',
    bulletPoints: ['Choque inicial', 'Quebra de ceticismo', 'Promessa de brevidade (8 minutos)'],
    wordCount: 72,
    targetDurationSeconds: 30
  },
  {
    id: 'vsl-2',
    type: 'lead_empathy',
    title: '🎯 Lead de Empatia & Validação da Dor',
    scriptText: 'Eu sei exatamente o que você sente. Você acorda de manhã, abre o gerenciador de anúncios, vê o saldo sendo consumido, mas quando olha o seu WhatsApp... ou não tem mensagens, ou as pessoas que chamam só dizem "está caro" e somem. A verdade é que a culpa não é sua. O mercado tradicional te ensinou a vender do jeito errado.',
    bulletPoints: ['Espelho do cotidiano do cliente', 'Retirada da culpa pessoal'],
    wordCount: 68,
    targetDurationSeconds: 30
  },
  {
    id: 'vsl-3',
    type: 'unique_mechanism',
    title: '⚙️ O Novo Mecanismo Único',
    scriptText: 'Existe um motivo pelo qual as grandes operações digitais fecham 3x mais vendas gastando menos em tráfego: elas usam o Mecanismo de Conversão Consultiva com Gatilhos Humanizados. Em vez de empurrar o cliente para um checkout frio, nós guiamos o lead por uma jornada de micro-compromissos com áudios humanizados e quebras cirúrgicas de objeção em menos de 5 minutos.',
    bulletPoints: ['Apresentação do mecanismo proprietário', 'Contraste com checkout tradicional frio'],
    wordCount: 65,
    targetDurationSeconds: 30
  },
  {
    id: 'vsl-4',
    type: 'offer_pitch',
    title: '🎁 A Revelação da Oferta (Ponto de Pitch / Delay)',
    scriptText: 'E é exatamente por isso que nós criamos o Método Escala X1. Um sistema completo, com playbooks validados, scripts de quebra de preço, robôs de recuperação e templates prontos para você copiar e colar na sua operação ainda hoje. E para você dar esse passo agora, liberamos um botão exclusivo aqui embaixo deste vídeo.',
    bulletPoints: ['Apresentação do Método', 'Liberação do botão de compra'],
    isPitchPoint: true,
    wordCount: 62,
    targetDurationSeconds: 25
  },
  {
    id: 'vsl-5',
    type: 'bonus_stack',
    title: '🧱 Empilhamento de Bônus Exclusivos',
    scriptText: 'Ao garantir o seu acesso agora, você também leva gratuitamente: Bônus 1: O Pack de Áudios Gravados de Alta Conversão (avaliado em R$ 297, hoje GRÁTIS); Bônus 2: A Planilha de Gestão de Closers e Roleta de Leads (avaliada em R$ 197, hoje GRÁTIS); e Bônus 3: Acesso à Comunidade VIP de Networking.',
    bulletPoints: ['Bônus 1: Áudios Gravados', 'Bônus 2: Planilha de Roleta', 'Bônus 3: Comunidade'],
    wordCount: 64,
    targetDurationSeconds: 30
  },
  {
    id: 'vsl-6',
    type: 'objection_crusher',
    title: '💥 Quebra Cirúrgica de Objeções',
    scriptText: 'Agora você pode estar pensando: "Mas eu não tenho tempo para implementar isso". A boa notícia é que o método foi desenhado para ser colocado no ar em menos de 45 minutos. Se você tem 15 minutos por dia, você já consegue aplicar. E se você acha que não tem limite no cartão, nós parcelamos em até 12 vezes ou no Pix imediato com desconto.',
    bulletPoints: ['Quebra de Tempo (45 min)', 'Quebra de Dinheiro (12x ou Pix com desconto)'],
    wordCount: 71,
    targetDurationSeconds: 30
  },
  {
    id: 'vsl-7',
    type: 'price_anchor',
    title: '💰 Ancoragem de Preço & Condição Especial',
    scriptText: 'Se você fosse contratar uma consultoria individual para montar toda essa esteira, você pagaria facilmente mais de R$ 3.000. Mas hoje, através desta página e nesta condição especial de lançamento, você terá acesso completo a todo o método e todos os bônus por apenas 12x de R$ 29,70 ou R$ 297 à vista.',
    bulletPoints: ['Contraste de R$ 3.000 para 12x de R$ 29,70'],
    wordCount: 57,
    targetDurationSeconds: 25
  },
  {
    id: 'vsl-8',
    type: 'guarantee_dual',
    title: '🛡️ Garantia Blindada de 7 Dias',
    scriptText: 'E você não corre risco nenhum. Você entra, acessa as aulas, baixa todos os templates e testa por 7 dias. Se por qualquer motivo você achar que não valeu a pena, basta mandar uma única mensagem no suporte que nós devolvemos 100% do seu dinheiro, centavo por centavo, sem perguntas.',
    bulletPoints: ['7 dias incondicionais de garantia total'],
    wordCount: 56,
    targetDurationSeconds: 25
  },
  {
    id: 'vsl-9',
    type: 'urgency_cta',
    title: '🚨 Escassez & Chamada para Ação Final',
    scriptText: 'A decisão agora está nas suas mãos. Você tem dois caminhos: o primeiro é fechar este vídeo e continuar dependendo da sorte. O segundo é clicar no botão abaixo agora mesmo, garantir o seu acesso com desconto e começar a transformar o seu WhatsApp em uma máquina de vendas ainda hoje. Clique no botão abaixo e te vejo lá dentro!',
    bulletPoints: ['Encruzilhada das 2 opções', 'Chamada final para o clique no botão'],
    wordCount: 69,
    targetDurationSeconds: 30
  }
];

// ── 📄 SEÇÕES E TEMPLATES PADRÃO DE PÁGINA DE VENDAS (11 DOBRAS) ─────────────

export const DEFAULT_SALES_PAGE_SECTIONS: PageQuizSection[] = [
  {
    id: 'sec-1',
    type: 'hero_vsl',
    layoutColumns: '1_col_center',
    title: 'Dobra 1: Hero Section com VSL & Promessa Principal',
    badge: '🔥 Dobra Principal (Above the Fold)',
    headline: 'Descubra Como Multiplicar as Vendas do Seu Negócio Digital no WhatsApp em Menos de 14 Dias',
    subtitle: 'Assista ao vídeo abaixo para entender o método passo a passo que está gerando mais de R$ 45.000 por mês no 1 a 1.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoDelaySeconds: 180,
    buttonText: 'QUERO DESBLOQUEAR MEU ACESSO AGORA',
    buttonLink: '#pricing'
  },
  {
    id: 'sec-2',
    type: 'pain_mirror',
    layoutColumns: '2_col_split',
    title: 'Dobra 2: Espelho da Dor & Para Quem É / Não É',
    headline: 'Você se identifica com alguma dessas situações diárias?',
    subtitle: 'Se você sente que o seu esforço não se traduz em vendas, o problema não é você.',
    bullets: [
      'Leads chamam no WhatsApp mas dizem que "está caro" e somem.',
      'Você investe em tráfego pago mas não recupera carrinhos abandonados.',
      'Falta um processo padronizado para os atendentes fecharem vendas todos os dias.',
      'Você depende 100% da sua presença para a operação faturar.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80',
    badge: '🎯 Filtro de Qualificação'
  },
  {
    id: 'sec-3',
    type: 'authority_bio',
    layoutColumns: '2_col_reverse',
    title: 'Dobra 3: Apresentação do Especialista & Autoridade',
    headline: 'Quem será o seu mentor nessa jornada?',
    bodyText: 'Com mais de 7 anos de experiência em Direct Response e mais de R$ 12 milhões faturados em infoprodutos e mentorias high-ticket, nós sintetizamos tudo o que realmente funciona em um playbook prático e sem enrolação.',
    bullets: [
      '+ R$ 12 Milhões faturados no digital',
      '+ 4.500 alunos formados no Brasil e exterior',
      'Método validado em mais de 35 nichos diferentes'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'sec-4',
    type: 'module_grid',
    layoutColumns: '3_col_grid',
    title: 'Dobra 4: Grade de Entregáveis & Módulos',
    headline: 'O que você vai receber acesso imediato:',
    subtitle: 'Um arsenal completo e pronto para implementação no seu negócio:',
    gridCards: [
      { id: 'm-1', title: 'Módulo 1: Máquina de Atração', description: 'Como gerar fluxo diário de leads altamente qualificados com baixo CPA.', badge: 'Fase 1' },
      { id: 'm-2', title: 'Módulo 2: Fechamento 1 a 1', description: 'Scripts de áudios gravados e condução de conversa com gatilhos de urgência.', badge: 'Fase 2' },
      { id: 'm-3', title: 'Módulo 3: Quebra de 12 Objeções', description: 'Como contornar "tá caro", "vou falar com meu sócio" e "não tenho tempo".', badge: 'Fase 3' },
      { id: 'm-4', title: 'Módulo 4: Recuperador Automático', description: 'Esteira de recuperação ativa de Pix, boleto e cartão recusado em 10 minutos.', badge: 'Fase 4' },
      { id: 'm-5', title: 'Módulo 5: Roleta & Gestão de Closers', description: 'Distribuição equitativa de leads e metas para equipe comercial.', badge: 'Fase 5' },
      { id: 'm-6', title: 'Módulo 6: Escala High-Ticket', description: 'Como transicionar produtos de R$ 297 para mentorias de R$ 3.000 a R$ 10.000.', badge: 'Fase 6' }
    ],
    badge: '📦 Conteúdo Completo'
  },
  {
    id: 'sec-5',
    type: 'social_proof_wall',
    layoutColumns: '3_col_grid',
    title: 'Dobra 5: Muro de Provas Sociais & Depoimentos Reais',
    headline: 'Veja os resultados de quem já aplicou o método:',
    subtitle: 'Pessoas reais em diferentes nichos que transformaram suas operações:',
    testimonials: [
      {
        id: 't-1',
        name: 'Carlos Mendes',
        role: 'Produtor Digital',
        quote: 'Em apenas 3 dias aplicando o script de áudio humanizado, recuperamos 18 Pix pendentes. Pagou o treinamento 10 vezes.',
        rating: 5
      },
      {
        id: 't-2',
        name: 'Fernanda Rocha',
        role: 'Mentora High-Ticket',
        quote: 'A clareza do método é impressionante. Nossa taxa de conversão no WhatsApp subiu de 8% para 24% na primeira semana.',
        rating: 5
      },
      {
        id: 't-3',
        name: 'Lucas Antunes',
        role: 'Gestor de Tráfego & Coprodutor',
        quote: 'Nunca vi nada tão direto ao ponto. O playbook de quebra de objeções virou a bíblia dos nossos atendentes.',
        rating: 5
      }
    ]
  },
  {
    id: 'sec-6',
    type: 'pricing_box',
    layoutColumns: '1_col_center',
    title: 'Dobra 6: Box da Oferta Irresistível & Preço',
    headline: 'Garanta a Sua Vaga com Condição Especial de Lançamento',
    subtitle: 'Acesso vitalício, atualizações inclusas e garantia total de 7 dias.',
    pricingData: {
      regularPrice: 997,
      offerPrice: 297,
      installments: '12x de R$ 29,70',
      checkoutUrl: 'https://pay.exemplo.com/checkout',
      guaranteeDays: 7,
      bonusList: [
        'Acesso Vitalício à Plataforma e Aulas',
        'Pack de Áudios Gravados de Alta Conversão (Valor: R$ 297)',
        'Planilha de Gestão e Roleta de Leads (Valor: R$ 197)',
        'Acesso à Comunidade VIP de Networking'
      ]
    }
  },
  {
    id: 'sec-7',
    type: 'guarantee_seal',
    layoutColumns: '1_col_center',
    title: 'Dobra 7: Garantia Blindada de 7 Dias',
    headline: 'Garantia Incondicional de 100% de Satisfação',
    bodyText: 'Você tem 7 dias completos para testar o método. Se por qualquer motivo você achar que não é para você, basta nos enviar um e-mail ou chamar no WhatsApp que devolveremos todo o seu investimento imediatamente.',
    badge: '🛡️ Risco Zero'
  },
  {
    id: 'sec-8',
    type: 'faq_accordion',
    layoutColumns: '1_col_center',
    title: 'Dobra 8: FAQ - Perguntas Frequentes & Quebra de Dúvidas',
    headline: 'Ainda tem dúvidas? Veja as respostas mais comuns:',
    faqItems: [
      {
        id: 'faq-1',
        question: 'Como recebo o acesso ao treinamento?',
        answer: 'Imediatamente após a confirmação do pagamento, você receberá seus dados de acesso exclusivos por e-mail e WhatsApp.'
      },
      {
        id: 'faq-2',
        question: 'Preciso ter experiência prévia com vendas?',
        answer: 'Não! O método foi estruturado do absoluto zero até as técnicas mais avançadas de fechamento consultivo.'
      },
      {
        id: 'faq-3',
        question: 'Por quanto tempo terei acesso ao conteúdo?',
        answer: 'O seu acesso é vitalício, incluindo todas as futuras atualizações dos playbooks e scripts.'
      }
    ]
  }
];

// ── 🧠 TEMPLATE PADRÃO DE QUIZ INTERATIVO COM DIAGNÓSTICO ─────────────────────

export const DEFAULT_QUIZ_SECTIONS: PageQuizSection[] = [
  {
    id: 'q-1',
    type: 'quiz_question',
    title: 'Passo 1: Pergunta de Micro-Compromisso',
    headline: 'Qual é o principal desafio do seu negócio digital hoje?',
    subtitle: 'Selecione a opção que melhor descreve seu momento atual:',
    quizQuestion: {
      questionType: 'single_choice',
      options: [
        { id: 'opt-1', label: 'Não consigo atrair pessoas qualificadas para o meu WhatsApp', score: 10 },
        { id: 'opt-2', label: 'Os leads chegam mas acham caro e não fecham a compra', score: 20 },
        { id: 'opt-3', label: 'Perco muitas vendas em boletos e Pix não pagos no checkout', score: 30 },
        { id: 'opt-4', label: 'Quero criar uma esteira de produtos de alto valor (High-Ticket)', score: 40 }
      ]
    }
  },
  {
    id: 'q-2',
    type: 'quiz_question',
    title: 'Passo 2: Qualificação de Faturamento & Escala',
    headline: 'Quanto seu negócio fatura atualmente por mês?',
    subtitle: 'Essa informação nos ajuda a calibrar a estratégia ideal para você:',
    quizQuestion: {
      questionType: 'single_choice',
      options: [
        { id: 'rev-1', label: 'Estou começando agora (R$ 0 a R$ 5.000 / mês)', score: 10 },
        { id: 'rev-2', label: 'Entre R$ 5.000 e R$ 20.000 / mês', score: 25 },
        { id: 'rev-3', label: 'Entre R$ 20.000 e R$ 50.000 / mês', score: 50 },
        { id: 'rev-4', label: 'Mais de R$ 50.000 / mês (Quero escalar equipe)', score: 100 }
      ]
    }
  },
  {
    id: 'q-3',
    type: 'hero_vsl',
    title: 'Passo 3: Mini-VSL de Quebra de Padrão & Explicação',
    headline: 'Veja esta explicação rápida de 60 segundos antes de vermos o seu resultado:',
    subtitle: 'Entenda por que a maioria dos empreendedores comete esse erro clássico:',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    bodyText: 'Assista a este vídeo curto para desbloquear a sua análise personalizada.',
    buttonText: 'CONTINUAR PARA O DIAGNÓSTICO ➔'
  },
  {
    id: 'q-4',
    type: 'quiz_diagnostic_loading',
    title: 'Passo 4: Tela de Carregamento & Análise Psicológica',
    headline: 'Analisando o seu perfil de vendas...',
    subtitle: 'Nossa inteligência está cruzando suas respostas com as melhores práticas de conversão.',
    bodyText: 'Calculando taxa de recuperação potencial... Ajustando recomendação personalizada...'
  },
  {
    id: 'q-5',
    type: 'quiz_result_pitch',
    title: 'Passo 5: Revelação do Resultado & Oferta Personalizada',
    headline: 'Seu Diagnóstico Está Pronto: Perfil de Alto Potencial de Escala',
    subtitle: 'Com base nas suas respostas, você tem um potencial imediato de aumentar em até 3.2x suas vendas.',
    pricingData: {
      regularPrice: 997,
      offerPrice: 297,
      installments: '12x de R$ 29,70',
      checkoutUrl: 'https://pay.exemplo.com/checkout',
      guaranteeDays: 7,
      bonusList: [
        'Diagnóstico de Escala Personalizado',
        'Roteiro de Fechamento no WhatsApp 1 a 1',
        'Pack de Scripts de Recuperação de Pix'
      ]
    }
  }
];
