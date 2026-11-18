import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@auth/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { useClients } from '@/hooks/queries/useClients';
import { usePermissions } from '@auth/hooks/usePermissions';
import { AppPermission } from '@/constants/permissions';
import {
  Search,
  LayoutDashboard,
  MessageSquare,
  LifeBuoy,
  Calendar,
  Users,
  LineChart,
  DollarSign,
  Compass,
  Package,
  ShieldAlert,
  Bell,
  Settings,
  User,
  BookOpen,
  FolderGit2,
  Map,
  CreditCard,
  ClipboardList,
  UserCheck,
  Target,
  Sparkles,
  Gamepad2,
  ShoppingBag,
  LayoutTemplate,
  Info,
  FlaskConical,
  GitFork,
  Tv,
  LayoutGrid,
  Rocket,
  Bot
} from 'lucide-react';

interface CommandItem {
  id: string;
  name: string;
  description: string;
  path?: string;
  onSelect?: () => void;
  shortcut: string;
  icon: React.ComponentType<any>;
  permission?: AppPermission;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const { themeColor, setIsModalOpen } = useUI();
  const { setEditingClient } = useCRM();
  const { data: clients = [] } = useClients();
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  const openPalette = (initialSearch = '') => {
    setIsOpen(true);
    setSearch(initialSearch);
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Lista de destinos completa e detalhada baseada nas rotas internas
  const allDestinations: CommandItem[] = useMemo(() => [
    { id: 'cmd-home', name: 'Visão Executiva (Hub Central)', description: 'Central de comando executiva em tempo real', path: '/', shortcut: 'hc', icon: LayoutDashboard },
    { id: 'cmd-screens', name: 'Sala de Comando (3 Monitores)', description: 'Visualização dedicada em tempo real para 3 telas / TVs', path: '/screens', shortcut: 'sc', icon: Tv },
    { id: 'cmd-davinci', name: 'Davinci & Agentes de IA', description: 'Orquestrador de IA e especialistas do negócio', path: '/chat?mode=davinci', shortcut: 'ia', icon: Bot },
    { id: 'cmd-offers', name: 'Laboratório de Ofertas', description: 'Criação, modelagem e validação de ofertas', path: '/offers', shortcut: 'of', icon: FlaskConical },
    { id: 'cmd-funnels', name: 'Arquiteto de Funis', description: 'Orquestração de funis, páginas VSL e quizzes', path: '/funnels', shortcut: 'fu', icon: GitFork },
    { id: 'cmd-hubads', name: 'Criativos & HubAds', description: 'Gestão de criativos, tracking e performance de tráfego', path: '/hub-ads', shortcut: 'ad', icon: LayoutGrid },
    { id: 'cmd-growth', name: 'Galeria & Biblioteca de Crescimento', description: 'Ativos de sucesso, dicas e insights', path: '/growth-hub', shortcut: 'gh', icon: Rocket, permission: 'MANAGE_CLIENTS' },
    { id: 'cmd-icp', name: 'Perfis de ICP', description: 'Mapeamento estratégico de cliente ideal', path: '/icp', shortcut: 'ic', icon: Target },
    { id: 'cmd-chat', name: 'Chat Central', description: 'Comunicação interna do time e mensagens de voz', path: '/chat', shortcut: 'ch', icon: MessageSquare },
    { id: 'cmd-support', name: 'Suporte & Tickets', description: 'Central de chamados, tickets abertos e SLA', path: '/support', shortcut: 'su', icon: LifeBuoy },
    { id: 'cmd-notifications', name: 'Notificações', description: 'Alertas de sistema, aniversário e atualizações', path: '/notifications', shortcut: 'no', icon: Bell },
    { id: 'cmd-calendar', name: 'Calendário', description: 'Agenda de reuniões, prazos e compromissos', path: '/calendar', shortcut: 'ca', icon: Calendar },
    { id: 'cmd-referrals', name: 'Indicações', description: 'Programa de Indicações "Indique e Ganhe"', path: '/referrals', shortcut: 're', icon: Compass },
    { id: 'cmd-products', name: 'Catálogo de Produtos', description: 'Gestão de produtos, planos e ofertas ativas', path: '/products', shortcut: 'pr', icon: Package },
    { id: 'cmd-monitoring', name: 'Automações & Monitoramento Uptime', description: 'Monitoramento nativo de servidores e sites', path: '/monitoring', shortcut: 'mo', icon: ShieldAlert },
    { id: 'cmd-map', name: 'Mapa de Clientes', description: 'Distribuição geográfica e localização de clientes', path: '/map', shortcut: 'ma', icon: Map },
    { id: 'cmd-billing', name: 'Cobrança & Asaas', description: 'Integrações financeiras, faturas Asaas e extrato', path: '/billing', shortcut: 'fa', icon: CreditCard, permission: 'MANAGE_FINANCE' },
    { id: 'cmd-onboarding', name: 'Onboarding Hub', description: 'Gerenciador de formulários e recepção de clientes', path: '/onboarding-hub', shortcut: 'on', icon: ClipboardList },
    { id: 'cmd-contracts', name: 'Contratos Digitais', description: 'Modelos de contratos ativos e assinaturas digitais', path: '/contracts', shortcut: 'co', icon: UserCheck, permission: 'MANAGE_FINANCE' },
    { id: 'cmd-projects', name: 'Projetos & Engenharia', description: 'Acompanhamento de projetos e templates personalizados', path: '/projects', shortcut: 'pj', icon: LayoutTemplate },
    { id: 'cmd-analytics', name: 'Analytics de Vendas', description: 'Métricas de conversão e relatórios avançados', path: '/analytics', shortcut: 'an', icon: LineChart, permission: 'VIEW_REPORTS' },
    { id: 'cmd-finance', name: 'Financeiro Estratégico', description: 'Snapshot diário de DRE, fluxo de caixa e BI', path: '/finance', shortcut: 'gf', icon: DollarSign, permission: 'MANAGE_FINANCE' },
    { id: 'cmd-admin', name: 'Infraestrutura & APIs', description: 'Configurações de infraestrutura e tokens', path: '/admin', shortcut: 'adm', icon: Settings, permission: 'MANAGE_SETTINGS' },
    { id: 'cmd-canvas', name: 'Hub Canvas', description: 'Whiteboards interativos para brainstorming', path: '/canvas', shortcut: 'cv', icon: FolderGit2 },
    { id: 'cmd-wiki', name: 'Wiki & Memória', description: 'Base de conhecimento e segundo cérebro', path: '/wiki', shortcut: 'wi', icon: BookOpen },
    { id: 'cmd-settings', name: 'Configurações', description: 'Configurações gerais da conta e preferências', path: '/settings', shortcut: 'cf', icon: Settings },
    { id: 'cmd-profile', name: 'Meu Perfil', description: 'Edição de dados pessoais e visualização de avatar', path: `/profile/${userProfile?.uid || 'me'}`, shortcut: 'pf', icon: User },
    { id: 'cmd-workspace', name: 'Hub Office (Workspace)', description: 'Anotador, gestão e metas de consistência', path: '/workspace', shortcut: 'wo', icon: Sparkles }
  ], [userProfile?.uid]);

  // Filtra comandos e clientes reais baseado no termo pesquisado e nas permissões do usuário
  const filteredCommands = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    const matchingRoutes = allDestinations.filter(cmd => {
      if (cmd.permission && !hasPermission(cmd.permission)) {
        return false;
      }
      if (!searchLower) return true;
      return (
        cmd.name.toLowerCase().includes(searchLower) ||
        cmd.description.toLowerCase().includes(searchLower) ||
        cmd.shortcut.toLowerCase().includes(searchLower)
      );
    });

    if (!searchLower) return matchingRoutes;

    const matchingClients: CommandItem[] = (clients || [])
      .filter(c =>
        (c.name || '').toLowerCase().includes(searchLower) ||
        (c.email || '').toLowerCase().includes(searchLower) ||
        (c.whatsapp || '').toLowerCase().includes(searchLower)
      )
      .slice(0, 6)
      .map(client => ({
        id: `client-${client.id}`,
        name: client.name || 'Cliente sem nome',
        description: `Cliente • ${client.status || 'Cadastro'}${client.plan ? ` • Plano ${client.plan}` : ''}`,
        shortcut: 'CLIENTE',
        icon: Users,
        onSelect: () => {
          setEditingClient(client);
          setIsModalOpen(true);
        }
      }));

    return [...matchingClients, ...matchingRoutes];
  }, [search, allDestinations, clients, hasPermission, setEditingClient, setIsModalOpen]);

  // Encontra a melhor sugestão para auto-complete
  const autocompleteSuggestion = useMemo(() => {
    if (!search) return null;
    const match = filteredCommands[0];
    if (match && match.name.toLowerCase().startsWith(search.toLowerCase())) {
      return match.name;
    }
    return null;
  }, [search, filteredCommands]);

  // Escuta evento customizado para abrir a paleta a partir de qualquer botão/barra de busca
  useEffect(() => {
    const handleCustomOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ query?: string }>).detail;
      openPalette(detail?.query || '');
    };
    window.addEventListener('hub:open-command-palette', handleCustomOpen);
    return () => window.removeEventListener('hub:open-command-palette', handleCustomOpen);
  }, []);

  // Escuta Ctrl+K / Cmd+K e tecla / global
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette('');
        return;
      }

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        openPalette('');
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
          break;
        case 'Tab':
        case 'ArrowRight':
          if (autocompleteSuggestion) {
            e.preventDefault();
            setSearch(autocompleteSuggestion);
          }
          break;
        case 'Enter': {
          e.preventDefault();
          const chosen = filteredCommands[selectedIndex];
          if (chosen) {
            if (chosen.onSelect) {
              chosen.onSelect();
            } else if (chosen.path) {
              navigate(chosen.path);
            }
            setIsOpen(false);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, autocompleteSuggestion, navigate]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  const glowStyles: Record<string, string> = {
    blue: 'shadow-[0_0_25px_rgba(59,130,246,0.2)] border-blue-500/30',
    green: 'shadow-[0_0_25px_rgba(16,185,129,0.2)] border-emerald-500/30',
    orange: 'shadow-[0_0_25px_rgba(249,115,22,0.2)] border-orange-500/30',
    purple: 'shadow-[0_0_25px_rgba(139,92,246,0.2)] border-purple-500/30',
    rose: 'shadow-[0_0_25px_rgba(244,63,94,0.2)] border-rose-500/30',
    gold: 'shadow-[0_0_25px_rgba(234,179,8,0.2)] border-yellow-500/30',
    cyberpunk: 'shadow-[0_0_25px_rgba(6,182,212,0.3)] border-cyan-400/40',
  };

  const activeGlow = glowStyles[themeColor] || 'shadow-[0_0_20px_rgba(255,255,255,0.05)] border-white/10';

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[14vh] px-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in">
      <div
        ref={paletteRef}
        className={`w-full max-w-lg overflow-hidden rounded-2xl border bg-slate-950/90 backdrop-blur-xl transition-all duration-300 ${activeGlow}`}
      >
        {/* Input de Busca com auto-complete */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-white/10">
          <Search className="w-5 h-5 mr-3 text-primary-400 shrink-0" />

          {autocompleteSuggestion && (
            <div className="absolute left-[44px] pointer-events-none text-slate-600 font-medium select-none text-sm leading-5">
              {search}
              <span className="opacity-45">{autocompleteSuggestion.slice(search.length)}</span>
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-0 outline-none text-white text-sm font-medium placeholder-slate-500 focus:ring-0"
            placeholder="Buscar clientes, módulos, funis ou ofertas..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />

          {search ? (
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 font-bold uppercase select-none shrink-0">
              Tab
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 font-bold uppercase select-none shrink-0">
              ESC
            </div>
          )}
        </div>

        {/* Lista de Resultados */}
        <div className="max-h-[360px] overflow-y-auto py-2 custom-scrollbar">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  className={`flex items-center justify-between px-4 py-2.5 mx-2 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary-500/15 text-white border border-primary-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                  onClick={() => {
                    if (cmd.onSelect) {
                      cmd.onSelect();
                    } else if (cmd.path) {
                      navigate(cmd.path);
                    }
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="flex items-center min-w-0 mr-4">
                    <div className={`p-1.5 rounded-lg mr-3 shrink-0 ${isSelected ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-900/70'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{cmd.name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{cmd.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400 font-semibold uppercase">
                      {cmd.shortcut}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Info className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">Nenhum resultado encontrado</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                Tente buscar pelo nome de um cliente ou módulo do Hub Central.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-slate-950 text-[10px] text-slate-500 font-medium">
          <div className="flex items-center gap-1">
            <span>Use</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-bold uppercase select-none">↓↑</kbd>
            <span>para navegar</span>
            <span className="mx-1">•</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-bold uppercase select-none">Enter</kbd>
            <span>para abrir</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Atalhos:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-bold uppercase select-none">Ctrl K</kbd>
            <span>ou</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-bold uppercase select-none">/</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
