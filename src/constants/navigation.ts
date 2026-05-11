import { 
  LayoutDashboard, Users, DollarSign, Target, Rocket, HeartHandshake, Settings, 
  Package, Megaphone, Calendar, MessageCircle, Globe, LayoutTemplate, Map as MapIcon, 
  Layout, CreditCard, Shield, BarChart3, BookOpen, Bell, ShieldCheck, Zap
} from 'lucide-react';

export const navGroups = [
  {
    id: 'personal',
    label: 'Meu Espaço',
    icon: Rocket, // Usando Rocket como placeholder elegante
    items: [
      { icon: LayoutTemplate, label: 'Meu Workspace', path: '/workspace' },
    ]
  },
  {
    id: 'commercial',
    label: 'Comercial & Crescimento',
    icon: Target,
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Package, label: 'Produtos', path: '/products' },
      { icon: Users, label: 'Hub Rewards', path: '/referrals' },
      { icon: Megaphone, label: 'Marketing', path: '/marketing', permission: 'MANAGE_SETTINGS' },
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
      { icon: Layout, label: 'Projetos / Produção', path: '/projects', permission: 'MANAGE_CLIENTS' },
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
      { icon: Zap, label: 'Novidades do Hub', path: '/release-notes' },
      { icon: ShieldCheck, label: 'Auditoria & Compliance', path: '/compliance', permission: 'MANAGE_SETTINGS' },
      { icon: ShieldCheck, label: 'Administrativo', path: '/admin', permission: 'MANAGE_SETTINGS' },
      { icon: Settings, label: 'Configurações', path: '/settings' },
    ]
  }
];
