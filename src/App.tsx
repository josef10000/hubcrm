/** Intranet Hub Symples - Gestão Interna (Build Test: Vercel Limits Check) */
import React, { useMemo } from 'react';
import {
  LayoutDashboard, Users, Plus, X, DollarSign,
  Search, BarChart3, Calendar, MessageCircle, Globe,
  Download, AlertTriangle, Settings, Layout, CreditCard,
  Megaphone, Package, Map as MapIcon, Target, Menu, Bell, Shield, HeartHandshake, BookOpen, Rocket, Focus, ShieldCheck, LayoutTemplate
} from 'lucide-react';
import { isFirebaseConfigured } from './lib/firebase';
import Auth from './components/Auth';
import CalendarView from './components/CalendarView';
import MonitoringView from './components/MonitoringView';
import ClientMapView from './components/ClientMapView';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

import BillingView from './views/BillingView';
import AdministrativeView from './views/AdministrativeView';
import OnboardingHubView from './views/OnboardingHubView';
import ContractsView from './views/ContractsView';
import ProjectsView from './views/ProjectsView';
import ChatView from './views/ChatView';
import { useGlobalChatAlerts } from './hooks/useGlobalChatAlerts';
import { usePresence } from './hooks/usePresence';

import ConfirmationModal from './components/ConfirmationModal';
import OfferModal from './components/OfferModal';
import ClientModal from './components/ClientModal';
import ReferralsView from './components/ReferralsView';
import Sidebar from './components/Sidebar';
import { navGroups } from './constants/navigation';

import DashboardView from './views/DashboardView';
import AnalyticsView from './views/AnalyticsView';
import FinanceView from './views/FinanceView';
import SupportView from './views/SupportView';
import { useFilteredClients } from './hooks/useFilteredClients';
import MarketingView from './views/MarketingView';
import ProductsView from './views/ProductsView';
import SettingsView from './views/SettingsView';
import LeadsView from './views/LeadsView';
import NotificationsView from './views/NotificationsView';
import TeamManagementView from './views/TeamManagementView';
import PeopleView from './views/PeopleView';
import AcceptInviteView from './views/AcceptInviteView';
import ProfileView from './views/ProfileView';
import BirthdayCelebration from './components/BirthdayCelebration';
import AvatarFrame from './components/AvatarFrame';
import ThemeEffects from './components/ThemeEffects';
import EmployeeSurveyModal from './components/EmployeeSurveyModal';
import WikiView from './views/WikiView';
import WaitingInviteView from './views/WaitingInviteView';
import CanvasListView from './views/CanvasListView';
import CanvasEditorView from './views/CanvasEditorView';


import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { CRMProvider, useCRM } from './contexts/CRMContext';
import { DialogProvider } from './contexts/DialogContext';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { usePermissions } from './hooks/usePermissions';
import ClientPortal from './components/portal/ClientPortalLayout';
import OnboardingForm from './components/OnboardingForm';
import ContractSignView from './views/ContractSignView';
import PublicCheckoutPage from './components/PublicCheckoutPage';

function CRMInner() {
  const { user, userProfile, isBirthday, unreadAlertsCount } = useAuth();
  usePresence(); // Ativa monitoramento de status
  const navigate = useNavigate();
  const {
    clients, activeLeadsCount, offers, supportRequests, loading, errorMsg,
    editingClient, setEditingClient,
    isOfferModalOpen, setIsOfferModalOpen, editingOffer, setEditingOffer,
    isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen, offerToDelete, setOfferToDelete,
    onboardingQuestions,
    handleSaveClient, handleDeleteClient,
    handleSaveOffer, handleDeleteOffer, handleExportCSV,
    wikiArticles, pendingVacationsCount
  } = useCRM();

  const {
    sidebarOpen, setSidebarOpen, isModalOpen, setIsModalOpen,
    searchTerm, setSearchTerm, filterStatus, sortBy, filterTagId,
    focusMode, setFocusMode, globalSearch, setGlobalSearch
  } = useUI();

  const { hasPermission, hasAnyPermission } = usePermissions();

  const filteredClientsForExport = useFilteredClients(clients, searchTerm, filterStatus, sortBy, filterTagId);
  const location = useLocation();
  const currentPath = location.pathname;
  const isStandaloneChat = new URLSearchParams(location.search).get('standalone') === 'true' && currentPath === '/chat';

  // Em modo standalone (nova aba), forçar foco permanente
  React.useEffect(() => {
    if (isStandaloneChat) setFocusMode(true);
  }, [isStandaloneChat]);

  const openTicketCount = useMemo(() => supportRequests.filter(r => r.status === 'aberto' || r.status === 'em_analise').length, [supportRequests]);
  const { totalUnread: chatUnreadCount } = useGlobalChatAlerts();

  const newWikiCount = useMemo(() => {
    if (!userProfile?.viewedWikiArticles) return wikiArticles.length;
    return wikiArticles.filter(art => !userProfile.viewedWikiArticles?.includes(art.id)).length;
  }, [wikiArticles, userProfile?.viewedWikiArticles]);

  const titleCount = useMemo(() => {
    const isManagement = hasPermission('MANAGE_TEAM');
    return unreadAlertsCount + openTicketCount + (isManagement ? (pendingVacationsCount || 0) : 0) + newWikiCount;
  }, [unreadAlertsCount, openTicketCount, pendingVacationsCount, newWikiCount, hasPermission]);

  React.useEffect(() => {
    const prefix = titleCount > 0 ? `(${titleCount}) ` : '';
    if (currentPath === '/chat') {
      document.title = `${prefix}Chat`;
    } else {
      document.title = `${prefix}Hub Central`;
    }
  }, [titleCount, currentPath]);

  if (userProfile?.orgId === 'pending') {
    return <WaitingInviteView />;
  }

  return (
    <div className="flex h-screen bg-[#030712] font-sans overflow-hidden text-gray-900 dark:text-gray-100 relative">
      {userProfile?.wallpaperUrl && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-20 pointer-events-none mix-blend-overlay transition-all duration-1000"
          style={{ backgroundImage: `url(${userProfile.wallpaperUrl})` }}
        />
      )}
      <ThemeEffects />
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen z-0"></div>
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen z-0"></div>

      {isBirthday && <BirthdayCelebration uid={user?.uid} />}

      {currentPath !== '/wiki' && !isStandaloneChat && !(currentPath === '/chat' && focusMode) && (
        <Sidebar />
      )}


      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-20">
        <header className="bg-black/20 backdrop-blur-2xl border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between shrink-0 z-30 gap-4" role="banner">
          <div className="flex items-center flex-1">
            {currentPath === '/wiki' ? (
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
            {currentPath !== '/wiki' && (
              <div 
                onClick={() => navigate('/')}
                className="flex items-center gap-3 mr-8 cursor-pointer group shrink-0"
              >
                <div className="hidden sm:block">
                  <h1 className="text-lg font-black tracking-tighter text-white uppercase leading-none">Hub</h1>
                  <p className="text-[10px] font-bold text-primary-400 tracking-[0.2em] uppercase leading-none mt-0.5">Central</p>
                </div>
              </div>
            )}

            {currentPath === '/' ? (
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
            ) : null}
            {currentPath === '/analytics' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Métricas</h2>}
            {currentPath === '/calendar' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agenda Central</h2>}
            {currentPath === '/support' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chamados</h2>}
            {currentPath === '/finance' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-primary-500">Financeiro Estratégico</h2>}
            {currentPath === '/billing' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-emerald-500">Cobrança & Comissões</h2>}
            {currentPath === '/contracts' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Central de Contratos</h2>}
            {currentPath === '/onboarding-hub' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Onboarding Hub</h2>}
            {currentPath === '/projects' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-blue-500">Projetos & Produção</h2>}
            {currentPath === '/settings' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configurações</h2>}
            {currentPath === '/referrals' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Hub Rewards</h2>}
            {currentPath === '/marketing' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Comunicados Globais</h2>}
            {currentPath === '/products' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Produtos</h2>}
            {currentPath === '/monitoring' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Monitoramento</h2>}
            {currentPath === '/map' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mapa de Clientes</h2>}
            {currentPath === '/leads' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white" translate="no">Funil de Vendas</h2>}
            {currentPath === '/notifications' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white" translate="no">Notificações</h2>}
            {currentPath === '/team' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Gestão de Equipe</h2>}
            {currentPath === '/people' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pessoas & Cultura</h2>}
            {currentPath === '/wiki' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Wiki Hub</h2>}
          </div>
          <div className="flex items-center gap-3">
            {/* Busca Global Unificada */}
            {currentPath !== '/' && (
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
            {currentPath === '/chat' && !isStandaloneChat && (
              <button
                onClick={() => setFocusMode(!focusMode)}
                title={focusMode ? 'Sair do Modo Foco' : 'Entrar no Modo Foco'}
                className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${focusMode
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                  : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
                  }`}
                aria-label={focusMode ? 'Sair do Modo Foco' : 'Entrar no Modo Foco'}
              >
                <Focus size={14} />
                <span>{focusMode ? 'Foco ON' : 'Foco'}</span>
              </button>
            )}
            {currentPath === '/' && (
              <button
                onClick={() => handleExportCSV(filteredClientsForExport)}
                className="hidden sm:flex items-center space-x-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-4 py-3 rounded-2xl transition-all font-medium shrink-0"
                title="Exportar para CSV"
                aria-label="Exportar lista de clientes para arquivo CSV"
              >
                <Download size={18} aria-hidden="true" />
                <span>Exportar</span>
              </button>
            )}
            {currentPath === '/' && hasAnyPermission(['MANAGE_LEADS', 'MANAGE_CLIENTS']) && (
              <button
                onClick={() => { setEditingClient(null); setIsModalOpen(true); }}
                className="flex items-center space-x-2 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-gray-900 dark:text-white px-5 py-3 rounded-2xl transition-all font-medium shadow-xl shadow-primary-500/30 hover:shadow-2xl shadow-primary-500/50 hover:scale-105 active:scale-95 shrink-0"
                aria-label="Adicionar novo cliente ao sistema"
              >
                <Plus size={18} aria-hidden="true" />
                <span className="hidden sm:inline">Novo Cliente</span>
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 rounded-3xl h-64 animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          errorMsg ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="bg-gray-200 dark:bg-white/10 border border-red-500/30 p-6 rounded-2xl max-w-md text-center">
                <h2 className="text-red-400 font-semibold mb-2">Erro de Conexão</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{errorMsg}</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:bg-white/20 text-gray-900 dark:text-white rounded-xl transition-colors text-sm">Tentar Novamente</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <Routes>
                <Route path="/" element={<DashboardView />} />
                <Route path="/leads" element={<LeadsView />} />
                <Route path="/support" element={<SupportView />} />
                <Route path="/chat" element={<ChatView />} />
                <Route path="/notifications" element={<NotificationsView />} />
                <Route path="/calendar" element={<CalendarView role={typeof userProfile?.role === 'string' ? userProfile.role : userProfile?.role?.id} clients={clients} onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} />} />
                <Route path="/referrals" element={<ReferralsView clients={clients} user={user!} />} />
                <Route path="/products" element={<ProductsView />} />
                <Route path="/monitoring" element={<MonitoringView clients={clients} />} />
                <Route path="/map" element={<ClientMapView clients={clients} onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} />} />
                <Route path="/billing" element={<BillingView />} />
                <Route path="/onboarding-hub" element={<OnboardingHubView />} />
                <Route path="/contracts" element={<ContractsView />} />
                <Route path="/projects" element={<ProjectsView />} />

                {/* Rotas Protegidas */}
                <Route path="/analytics" element={hasPermission('VIEW_REPORTS') ? <AnalyticsView /> : <DashboardView />} />
                <Route path="/finance" element={hasPermission('MANAGE_FINANCE') ? <FinanceView /> : <DashboardView />} />
                <Route path="/marketing" element={hasPermission('MANAGE_SETTINGS') ? <MarketingView /> : <DashboardView />} />
                <Route path="/team" element={hasPermission('MANAGE_TEAM') ? <TeamManagementView /> : <DashboardView />} />
                <Route path="/people" element={hasPermission('MANAGE_TEAM') ? <PeopleView /> : <DashboardView />} />
                <Route path="/wiki" element={<WikiView />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="/admin" element={hasPermission('MANAGE_SETTINGS') ? <AdministrativeView /> : <DashboardView />} />
                <Route path="/canvas" element={hasPermission('MANAGE_TEAM') || hasPermission('MANAGE_SETTINGS') ? <CanvasListView /> : <DashboardView />} />
                <Route path="/canvas/:id" element={hasPermission('MANAGE_TEAM') || hasPermission('MANAGE_SETTINGS') ? <CanvasEditorView /> : <DashboardView />} />
                <Route path="/profile/:uid" element={<ProfileView />} />
                <Route path="*" element={<DashboardView />} />
              </Routes>
            </div>
          )
        )}
      </main>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClient}
        onDelete={handleDeleteClient}
        initialData={editingClient}
        onboardingQuestions={onboardingQuestions}
        user={user!}
        offers={offers}
      />
      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        onSave={handleSaveOffer}
        onDelete={handleDeleteOffer}
        initialData={editingOffer}
      />
      <ConfirmationModal
        isOpen={isDeleteOfferConfirmOpen}
        onClose={() => { setIsDeleteOfferConfirmOpen(false); setOfferToDelete(null); }}
        onConfirm={() => offerToDelete && handleDeleteOffer(offerToDelete)}
        title="Excluir Oferta"
        message="Tem certeza que deseja excluir esta oferta?"
        confirmText="Excluir"
        cancelText="Cancelar"
      />
      <EmployeeSurveyModal />
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-md" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}

function PrivateApp() {
  const { user, loading, errorMsg } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div><p className="text-gray-500 dark:text-gray-400 text-sm">Carregando autenticação...</p></div>;
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6">
        <div className="bg-gray-200 dark:bg-white/10 border border-red-500/30 p-6 rounded-2xl max-w-md text-center">
          <h2 className="text-red-400 font-semibold mb-2">Erro de Autenticação</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{errorMsg}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:bg-white/20 text-gray-900 dark:text-white rounded-xl transition-colors text-sm">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <UIProvider>
      <CRMProvider>
        <CRMInner />
      </CRMProvider>
    </UIProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {!isFirebaseConfigured && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white p-4 text-center font-bold shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle size={20} />
            <span>Firebase não configurado! Adicione as chaves no painel.</span>
          </div>
        </div>
      )}
      <Toaster position="top-right" theme="dark" />
      <Analytics />
      <DialogProvider>
        <AuthProvider>
          <Routes>
            <Route path="/cliente/:orgId/:clientId" element={<ClientPortal />} />
            <Route path="/onboarding/:orgId" element={<OnboardingForm />} />
            <Route path="/onboarding/:orgId/:clientId" element={<OnboardingForm />} />
            <Route path="/contrato/:orgId/:clientId/:contractId" element={<ContractSignView />} />
            <Route path="/contratar/:orgId" element={<PublicCheckoutPage />} />
            <Route path="/convite/:token" element={<AcceptInviteView />} />
            <Route path="*" element={<PrivateApp />} />
          </Routes>
        </AuthProvider>
      </DialogProvider>
    </BrowserRouter>
  );
}
// Trigger redeploy v2.6.1 - Clean State UTF-8
