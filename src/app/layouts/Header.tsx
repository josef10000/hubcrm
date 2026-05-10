import React from 'react';
import { Search, Menu, X, Plus, Download, Focus } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { useUI } from '@/contexts/UIContext';

interface HeaderProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export function Header({ currentPath, navigate }: HeaderProps) {
  const { userProfile } = useAuth();
  const { 
    searchTerm, setSearchTerm, 
    globalSearch, setGlobalSearch,
    focusMode, setFocusMode,
    setSidebarOpen
  } = useUI();
  
  const { 
    setIsModalOpen, setEditingClient,
    handleExportCSV, filteredClientsForExport,
    hasAnyPermission 
  } = useCRM();
  const { hasPermission } = usePermissions();

  const isWiki = currentPath === '/wiki';
  const isDashboard = currentPath === '/';

  const getPageTitle = () => {
    switch(currentPath) {
      case '/analytics': return 'Métricas';
      case '/calendar': return 'Agenda Central';
      case '/support': return 'Chamados';
      case '/finance': return 'Financeiro Estratégico';
      case '/billing': return 'Cobrança & Comissões';
      case '/contracts': return 'Central de Contratos';
      case '/onboarding-hub': return 'Onboarding Hub';
      case '/projects': return 'Projetos & Produção';
      case '/settings': return 'Configurações';
      case '/referrals': return 'Hub Rewards';
      case '/marketing': return 'Comunicados Globais';
      case '/products': return 'Produtos';
      case '/monitoring': return 'Monitoramento';
      case '/map': return 'Mapa de Clientes';
      case '/leads': return 'Funil de Vendas';
      case '/notifications': return 'Notificações';
      case '/team': return 'Gestão de Equipe';
      case '/people': return 'Pessoas & Cultura';
      case '/wiki': return 'Wiki Hub';
      default: return null;
    }
  };

  const pageTitle = getPageTitle();

  return (
    <header className="bg-black/20 backdrop-blur-2xl border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between shrink-0 z-30 gap-4" role="banner">
      <div className="flex items-center flex-1">
        {isWiki ? (
          <button
            onClick={() => navigate('/')}
            className="mr-6 p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl transition-all flex items-center gap-2 group shadow-xl"
            aria-label="Sair da Wiki e voltar para o dashboard"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform" aria-hidden="true" />
            <span className="text-sm font-bold uppercase tracking-wider">Sair da Wiki</span>
          </button>
        ) : (
          <button
            className="md:hidden mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu lateral"
          >
            <Menu size={24} aria-hidden="true" />
          </button>
        )}

        {!isWiki && (
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 mr-8 cursor-pointer group shrink-0"
          >
            <div className="hidden sm:flex items-baseline gap-1.5">
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase leading-none">Hub</h1>
              <p className="text-2xl font-light text-primary-400 tracking-tight uppercase leading-none">Central</p>
            </div>
          </div>
        )}

        {isDashboard ? (
          <div className="flex items-center gap-8 w-full flex-1">
            <div className="hidden lg:block shrink-0 border-l border-white/10 pl-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                {new Date().getHours() >= 5 && new Date().getHours() < 12 ? '☀️ Bom dia' : new Date().getHours() >= 12 && new Date().getHours() < 18 ? '🌤️ Boa tarde' : '🌙 Boa noite'}
              </p>
              <h2 className="text-sm font-bold text-white truncate max-w-[150px]">
                {userProfile?.displayName?.split(' ')[0] || 'Colaborador'}!
              </h2>
            </div>
            <div className="flex items-center w-full max-w-sm relative" role="search">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-2xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder-gray-600 shadow-inner"
                aria-label="Campo de busca de clientes"
              />
            </div>
          </div>
        ) : pageTitle && (
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{pageTitle}</h2>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!isDashboard && (
          <div className="hidden md:flex items-center w-52 lg:w-72 relative" role="search">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            <input
              type="text"
              placeholder="Busca global..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder-gray-600"
              aria-label="Busca global"
            />
          </div>
        )}

        {currentPath === '/chat' && (
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${focusMode
              ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
              : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
              }`}
          >
            <Focus size={14} />
            <span>{focusMode ? 'Foco ON' : 'Foco'}</span>
          </button>
        )}

        {isDashboard && (
          <>
            <button
              onClick={() => handleExportCSV(filteredClientsForExport)}
              className="hidden sm:flex items-center space-x-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-4 py-3 rounded-2xl transition-all font-medium shrink-0"
            >
              <Download size={18} />
              <span>Exportar</span>
            </button>
            {hasAnyPermission(['MANAGE_LEADS', 'MANAGE_CLIENTS']) && (
              <button
                onClick={() => { setEditingClient(null); setIsModalOpen(true); }}
                className="flex items-center space-x-2 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-gray-900 dark:text-white px-5 py-3 rounded-2xl transition-all font-medium shadow-xl shadow-primary-500/30 hover:scale-105 active:scale-95 shrink-0"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Novo Cliente</span>
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
