import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Menu, X, Plus, Download, Focus, Video, Clock, Shield } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { useUI } from '@/contexts/UIContext';
import { useFilteredClients } from '@/hooks/useFilteredClients';
import { useWeather } from '@/hooks/useWeather';
import { useCRMStore } from '@/store/useCRMStore';
import { useDialog } from '@auth/contexts/DialogContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';

interface HeaderProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export function Header({ currentPath, navigate }: HeaderProps) {
  const { userProfile } = useAuth();
  const { weather } = useWeather();
  const { 
    searchTerm, setSearchTerm, 
    globalSearch, setGlobalSearch,
    focusMode, setFocusMode,
    setSidebarOpen,
    isModalOpen, setIsModalOpen,
    isRecorderOpen, setIsRecorderOpen,
    filterStatus, sortBy, filterTagId
  } = useUI();
  
  const { 
    clients,
    setEditingClient,
    handleExportCSV
  } = useCRM();
  const store = useCRMStore();
  const { confirm: customConfirm, alert: customAlert, prompt: customPrompt } = useDialog();
  const { hasPermission, hasAnyPermission } = usePermissions();

  const [newTicketsCount, setNewTicketsCount] = useState(0);

  // Escutar se existem novos tickets de compliance para exibir notificação (badge) ao RH/Admin
  useEffect(() => {
    if (!userProfile?.orgId || !hasAnyPermission(['MANAGE_SETTINGS', 'MANAGE_TEAM'])) return;

    const ref = collection(db, 'organizations', userProfile.orgId, 'compliance_tickets');
    const q = query(ref, where('status', '==', 'new'));

    const unsub = onSnapshot(q, (snap) => {
      setNewTicketsCount(snap.size);
    }, (err) => {
      console.error('Erro ao buscar novos tickets:', err);
    });

    return () => unsub();
  }, [userProfile?.orgId, hasAnyPermission]);

  const filteredClientsForExport = useFilteredClients(clients, searchTerm, filterStatus, sortBy, filterTagId);

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
      case '/notifications': return 'Notificações';
      case '/team': return 'Gestão de Equipe';
      case '/people': return 'Pessoas & Cultura';
      case '/wiki': return 'Wiki Hub';
      default: return null;
    }
  };

  const pageTitle = getPageTitle();

  return (
    <>
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
            <div className="flex items-center shrink-0 border-l border-white/10 pl-4 md:pl-8 gap-2 md:gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                  {new Date().getHours() >= 5 && new Date().getHours() < 12 ? '☀️ Bom dia' : new Date().getHours() >= 12 && new Date().getHours() < 18 ? '🌤️ Boa tarde' : '🌙 Boa noite'}
                </p>
                <h2 className="text-sm font-bold text-white truncate max-w-[150px]">
                  {userProfile?.displayName?.split(' ')[0] || 'Colaborador'}!
                </h2>
              </div>

              {weather && (
                <div className="flex items-center gap-2 bg-white/5 px-2 md:px-3 py-1 md:py-1.5 rounded-xl border border-white/5 animate-in fade-in slide-in-from-right-4">
                  <img 
                    src={`https://openweathermap.org/img/wn/${weather.icon}.png`} 
                    alt={weather.description}
                    className="w-8 h-8 object-contain"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white leading-none">{weather.temp}°C</span>
                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter leading-none mt-1">{weather.description}</span>
                  </div>
                </div>
              )}
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
        {userProfile && (
          <button
            onClick={async () => {
              if (store.loadingTimeLog) return;
              const log = store.todayLog;
              const isAdmin = hasPermission('MANAGE_SETTINGS');
              const contractType = isAdmin ? 'PJ' : (userProfile?.contractType || 'PJ');

              if (!log) {
                await store.startExpediente(
                  userProfile.uid,
                  userProfile.displayName || 'Colaborador',
                  userProfile.photoURL || ''
                );
              } else if (log.status === 'completed') {
                const isCLT = contractType === 'CLT';
                if (isCLT) {
                  const overtimeInput = await customPrompt({
                    title: 'Horas Extras Planejadas',
                    message: 'Seu expediente regular já foi concluído hoje. Como CLT, informe o tempo planejado de hora extra (em minutos) para liberar o ponto:',
                    placeholder: 'Ex: 60 (para 1 hora)',
                    confirmText: 'Liberar Ponto',
                    cancelText: 'Cancelar',
                    variant: 'warning'
                  });

                  if (overtimeInput !== null) {
                    const minutes = parseInt(overtimeInput.trim(), 10);
                    if (!isNaN(minutes) && minutes > 0) {
                      await store.reopenExpediente(minutes);
                    } else {
                      toast.error('Por favor, insira um valor numérico válido maior que 0.');
                    }
                  }
                } else {
                  const confirmed = await customConfirm({
                    title: 'Reabrir Expediente (PJ)',
                    message: 'Deseja realmente reabrir seu expediente de trabalho de hoje? As horas continuarão a ser contadas normalmente.',
                    confirmText: 'Sim, Reabrir',
                    cancelText: 'Cancelar',
                    variant: 'success'
                  });
                  if (confirmed) {
                    await store.reopenExpediente();
                  }
                }
              } else {
                const confirmed = await customConfirm({
                  title: 'Encerrar Expediente',
                  message: 'Deseja realmente encerrar seu expediente de trabalho de hoje?',
                  confirmText: 'Sim, Encerrar',
                  cancelText: 'Continuar Trabalhando',
                  variant: 'danger'
                });
                if (confirmed) {
                  await store.endExpediente();
                }
              }
            }}
            disabled={store.loadingTimeLog}
            className={`p-2.5 border rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5 ${
              !store.todayLog
                ? 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
                : store.todayLog.status === 'active'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                : store.todayLog.status === 'paused'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
            }`}
            title={
              !store.todayLog
                ? 'Iniciar Expediente (Entrada)'
                : store.todayLog.status === 'active'
                ? 'Expediente Ativo (Clique para encerrar)'
                : store.todayLog.status === 'paused'
                ? 'Expediente em Intervalo (Clique para encerrar)'
                : `Expediente Concluído Hoje (Clique para reabrir como ${hasPermission('MANAGE_SETTINGS') ? 'PJ' : (userProfile?.contractType || 'PJ')})`
            }
          >
            <Clock size={16} />
            {store.todayLog && store.todayLog.status !== 'completed' && (
              <span className={`w-1.5 h-1.5 rounded-full ${
                store.todayLog.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} />
            )}
          </button>
        )}
        <button
          onClick={() => navigate('/ouvidoria')}
          className="p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          title="Canal de Ouvidoria & Linha Ética"
        >
          <Shield size={16} />
        </button>
        {hasAnyPermission(['MANAGE_SETTINGS', 'MANAGE_TEAM']) && (
          <button
            onClick={() => navigate('/compliance-admin')}
            className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 flex items-center justify-center relative"
            title="Painel de Ouvidoria (RH / Gestão)"
          >
            <Shield size={16} className="text-rose-500" />
            {newTicketsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center border border-zinc-950 animate-bounce">
                {newTicketsCount}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setIsRecorderOpen(true)}
          className="p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          title="Gravar Tela (Loom Nativo)"
        >
          <Video size={16} />
        </button>
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
  </>
  );
}
