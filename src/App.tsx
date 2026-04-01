import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Plus, X, DollarSign, CheckCircle, Clock, 
  MapPin, Phone, Tag, Menu, Building2, FileText, Briefcase, AlignLeft,
  Search, BarChart3, Calendar, Paperclip, Copy, MessageCircle, Trash2, Snowflake, LogOut, Globe, Image as ImageIcon, Sparkles, Wand2, Star, Zap,
  Filter, ArrowDownAZ, ArrowUpRight, RefreshCw, Download, Link as LinkIcon, AlertTriangle, TrendingDown, TrendingUp, Settings, MessageSquare,
  Megaphone, Pin, ShoppingCart, Eye, EyeOff, Package, Edit2, Map as MapIcon, Loader2
} from 'lucide-react';
import { auth, db, isFirebaseConfigured } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc, query, where, getDocs, addDoc } from 'firebase/firestore';
import Auth from './components/Auth';
import CalendarView from './components/CalendarView';
import MonitoringView from './components/MonitoringView';
import ClientMapView from './components/ClientMapView';
import { toast } from 'sonner';
import { z } from 'zod';
import { clientSchema, Client, Offer, ClientLog, ClientAttachment, ClientStage, ClientCredential, OnboardingQuestion, Expense, PlanType, SiteStatus } from './types';
import { delay, getSetupPrice, getPlanPrice, calculateDiscount, updateReferrerSubscription } from './helpers';

export type { PlanType, SiteStatus, ClientLog, ClientAttachment, ClientStage, ClientCredential, Offer, Client, OnboardingQuestion, Expense } from './types';
export { clientSchema } from './types';
export { getSetupPrice, getPlanPrice, calculateDiscount, updateReferrerSubscription } from './helpers';

import ConfirmationModal from './components/ConfirmationModal';
import OfferModal from './components/OfferModal';
import ClientModal from './components/ClientModal';
import ReferralsView from './components/ReferralsView';

import DashboardView from './views/DashboardView';
import AnalyticsView from './views/AnalyticsView';
import FinanceView from './views/FinanceView';
import SupportView from './views/SupportView';
import MarketingView from './views/MarketingView';
import ProductsView from './views/ProductsView';
import SettingsView from './views/SettingsView';

import { CRMProvider, useCRM, CRMView } from './contexts/CRMContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ClientPortal from './components/ClientPortal';
import OnboardingForm from './components/OnboardingForm';
import ContractSignView from './views/ContractSignView';
import { Toaster } from 'sonner';

function CRMInner() {
  const {
    user, clients, offers, supportRequests, loading, errorMsg,
    view, setView, sidebarOpen, setSidebarOpen,
    isModalOpen, setIsModalOpen, editingClient, setEditingClient,
    isOfferModalOpen, setIsOfferModalOpen, editingOffer, setEditingOffer,
    isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen, offerToDelete, setOfferToDelete,
    searchTerm, setSearchTerm, onboardingQuestions,
    handleSaveClient, handleDeleteClient,
    handleSaveOffer, handleDeleteOffer, handleExportCSV
  } = useCRM();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0a0a0a] font-sans overflow-hidden text-gray-900 dark:text-gray-100 relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>

      <aside className={`w-64 bg-gray-900/20 dark:bg-black/40 backdrop-blur-3xl border-r border-gray-200 dark:border-white/10 flex flex-col transition-all duration-300 z-30 ${sidebarOpen ? 'translate-x-0 absolute inset-y-0 left-0' : '-translate-x-full absolute md:relative md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="https://i.imgur.com/2H9UPAW.png" alt="Hub central Logo" className="h-20 w-auto object-contain drop-shadow-lg" referrerPolicy="no-referrer" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">Hub central</h1>
          </div>
          <button className="md:hidden text-gray-500 hover:text-gray-900 dark:text-white shrink-0 ml-2" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <button onClick={() => { setView('dashboard'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><LayoutDashboard size={20} /><span className="font-medium">Dashboard</span></button>
          <button onClick={() => { setView('analytics'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'analytics' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><BarChart3 size={20} /><span className="font-medium">Analytics</span></button>
          <button onClick={() => { setView('support'); setSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${view === 'support' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}>
            <div className="flex items-center space-x-3">
              <MessageCircle size={20} />
              <span className="font-medium">Chamados</span>
            </div>
            {supportRequests.filter(r => r.status === 'aberto' || r.status === 'em_analise').length > 0 && (
              <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {supportRequests.filter(r => r.status === 'aberto' || r.status === 'em_analise').length}
              </span>
            )}
          </button>
          <button onClick={() => { setView('calendar'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'calendar' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Calendar size={20} /><span className="font-medium">Agenda</span></button>
          <button onClick={() => { setView('finance'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'finance' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><DollarSign size={20} /><span className="font-medium">Gestão de Custos</span></button>
          <button onClick={() => { setView('referrals'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'referrals' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Users size={20} /><span className="font-medium">Indicações</span></button>
          <button onClick={() => { setView('marketing'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'marketing' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Megaphone size={20} /><span className="font-medium">Avisos</span></button>
          <button onClick={() => { setView('products'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'products' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Package size={20} /><span className="font-medium">Produtos</span></button>
          <button onClick={() => { setView('monitoring'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'monitoring' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Globe size={20} /><span className="font-medium">Monitoramento</span></button>
          <button onClick={() => { setView('map'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'map' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><MapIcon size={20} /><span className="font-medium">Mapa</span></button>
          <button onClick={() => { setView('settings'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'settings' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Settings size={20} /><span className="font-medium">Configurações</span></button>
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
            {view === 'dashboard' && (
              <div className="flex items-center w-full max-w-xl relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input type="text" placeholder="Buscar por Nome, CPF, E-mail ou Status..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder-gray-500 shadow-inner" />
              </div>
            )}
            {view === 'analytics' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Métricas</h2>}
            {view === 'calendar' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agenda Central</h2>}
            {view === 'support' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chamados</h2>}
            {view === 'finance' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Gestão de Custos e Financeiro</h2>}
            {view === 'settings' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configurações</h2>}
            {view === 'referrals' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Programa de Indicações</h2>}
            {view === 'marketing' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Avisos</h2>}
            {view === 'products' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Produtos</h2>}
            {view === 'monitoring' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Monitoramento de Sites</h2>}
            {view === 'map' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mapa de Clientes</h2>}
          </div>
          <div className="flex items-center gap-3">
            {view === 'dashboard' && (
              <button onClick={handleExportCSV} className="hidden sm:flex items-center space-x-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-4 py-3 rounded-2xl transition-all font-medium shrink-0" title="Exportar para CSV">
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
            view === 'dashboard' ? <DashboardView /> : 
            view === 'analytics' ? <AnalyticsView /> : 
            view === 'calendar' ? <CalendarView clients={clients} onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} /> :
            view === 'finance' ? <FinanceView /> :
            view === 'referrals' ? <ReferralsView clients={clients} user={user} /> :
            view === 'marketing' ? <MarketingView /> :
            view === 'products' ? <ProductsView /> :
            view === 'monitoring' ? <MonitoringView clients={clients} /> :
            view === 'map' ? <ClientMapView clients={clients} onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} /> :
            view === 'settings' ? <SettingsView /> :
            <SupportView />
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

function CRM({ user }: { user: User }) {
  return (
    <CRMProvider user={user}>
      <CRMInner />
    </CRMProvider>
  );
}

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    try {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthLoading(false);
        clearTimeout(timeoutId);
      }, (error) => {
        console.error("Auth Error:", error);
        setAuthError(error.message);
        setAuthLoading(false);
        clearTimeout(timeoutId);
      });

      timeoutId = setTimeout(() => {
        setAuthLoading(false);
        setAuthError("O tempo limite de autenticação foi excedido.");
      }, 10000);

      return () => {
        unsubscribe();
        clearTimeout(timeoutId);
      };
    } catch (err: any) {
      console.error("Auth Init Error:", err);
      setAuthError(err.message);
      setAuthLoading(false);
    }
  }, []);

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div><p className="text-gray-500 dark:text-gray-400 text-sm">Carregando autenticação...</p></div>;
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="bg-gray-200 dark:bg-white/10 border border-red-500/30 p-6 rounded-2xl max-w-md text-center">
          <h2 className="text-red-400 font-semibold mb-2">Erro de Autenticação</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{authError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:bg-white/20 text-gray-900 dark:text-white rounded-xl transition-colors text-sm">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return <CRM user={user} />;
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
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cliente/:userId/:clientId" element={<ClientPortal />} />
        <Route path="/onboarding/:userId" element={<OnboardingForm />} />
        <Route path="/onboarding/:userId/:clientId" element={<OnboardingForm />} />
        <Route path="/contrato/:userId/:clientId/:contractId" element={<ContractSignView />} />
      </Routes>
    </BrowserRouter>
  );
}

// Trigger Vercel Deploy
