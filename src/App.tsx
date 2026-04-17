/** Intranet Hub Symples - Gestão Interna (Build Test: Vercel Limits Check) */
import React, { useMemo } from 'react';
import {
  LayoutDashboard, Users, Plus, X, DollarSign,
  Search, BarChart3, Calendar, MessageCircle, Globe,
  Download, AlertTriangle, Settings,
  Megaphone, Package, Map as MapIcon, Target, Menu, Bell, Shield, HeartHandshake, BookOpen
} from 'lucide-react';
import { isFirebaseConfigured } from './lib/firebase';
import Auth from './components/Auth';
import CalendarView from './components/CalendarView';
import MonitoringView from './components/MonitoringView';
import ClientMapView from './components/ClientMapView';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

import BillingView from './views/BillingView';
import OnboardingHubView from './views/OnboardingHubView';
import ContractsView from './views/ContractsView';
import ProjectsView from './views/ProjectsView';

import ConfirmationModal from './components/ConfirmationModal';
import OfferModal from './components/OfferModal';
import ClientModal from './components/ClientModal';
import ReferralsView from './components/ReferralsView';
import NavItem from './components/NavItem';

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
import EmployeeSurveyModal from './components/EmployeeSurveyModal';
import WikiView from './views/WikiView';
import WaitingInviteView from './views/WaitingInviteView';


import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { CRMProvider, useCRM } from './contexts/CRMContext';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import ClientPortal from './components/ClientPortal';
import OnboardingForm from './components/OnboardingForm';
import ContractSignView from './views/ContractSignView';
import PublicCheckoutPage from './components/PublicCheckoutPage';

// ── Navigation Config 4.0 (Grupos Estratégicos) ──
const navGroups = [
  {
    label: 'Comercial & Crescimento',
    icon: Target,
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Target, label: 'Funil de Vendas', path: '/leads', roles: ['Administrador', 'Gerente', 'SDR', 'Executive'] },
      { icon: Package, label: 'Produtos', path: '/products', roles: ['Administrador', 'Gerente', 'SDR', 'Executive', 'Customer Success', 'Onboarding Specialist'] },
      { icon: Users, label: 'Hub Rewards', path: '/referrals' },
      { icon: Megaphone, label: 'Marketing', path: '/marketing', roles: ['Administrador', 'Gerente', 'Revenue Operations'] },
    ]
  },
  {
    label: 'Operação & Sucesso',
    icon: Rocket,
    items: [
      { icon: Calendar, label: 'Agenda Central', path: '/calendar', roles: ['Administrador', 'Gerente', 'Customer Success', 'Suporte Técnico', 'Onboarding Specialist'] },
      { icon: MessageCircle, label: 'Meus Chamados', path: '/support' },
      { icon: Rocket, label: 'Onboarding Hub', path: '/onboarding-hub', roles: ['Administrador', 'Gerente', 'People & Culture', 'Onboarding Specialist', 'Customer Success'] },
      { icon: Globe, label: 'Monitoramento', path: '/monitoring', roles: ['Administrador', 'Gerente', 'Suporte Técnico'] },
      { icon: MapIcon, label: 'Mapa', path: '/map' },
      { icon: Layout, label: 'Projetos / Produção', path: '/projects', roles: ['Administrador', 'Gerente', 'Suporte Técnico', 'Onboarding Specialist'] },
    ]
  },
  {
    label: 'Financeiro & RevOps',
    icon: DollarSign,
    items: [
      { icon: CreditCard, label: 'Cobrança', path: '/billing', roles: ['Administrador', 'Gerente', 'FinOps', 'Gestor de Faturamento', 'SDR', 'Executive'] },
      { icon: DollarSign, label: 'Financeiro Estratégico', path: '/finance', roles: ['Administrador', 'Gerente', 'FinOps', 'Controladoria', 'Revenue Operations'] },
      { icon: Shield, label: 'Contratos', path: '/contracts', roles: ['Administrador', 'Gerente', 'People & Culture', 'FinOps', 'Controladoria'] },
      { icon: BarChart3, label: 'Analytics', path: '/analytics', roles: ['Administrador', 'Gerente'] },
    ]
  },
  {
    label: 'Pessoas & Cultura',
    icon: HeartHandshake,
    items: [
      { icon: HeartHandshake, label: 'People & Feedback', path: '/people', roles: ['Administrador', 'Gerente', 'People & Culture'] },
      { icon: Users, label: 'Equipe', path: '/team', roles: ['Administrador', 'Gerente', 'People & Culture'] },
      { icon: BookOpen, label: 'Wiki Hub', path: '/wiki' },
    ]
  },
  {
    label: 'Sistema',
    icon: Settings,
    items: [
      { icon: Bell, label: 'Notificações', path: '/notifications' },
      { icon: Settings, label: 'Configurações', path: '/settings' },
    ]
  }
];

function CRMInner() {
  const { user, userProfile, isBirthday, unreadAlertsCount } = useAuth();
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
    searchTerm, setSearchTerm, filterStatus, sortBy, filterTagId 
  } = useUI();
  
  const filteredClientsForExport = useFilteredClients(clients, searchTerm, filterStatus, sortBy, filterTagId);
  const location = useLocation();
  const currentPath = location.pathname;

  const openTicketCount = useMemo(() => supportRequests.filter(r => r.status === 'aberto' || r.status === 'em_analise').length, [supportRequests]);

  const newWikiCount = useMemo(() => {
    if (!userProfile?.viewedWikiArticles) return wikiArticles.length;
    return wikiArticles.filter(art => !userProfile.viewedWikiArticles?.includes(art.id)).length;
  }, [wikiArticles, userProfile?.viewedWikiArticles]);

  const titleCount = useMemo(() => {
    return unreadAlertsCount + openTicketCount + (['Administrador', 'Gerente', 'People & Culture'].includes(userProfile?.role || '') ? (pendingVacationsCount || 0) : 0) + newWikiCount;
  }, [unreadAlertsCount, openTicketCount, pendingVacationsCount, newWikiCount, userProfile?.role]);

  React.useEffect(() => {
    if (titleCount > 0) {
      document.title = `(${titleCount}) Hub Central`;
    } else {
      document.title = 'Hub Central';
    }
  }, [titleCount]);

  if (userProfile?.orgId === 'pending') {
    return <WaitingInviteView />;
  }

  return (
    <div className="flex h-screen bg-[#030712] font-sans overflow-hidden text-gray-900 dark:text-gray-100 relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>

      {isBirthday && <BirthdayCelebration uid={user?.uid} />}

      {currentPath !== '/wiki' && (
        <aside 
          translate="no"
          className={`w-64 bg-gray-900/20 dark:bg-black/40 backdrop-blur-3xl border-r border-gray-200 dark:border-white/10 flex flex-col transition-all duration-300 z-30 ${sidebarOpen ? 'translate-x-0 absolute inset-y-0 left-0' : '-translate-x-full absolute md:relative md:translate-x-0'}`}
          aria-label="Menu Lateral de Navegação"
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="https://i.imgur.com/EFBaYb5.png" alt="Hub Symples Logo" className="h-12 w-auto object-contain drop-shadow-lg" referrerPolicy="no-referrer" />
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">Hub Central</h1>
            </div>
            <button 
              className="md:hidden text-gray-500 hover:text-gray-900 dark:text-white shrink-0 ml-2" 
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu lateral"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar" role="navigation" aria-label="Navegação Principal">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter(item => !item.roles || (userProfile?.role && item.roles.includes(userProfile.role)));
              if (visibleItems.length === 0) return null;
              
              return (
                <div key={group.label} className="space-y-3">
                  <div className="flex items-center gap-2 px-4 mb-2">
                    <group.icon size={12} className="text-gray-500/50" />
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-gray-500/50 select-none">{group.label}</span>
                  </div>
                  <div className="space-y-1">
                    {visibleItems.map(item => (
                      <NavItem
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                        onClick={() => setSidebarOpen(false)}
                        badge={
                          item.path === '/leads' ? activeLeadsCount : 
                          item.path === '/support' ? openTicketCount : 
                          item.path === '/wiki' ? (newWikiCount > 0 ? newWikiCount : undefined) :
                          item.path === '/people' ? (pendingVacationsCount > 0 ? pendingVacationsCount : undefined) :
                          undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
          

          <div className="p-4 border-t border-gray-200 dark:border-white/10" role="complementary" aria-label="Perfil do Usuário">
            <div 
              onClick={() => navigate(`/profile/${user?.uid}`)}
              className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 transition-all group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/profile/${user?.uid}`)}
              aria-label={`Acessar perfil de ${userProfile?.displayName || user?.displayName || 'Usuário'}`}
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-gray-900 dark:text-white font-bold shrink-0 shadow-lg shadow-primary-500/20 overflow-hidden">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                    ) : (
                      (userProfile?.displayName || user?.displayName || user?.email || 'U')[0].toUpperCase()
                    )}
                  </div>
                  {isBirthday && (
                    <span className="absolute -top-3 -right-3 text-3xl animate-bounce pointer-events-none" title="Aniversariante do Dia! 🎉">🎉</span>
                  )}
                  {unreadAlertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-lg animate-pulse">
                      {unreadAlertsCount}
                    </span>
                  )}
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-primary-500 transition-colors">{userProfile?.displayName || user?.displayName || 'Usuário'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfile?.jobTitle || userProfile?.role || 'Membro'}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
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
            {currentPath === '/' && (
              <div className="flex items-center w-full max-w-xl relative" role="search">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                <input 
                  type="text" 
                  placeholder="Buscar por Nome, CPF, E-mail ou Status..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder-gray-500 shadow-inner" 
                  aria-label="Campo de busca de clientes"
                />
              </div>
            )}
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
            {currentPath === '/' && ['Administrador', 'Gerente', 'SDR', 'Executive', 'Customer Success', 'Suporte Técnico', 'Onboarding Specialist'].includes(userProfile?.role || '') && (
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
                <Route path="/notifications" element={<NotificationsView />} />
                <Route path="/calendar" element={<CalendarView role={userProfile?.role} clients={clients} onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} />} />
                <Route path="/referrals" element={<ReferralsView clients={clients} user={user!} />} />
                <Route path="/products" element={<ProductsView />} />
                <Route path="/monitoring" element={<MonitoringView clients={clients} />} />
                <Route path="/map" element={<ClientMapView clients={clients} onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} />} />
                <Route path="/billing" element={<BillingView />} />
                <Route path="/onboarding-hub" element={<OnboardingHubView />} />
                <Route path="/contracts" element={<ContractsView />} />
                <Route path="/projects" element={<ProjectsView />} />
                
                {/* Rotas Protegidas (Conforme Roles Definidas no navItems) */}
                <Route path="/analytics" element={(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'FinOps' || userProfile?.role === 'Controladoria') ? <AnalyticsView /> : <DashboardView />} />
                <Route path="/finance" element={(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || ['FinOps', 'Controladoria', 'Revenue Operations'].includes(userProfile?.role || '')) ? <FinanceView /> : <DashboardView />} />
                <Route path="/marketing" element={(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'Revenue Operations') ? <MarketingView /> : <DashboardView />} />
                <Route path="/team" element={(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'People & Culture') ? <TeamManagementView /> : <DashboardView />} />
                <Route path="/people" element={(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'People & Culture') ? <PeopleView /> : <DashboardView />} />
                <Route path="/wiki" element={<WikiView />} />
                <Route path="/settings" element={<SettingsView />} />
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
    </BrowserRouter>
  );
}
// Trigger redeploy v2.6.1 - Clean State UTF-8
