import React, { useState } from 'react';
import { Search, X, Focus, Video, Tv } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { useWeather } from '@/hooks/useWeather';
import MultiScreenLauncherModal from '@/domains/screens/components/MultiScreenLauncherModal';

interface HeaderProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export function Header({ currentPath, navigate }: HeaderProps) {
  const { userProfile } = useAuth();
  const { weather } = useWeather();
  const {
    globalSearch,
    setGlobalSearch,
    focusMode,
    setFocusMode,
    setIsRecorderOpen
  } = useUI();

  const [isScreensModalOpen, setIsScreensModalOpen] = useState(false);

  const isWiki = currentPath === '/wiki';
  const isDashboard = currentPath === '/';

  const getPageTitle = () => {
    switch (currentPath) {
      case '/analytics': return 'Analytics de Vendas';
      case '/calendar': return 'Agenda & Prazos';
      case '/support': return 'Suporte & Tickets';
      case '/finance': return 'Financeiro Estratégico';
      case '/billing': return 'Cobrança & Asaas';
      case '/contracts': return 'Contratos Digitais';
      case '/onboarding-hub': return 'Onboarding de Clientes';
      case '/projects': return 'Projetos & Sites';
      case '/settings': return 'Configurações';
      case '/referrals': return 'Programa de Indicações';
      case '/products': return 'Catálogo de Produtos';
      case '/icp': return 'Perfis de ICP';
      case '/monitoring': return 'Automações & Uptime';
      case '/notifications': return 'Notificações';
      case '/offers': return 'Laboratório de Ofertas';
      case '/funnels': return 'Arquiteto de Funis';
      case '/hub-ads': return 'HubAds & Criativos';
      case '/growth-hub': return 'Galeria de Crescimento';
      case '/workspace': return 'Hub Office';
      case '/wiki': return 'Wiki & Memória';
      default: return null;
    }
  };

  const pageTitle = getPageTitle();
  const firstName = userProfile?.displayName?.split(' ')[0] || 'José';

  return (
    <>
      <header
        className="bg-black/25 backdrop-blur-2xl border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0 z-30 gap-4"
        role="banner"
      >
        <div className="flex items-center flex-1 min-w-0">
          {isWiki && (
            <button
              onClick={() => navigate('/')}
              className="mr-5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl transition-all flex items-center gap-2 group shadow-xl cursor-pointer"
              aria-label="Sair da Wiki e voltar para o Hub Central"
            >
              <X size={16} className="group-hover:rotate-90 transition-transform" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
            </button>
          )}

          {!isWiki && (
            <div
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 mr-6 cursor-pointer group shrink-0"
            >
              <img
                src="https://i.imgur.com/zCvL7xy.png"
                alt="Hub Central"
                className="h-7 w-auto group-hover:scale-105 transition-transform"
              />
              <div className="hidden sm:flex items-baseline gap-1.5">
                <h1 className="text-xl font-black tracking-tighter text-white uppercase leading-none">
                  Hub
                </h1>
                <p className="text-xl font-light text-cyan-400 tracking-tight uppercase leading-none">
                  Central
                </p>
              </div>
            </div>
          )}

          {isDashboard ? (
            <div className="flex items-center gap-6 w-full flex-1 min-w-0">
              <div className="flex items-center shrink-0 border-l border-white/10 pl-4 md:pl-6 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                    {new Date().getHours() >= 5 && new Date().getHours() < 12
                      ? '☀️ Bom dia'
                      : new Date().getHours() >= 12 && new Date().getHours() < 18
                      ? '🌤️ Boa tarde'
                      : '🌙 Boa noite'}
                  </p>
                  <h2 className="text-sm font-bold text-white truncate max-w-[160px]">
                    {firstName}!
                  </h2>
                </div>

                {weather && (
                  <div className="hidden md:flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-xl border border-white/5">
                    <img
                      src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                      alt={weather.description}
                      className="w-7 h-7 object-contain"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white leading-none">
                        {weather.temp}°C
                      </span>
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter leading-none mt-1">
                        {weather.description}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('hub:open-command-palette'))}
                className="flex items-center justify-between w-full max-w-md bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-gray-400 hover:text-gray-200 text-xs rounded-2xl px-4 py-2 transition-all shadow-inner cursor-pointer group"
                aria-label="Abrir busca rápida de clientes, agentes e módulos"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Search
                    size={15}
                    className="text-gray-500 group-hover:text-cyan-400 transition-colors shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">Buscar clientes, ofertas, agentes IA...</span>
                </span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-[10px] font-mono text-gray-400 shrink-0 ml-2">
                  Ctrl K
                </kbd>
              </button>
            </div>
          ) : (
            pageTitle && (
              <h2 className="text-base sm:text-lg font-bold text-white truncate border-l border-white/10 pl-5">
                {pageTitle}
              </h2>
            )
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {!isDashboard && (
            <div className="hidden md:flex items-center w-52 lg:w-64 relative" role="search">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Filtrar nesta tela..."
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500/50 transition-all placeholder-gray-500"
                aria-label="Busca na tela"
              />
            </div>
          )}

          <button
            onClick={() => setIsScreensModalOpen(true)}
            className="px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5 shadow-lg shadow-indigo-500/10"
            title="Sala de Comando Multi-Monitores (War Room)"
          >
            <Tv size={15} />
            <span className="text-[10px] font-black uppercase tracking-wider hidden xl:inline">
              War Room
            </span>
          </button>

          <button
            onClick={() => setIsRecorderOpen(true)}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            title="Gravar Tela (Loom Nativo)"
          >
            <Video size={15} />
          </button>

          {currentPath === '/chat' && (
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                focusMode
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Focus size={14} />
              <span>{focusMode ? 'Foco ON' : 'Foco'}</span>
            </button>
          )}
        </div>
      </header>

      <MultiScreenLauncherModal
        isOpen={isScreensModalOpen}
        onClose={() => setIsScreensModalOpen(false)}
      />
    </>
  );
}
