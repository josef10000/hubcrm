import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@auth/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
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
  Info
} from 'lucide-react';

interface CommandItem {
  name: string;
  description: string;
  path: string;
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
  const { themeColor } = useUI();
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Lista de destinos completa e detalhada baseada nas rotas internas
  const allDestinations: CommandItem[] = useMemo(() => [
    { name: 'Dashboard', description: 'Visão geral de negócios, metas e métricas principais', path: '/', shortcut: 'da', icon: LayoutDashboard },
    { name: 'Chat', description: 'Comunicação interna do time e mensagens de voz', path: '/chat', shortcut: 'ch', icon: MessageSquare },
    { name: 'Suporte', description: 'Central de chamados, tickets abertos e SLA', path: '/support', shortcut: 'su', icon: LifeBuoy },
    { name: 'Notificações', description: 'Alertas de sistema, aniversário e atualizações', path: '/notifications', shortcut: 'no', icon: Bell },
    { name: 'Calendário', description: 'Agenda de reuniões, prazos e compromissos', path: '/calendar', shortcut: 'ca', icon: Calendar },
    { name: 'Indicações', description: 'Programa de Indicações "Indique e Ganhe"', path: '/referrals', shortcut: 're', icon: Compass },
    { name: 'Produtos', description: 'Gestão de produtos, planos e ofertas ativas', path: '/products', shortcut: 'pr', icon: Package },
    { name: 'Monitoramento Uptime', description: 'Monitoramento nativo de servidores e sites', path: '/monitoring', shortcut: 'mo', icon: ShieldAlert },
    { name: 'Mapa de Clientes', description: 'Distribuição geográfica e localização de clientes', path: '/map', shortcut: 'ma', icon: Map },
    { name: 'Faturamento', description: 'Integrações financeiras, faturas Asaas e extrato', path: '/billing', shortcut: 'fa', icon: CreditCard },
    { name: 'Onboarding Hub', description: 'Gerenciador de formulários e recepção de clientes', path: '/onboarding-hub', shortcut: 'on', icon: ClipboardList },
    { name: 'Contratos', description: 'Modelos de contratos ativos e assinaturas digitais', path: '/contracts', shortcut: 'co', icon: UserCheck },
    { name: 'Fábrica de Sites & Projetos', description: 'Acompanhamento de projetos, templates white label e gerador de prompts', path: '/projects', shortcut: 'pj', icon: LayoutTemplate },
    { name: 'Relatórios / Analytics', description: 'Métricas de conversão e relatórios avançados', path: '/analytics', shortcut: 'an', icon: LineChart, permission: 'VIEW_REPORTS' },
    { name: 'Gestão Financeira', description: 'Snapshot diário de DRE, fluxo de caixa e BI', path: '/finance', shortcut: 'gf', icon: DollarSign, permission: 'MANAGE_FINANCE' },
    { name: 'Minha Equipe', description: 'Controle de acessos, convites e organograma', path: '/team', shortcut: 'te', icon: Users, permission: 'MANAGE_TEAM' },
    { name: 'Pessoas', description: 'Quadro Kanban de PDI e desenvolvimento de carreiras', path: '/people', shortcut: 'pe', icon: UserCheck, permission: 'MANAGE_TEAM' },
    { name: 'Administração', description: 'Configurações de infraestrutura e tokens', path: '/admin', shortcut: 'ad', icon: Settings, permission: 'MANAGE_SETTINGS' },
    { name: 'Quadros Canvas', description: 'Whiteboards interativos para brainstorming', path: '/canvas', shortcut: 'cv', icon: FolderGit2, permission: 'MANAGE_TEAM' },
    { name: 'Wiki / Notas', description: 'Base de conhecimento e notas compartilhadas', path: '/wiki', shortcut: 'wi', icon: BookOpen },
    { name: 'Configurações', description: 'Configurações gerais da conta e preferências', path: '/settings', shortcut: 'cf', icon: Settings },
    { name: 'Meu Perfil', description: 'Edição de dados pessoais e visualização de avatar', path: `/profile/${userProfile?.uid || 'me'}`, shortcut: 'pf', icon: User },
    { name: 'Meu Workspace', description: 'Anotador e metas de consistência do Nexus', path: '/workspace', shortcut: 'wo', icon: Target },
    { name: 'Hub Arena', description: 'Central de jogos (Xadrez, Damas, Ludo e Connect 4)', path: '/arena', shortcut: 'ar', icon: Gamepad2 },
    { name: 'Hub Shop', description: 'Loja de resgate de prêmios por Hub Coins', path: '/shop', shortcut: 'sh', icon: ShoppingBag },
    { name: 'Segurança / Compliance', description: 'Logs de auditoria e conformidade de dados', path: '/compliance', shortcut: 'sg', icon: ShieldAlert, permission: 'MANAGE_SETTINGS' }
  ], [userProfile?.uid]);

  // Filtra comandos baseado no termo pesquisado e nas permissões do usuário
  const filteredCommands = useMemo(() => {
    return allDestinations.filter(cmd => {
      // Filtragem por permissão
      if (cmd.permission && !hasPermission(cmd.permission)) {
        return false;
      }

      const searchLower = search.toLowerCase();
      return (
        cmd.name.toLowerCase().includes(searchLower) ||
        cmd.description.toLowerCase().includes(searchLower) ||
        cmd.shortcut.toLowerCase().includes(searchLower)
      );
    });
  }, [search, allDestinations, hasPermission]);

  // Encontra a melhor sugestão para auto-complete
  const autocompleteSuggestion = useMemo(() => {
    if (!search) return null;
    const match = filteredCommands[0];
    if (match && match.name.toLowerCase().startsWith(search.toLowerCase())) {
      return match.name;
    }
    return null;
  }, [search, filteredCommands]);

  // Escuta tecla / global e teclas de controle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar tecla de atalho caso o usuário esteja em um formulário/input
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setIsOpen(true);
        setSearch('');
        setSelectedIndex(0);
        setTimeout(() => inputRef.current?.focus(), 50);
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
          // Auto-completa o texto com a sugestão atual se houver
          if (autocompleteSuggestion) {
            e.preventDefault();
            setSearch(autocompleteSuggestion);
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            navigate(filteredCommands[selectedIndex].path);
            setIsOpen(false);
          }
          break;
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

  // Mapa de cores para brilho dinâmico baseado no tema ativo do CRM
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
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        ref={paletteRef}
        className={`w-full max-w-lg overflow-hidden rounded-xl border bg-slate-950/85 backdrop-blur-xl transition-all duration-300 ${activeGlow}`}
      >
        {/* Input de Busca com auto-complete */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-white/5">
          <Search className="w-5 h-5 mr-3 text-slate-400" />
          
          {/* Caixa de Auto-complete (Cinza Translúcido Atrás) */}
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
            placeholder="Digite para onde deseja ir... (Pressione ESC para fechar)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          
          {search && (
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 font-bold uppercase select-none">
              Tab para Autocompletar
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
                  key={cmd.path}
                  className={`flex items-center justify-between px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-white/5 text-white' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                  onClick={() => {
                    navigate(cmd.path);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="flex items-center min-w-0 mr-4">
                    <div className={`p-1.5 rounded-md mr-3 ${isSelected ? 'bg-white/5 text-white animate-pulse' : 'bg-slate-900/50'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{cmd.name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{cmd.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-white/5 text-slate-500 font-semibold uppercase">
                      {cmd.shortcut}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Info className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">Nenhum destino encontrado</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                Tente buscar por termos relacionados ou simplifique sua busca.
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
            <span>para viajar</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Atalho global:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-bold uppercase select-none">/</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
