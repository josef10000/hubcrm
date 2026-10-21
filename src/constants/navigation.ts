import { 
  LayoutDashboard, Users, DollarSign, Target, Rocket, Settings, 
  Package, Megaphone, Calendar, MessageCircle, Globe, LayoutTemplate, 
  CreditCard, Shield, BarChart3, BookOpen, Bell, ShieldCheck, Zap, 
  LayoutGrid, FlaskConical, GitFork, Tv, Bot, Cpu, FolderGit2
} from 'lucide-react';

export const navGroups = [
  {
    id: 'command',
    label: 'Central de Comando',
    icon: Tv,
    items: [
      { icon: LayoutDashboard, label: 'Visão Executiva (Hub Central)', path: '/' },
      { icon: Tv, label: 'Sala de Comando (3 Monitores)', path: '/screens' },
      { icon: MessageCircle, label: 'Chat Central & Davinci', path: '/chat' },
      { icon: LayoutTemplate, label: 'Hub Canvas', path: '/canvas' },
    ]
  },
  {
    id: 'agents',
    label: 'Agentes & IA',
    icon: Bot,
    items: [
      { icon: Bot, label: 'Davinci & Especialistas', path: '/chat?mode=davinci' },
      { icon: Cpu, label: 'Automações & VPS', path: '/monitoring' },
    ]
  },
  {
    id: 'labs',
    label: 'Laboratórios & Criação',
    icon: FlaskConical,
    items: [
      { icon: FlaskConical, label: 'Laboratório de Ofertas', path: '/offers' },
      { icon: GitFork, label: 'Funis & Orquestração', path: '/funnels' },
      { icon: LayoutGrid, label: 'HubAds & Criativos', path: '/hub-ads' },
      { icon: Rocket, label: 'Biblioteca de Crescimento', path: '/growth-hub' },
      { icon: FolderGit2, label: 'Projetos & Engenharia', path: '/projects' },
    ]
  },
  {
    id: 'business',
    label: 'Negócio & Clientes',
    icon: Target,
    items: [
      { icon: Package, label: 'Catálogo de Produtos', path: '/products' },
      { icon: Target, label: 'Perfis de ICP', path: '/icp' },
      { icon: Users, label: 'Gestão de Clientes', path: '/workspace' },
      { icon: Rocket, label: 'Onboarding de Clientes', path: '/onboarding-hub' },
      { icon: MessageCircle, label: 'Suporte & Tickets', path: '/support' },
      { icon: Calendar, label: 'Agenda & Prazos', path: '/calendar' },
    ]
  },
  {
    id: 'finance',
    label: 'Financeiro & RevOps',
    icon: DollarSign,
    items: [
      { icon: DollarSign, label: 'Financeiro Estratégico', path: '/finance', permission: 'MANAGE_FINANCE' },
      { icon: CreditCard, label: 'Cobrança & Asaas', path: '/billing', permission: 'MANAGE_FINANCE' },
      { icon: Shield, label: 'Contratos Digitais', path: '/contracts', permission: 'MANAGE_FINANCE' },
      { icon: BarChart3, label: 'Analytics de Vendas', path: '/analytics', permission: 'VIEW_REPORTS' },
    ]
  },
  {
    id: 'knowledge_system',
    label: 'Conhecimento & Sistema',
    icon: Settings,
    items: [
      { icon: BookOpen, label: 'Wiki & Memória', path: '/wiki' },
      { icon: Bell, label: 'Notificações', path: '/notifications' },
      { icon: ShieldCheck, label: 'Auditoria & Logs', path: '/compliance', permission: 'MANAGE_SETTINGS' },
      { icon: Settings, label: 'Configurações', path: '/settings' },
    ]
  },
  {
    id: 'archive',
    label: 'Módulos Secundários',
    icon: Zap,
    items: [
      { icon: Zap, label: 'Hub Arena', path: '/arena' },
      { icon: Package, label: 'HubShop', path: '/shop' },
      { icon: Users, label: 'Hub Rewards', path: '/referrals' },
      { icon: Globe, label: 'Mapa Antigo', path: '/map' },
      { icon: Users, label: 'Equipe Legado', path: '/team', permission: 'MANAGE_TEAM' },
      { icon: Users, label: 'People RH Legado', path: '/people', permission: 'MANAGE_TEAM' },
    ]
  }
];
