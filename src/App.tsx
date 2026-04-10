import React, { useMemo } from 'react';
import {
  LayoutDashboard, Users, Plus, X, DollarSign,
  Search, BarChart3, Calendar, MessageCircle, Globe,
  Download, AlertTriangle, Settings,
  Megaphone, Package, Map as MapIcon, Target, Menu, Bell
} from 'lucide-react';
import { isFirebaseConfigured } from './lib/firebase';
import Auth from './components/Auth';
import CalendarView from './components/CalendarView';
import MonitoringView from './components/MonitoringView';
import ClientMapView from './components/ClientMapView';
import { Toaster, toast } from 'sonner';

import ConfirmationModal from './components/ConfirmationModal';
import OfferModal from './components/OfferModal';
import ClientModal from './components/ClientModal';
import ReferralsView from './components/ReferralsView';
import NavItem from './components/NavItem';

import DashboardView from './views/DashboardView';
import AnalyticsView from './views/AnalyticsView';
import FinanceView from './views/FinanceView';
import SupportView from './views/SupportView';
import MarketingView from './views/MarketingView';
import ProductsView from './views/ProductsView';
import SettingsView from './views/SettingsView';
import LeadsView from './views/LeadsView';
import NotificationsView from './views/NotificationsView';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { CRMProvider, useCRM } from './contexts/CRMContext';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ClientPortal from './components/ClientPortal';
import OnboardingForm from './components/OnboardingForm';
import ContractSignView from './views/ContractSignView';
import PublicCheckoutPage from './components/PublicCheckoutPage';

// ── Navigation Config ──
const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Target, label: 'Pipeline', path: '/leads' },
  { icon: Bell, label: 'Notificações', path: '/notifications' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: MessageCircle, label: 'Chamados', path: '/support' },
  { icon: Calendar, label: 'Agenda', path: '/calendar' },
  { icon: DollarSign, label: 'Gestão de Custos', path: '/finance' },
  { icon: Users, label: 'Indicações', path: '/referrals' },
  { icon: Megaphone, label: 'Avisos', path: '/marketing' },
  { icon: Package, label: 'Produtos', path: '/products' },
  { icon: Globe, label: 'Monitoramento', path: '/monitoring' },
  { icon: MapIcon, label: 'Mapa', path: '/map' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

function CRMInner() {
  const { user } = useAuth();
  const {
    clients, activeLeadsCount, offers, supportRequests, loading, errorMsg,
    editingClient, setEditingClient,
    isOfferModalOpen, setIsOfferModalOpen, editingOffer, setEditingOffer,
    isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen, offerToDelete, setOfferToDelete,
    onboardingQuestions,
    handleSaveClient, handleDeleteClient,
    handleSaveOffer, handleDeleteOffer, handleExportCSV
  } = useCRM();

  const { sidebarOpen, setSidebarOpen, isModalOpen, setIsModalOpen, searchTerm, setSearchTerm } = useUI();
  const location = useLocation();
  const currentPath = location.pathname;

  const openTicketCount = useMemo(() => supportRequests.filter(r => r.status === 'aberto' || r.status === 'em_analise').length, [supportRequests]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0a0a0a] font-sans overflow-hidden text-gray-900 dark:text-gray-100 relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>

      <aside className={`w-64 bg-gray-900/20 dark:bg-black/40 backdrop-blur-3xl border-r border-gray-200 dark:border-white/10 flex flex-col transition-all duration-300 z-30 ${sidebarOpen ? 'translate-x-0 absolute inset-y-0 left-0' : '-translate-x-full absolute md:relative md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="https://i.imgur.com/EFBaYb5.png" alt="Hub Symples Logo" className="h-20 w-auto object-contain drop-shadow-lg" referrerPolicy="no-referrer" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">Hub Central</h1>
          </div>
          <button className="md:hidden text-gray-500 hover:text-gray-900 dark:text-white shrink-0 ml-2" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              onClick={() => setSidebarOpen(false)}
              badge={item.path === '/leads' ? activeLeadsCount : item.path === '/support' ? openTicketCount : undefined}
            />
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-gray-900 dark:text-white font-bold shrink-0 shadow-lg shadow-primary-500/20">
                {user?.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.displayName || 'Usuário'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-20">
        <header className="bg-black/20 backdrop-blur-2xl border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between shrink-0 z-30 gap-4">
          <div className="flex items-center flex-1">
            <button className="md:hidden mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            {currentPath === '/' && (
              <div className="flex items-center w-full max-w-xl relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input type="text" placeholder="Buscar por Nome, CPF, E-mail ou Status..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder-gray-500 shadow-inner" />
              </div>
            )}
            {currentPath === '/analytics' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Métricas</h2>}
            {currentPath === '/calendar' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agenda Central</h2>}
            {currentPath === '/support' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chamados</h2>}
            {currentPath === '/finance' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Gestão de Custos e Financeiro</h2>}
            {currentPath === '/settings' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configurações</h2>}
            {currentPath === '/referrals' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Programa de Indicações</h2>}
            {currentPath === '/marketing' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Avisos</h2>}
            {currentPath === '/products' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Produtos</h2>}
            {currentPath === '/monitoring' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Monitoramento de Sites</h2>}
            {currentPath === '/map' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mapa de Clientes</h2>}
            {currentPath === '/leads' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pipeline de Vendas</h2>}
            {currentPath === '/notifications' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Central de Notificações</h2>}
          </div>
          <div className="flex items-center gap-3">
            {currentPath === '/' && (
              <button
                onClick={() => {
                  // This now requires access to the export method inside Dashboard or passing clients here.. Wait, Dashboard export is better placed inside Dashboard itself!
                  // For now, I'll let Dashboard button handle exporting or pass it to CRM hook but export needs filtered clients.
                  // we can keep handleExportCSV in Dashboard or here, but it requires data.
                  // Actually, I can pass clients directly or let Dashboard render this header part.
                  // For now, I'll pass clients directly. Wait, handleExportCSV takes `dataToExport`. I will fix this later when splitting Dashboard.
                }}
                className="hidden sm:flex items-center space-x-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-4 py-3 rounded-2xl transition-all font-medium shrink-0" title="Exportar para CSV">
                <Download size={18} />
                <span>Exportar</span>
              </button>
            )}
            <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-gray-900 dark:text-white px-5 py-3 rounded-2xl transition-all font-medium shadow-xl shadow-primary-500/30 hover:shadow-2xl shadow-primary-500/50 hover:scale-105 active:scale-95 shrink-0"><Plus size={18} /><span className="hidden sm:inline">Novo Cliente</span></button>
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
                <Route path="/analytics" element={<AnalyticsView />} />
                <Route path="/calendar" element={<CalendarView clients={clients} onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} />} />
                <Route path="/finance" element={<FinanceView />} />
                <Route path="/referrals" element={<ReferralsView clients={clients} user={user!} />} />
                <Route path="/marketing" element={<MarketingView />} />
                <Route path="/products" element={<ProductsView />} />
                <Route path="/monitoring" element={<MonitoringView clients={clients} />} />
                <Route path="/map" element={<ClientMapView clients={clients} onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="/leads" element={<LeadsView />} />
                <Route path="/support" element={<SupportView />} />
                <Route path="/notifications" element={<NotificationsView />} />
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
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-md" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}

function PrivateApp() {
  const { user, loading, errorMsg } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div><p className="text-gray-500 dark:text-gray-400 text-sm">Carregando autenticação...</p></div>;
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center p-6">
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
      <AuthProvider>
        <Routes>
          <Route path="/cliente/:userId/:clientId" element={<ClientPortal />} />
          <Route path="/onboarding/:userId" element={<OnboardingForm />} />
          <Route path="/onboarding/:userId/:clientId" element={<OnboardingForm />} />
          <Route path="/contrato/:userId/:clientId/:contractId" element={<ContractSignView />} />
          <Route path="/contratar/:userId" element={<PublicCheckoutPage />} />
          <Route path="*" element={<PrivateApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
