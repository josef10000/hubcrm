import {
  LayoutDashboard,
  DollarSign,
  Target,
  Rocket,
  Settings,
  Package,
  Calendar,
  MessageCircle,
  Globe,
  LayoutTemplate,
  CreditCard,
  Shield,
  BarChart3,
  BookOpen,
  Bell,
  Zap,
  LayoutGrid,
  FlaskConical,
  GitFork,
  Tv,
  Bot,
  Cpu,
  FolderGit2,
  FolderKanban
} from 'lucide-react';

export const navGroups = [
  {
    id: 'command',
    label: 'Central de Comando',
    icon: Globe,
    items: [
      { icon: LayoutDashboard, label: 'Visão Executiva (Hub Central)', path: '/' },
      { icon: Tv, label: 'Sala de Comando (3 Telas)', path: '/screens' },
      { icon: FolderKanban, label: 'Hub Office', path: '/workspace' },
      { icon: Calendar, label: 'Agenda & Prazos', path: '/calendar' }
    ]
  },
  {
    id: 'agents',
    label: 'Squad de IA',
    icon: Bot,
    items: [
      { icon: Bot, label: 'Davinci & Especialistas', path: '/chat?mode=davinci' },
      { icon: MessageCircle, label: 'Central de Mensagens', path: '/chat' },
      { icon: Cpu, label: 'Automações & Uptime', path: '/monitoring' }
    ]
  },
  {
    id: 'labs',
    label: 'Laboratórios',
    icon: FlaskConical,
    items: [
      { icon: FlaskConical, label: 'Laboratório de Ofertas', path: '/offers' },
      { icon: GitFork, label: 'Arquiteto de Funis', path: '/funnels' },
      { icon: LayoutGrid, label: 'HubAds & Criativos', path: '/hub-ads' },
      { icon: Rocket, label: 'Galeria de Crescimento', path: '/growth-hub' },
      { icon: FolderGit2, label: 'Projetos & Sites', path: '/projects' }
    ]
  },
  {
    id: 'business',
    label: 'Clientes & Ofertas',
    icon: Target,
    items: [
      { icon: Package, label: 'Catálogo de Produtos', path: '/products' },
      { icon: Target, label: 'Perfis de ICP', path: '/icp' },
      { icon: Rocket, label: 'Onboarding de Clientes', path: '/onboarding-hub' },
      { icon: MessageCircle, label: 'Suporte & Tickets', path: '/support' },
      { icon: Zap, label: 'Programa de Indicações', path: '/referrals' }
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
      { icon: BarChart3, label: 'Analytics de Vendas', path: '/analytics', permission: 'VIEW_REPORTS' }
    ]
  },
  {
    id: 'knowledge_system',
    label: 'Segundo Cérebro',
    icon: BookOpen,
    items: [
      { icon: BookOpen, label: 'Wiki & Memória', path: '/wiki' },
      { icon: LayoutTemplate, label: 'Hub Canvas', path: '/canvas' },
      { icon: Bell, label: 'Notificações', path: '/notifications' },
      { icon: Settings, label: 'Configurações', path: '/settings' }
    ]
  }
];
