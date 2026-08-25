import { 
  LayoutDashboard, Users, DollarSign, Target, Rocket, HeartHandshake, Settings, 
  Package, Megaphone, Calendar, MessageCircle, Globe, LayoutTemplate, Map as MapIcon, 
  Layout, CreditCard, Shield, BarChart3, BookOpen, Bell, ShieldCheck, Zap, LayoutGrid, FlaskConical, GitFork
} from 'lucide-react';

export const navGroups = [
  {
    id: 'personal',
    label: 'Meu Espaço',
    icon: Rocket, // Usando Rocket como placeholder elegante
    items: [
      { icon: LayoutTemplate, label: 'Meu Workspace', path: '/workspace' },
      { icon: Zap, label: 'Hub Arena', path: '/arena' },
      { icon: Package, label: 'HubShop', path: '/shop' },
    ]
  },
  {
    id: 'commercial',
    label: 'Comercial & Crescimento',
    icon: Target,
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Package, label: 'Produtos', path: '/products' },
      { icon: Target, label: 'Perfis ICP', path: '/icp' },
      { icon: FlaskConical, label: 'Laboratório de Ofertas', path: '/offers' },
      { icon: GitFork, label: 'Funis & Orquestração', path: '/funnels' },
      { icon: Users, label: 'Hub Rewards', path: '/referrals' },
      { icon: Rocket, label: 'Hub de Crescimento', path: '/growth-hub', permission: 'MANAGE_CLIENTS' },
    ]
  },
  {
    id: 'operation',
    label: 'Operação & Sucesso',
    icon: Rocket,
    items: [
      { icon: Calendar, label: 'Agenda Central', path: '/calendar', permission: 'VIEW_DASHBOARD' },
      { icon: MessageCircle, label: 'Meus Chamados', path: '/support' },
      { icon: MessageCircle, label: 'Hub Chat', path: '/chat' },
      { icon: Rocket, label: 'Onboarding Hub', path: '/onboarding-hub', permission: 'MANAGE_CLIENTS' },
      { icon: Globe, label: 'Monitoramento', path: '/monitoring', permission: 'MANAGE_SUPPORT' },
      { icon: LayoutTemplate, label: 'Hub Canvas', path: '/canvas', permission: 'MANAGE_TEAM' },
      { icon: MapIcon, label: 'Mapa', path: '/map' },
      { icon: LayoutTemplate, label: 'Fábrica de Sites & Projetos', path: '/projects', permission: 'MANAGE_CLIENTS' },
    ]
  },
  {
    id: 'finance',
    label: 'Financeiro & RevOps',
    icon: DollarSign,
    items: [
      { icon: CreditCard, label: 'Cobrança', path: '/billing', permission: 'MANAGE_FINANCE' },
      { icon: DollarSign, label: 'Financeiro Estratégico', path: '/finance', permission: 'MANAGE_FINANCE' },
      { icon: Shield, label: 'Contratos', path: '/contracts', permission: 'MANAGE_FINANCE' },
      { icon: BarChart3, label: 'Analytics', path: '/analytics', permission: 'VIEW_REPORTS' },
    ]
  },
  {
    id: 'hubads',
    label: 'HubAds',
    icon: Megaphone,
    items: [
      { icon: LayoutGrid, label: 'Criativos', path: '/hub-ads' },
    ]
  },
  {
    id: 'people',
    label: 'Pessoas & Cultura',
    icon: HeartHandshake,
    items: [
      { icon: HeartHandshake, label: 'People & Feedback', path: '/people', permission: 'MANAGE_TEAM' },
      { icon: Users, label: 'Equipe', path: '/team', permission: 'MANAGE_TEAM' },
      { icon: BookOpen, label: 'Wiki Hub', path: '/wiki' },
    ]
  },
  {
    id: 'system',
    label: 'Sistema',
    icon: Settings,
    items: [
      { icon: Bell, label: 'Notificações', path: '/notifications' },
      { icon: ShieldCheck, label: 'Auditoria & Compliance', path: '/compliance', permission: 'MANAGE_SETTINGS' },
      { icon: ShieldCheck, label: 'Administrativo', path: '/admin', permission: 'MANAGE_SETTINGS' },
      { icon: Settings, label: 'Configurações', path: '/settings' },
    ]
  }
];
