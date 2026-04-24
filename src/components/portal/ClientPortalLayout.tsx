import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  CreditCard, 
  ShoppingBag, 
  Files, 
  MessageCircle, 
  LogOut, 
  Menu, 
  X,
  Bell
} from 'lucide-react';
import { usePortalData } from '../../hooks/usePortalData';
import { Toaster } from 'sonner';

// Importando as views
import PortalHome from './views/PortalHome';
import PortalFinance from './views/PortalFinance';
import PortalServices from './views/PortalServices';
import PortalDocuments from './views/PortalDocuments';
import PortalSupportChat from './views/PortalSupportChat';

export default function ClientPortalLayout() {
  const { orgId, clientId } = useParams<{ orgId: string; clientId: string }>();
  const { client, loading, error, announcement } = usePortalData(orgId, clientId);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'finance', label: 'Financeiro', icon: CreditCard },
    { id: 'services', label: 'Marketplace', icon: ShoppingBag },
    { id: 'docs', label: 'Documentos', icon: Files },
    { id: 'support', label: 'Atendimento', icon: MessageCircle },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-400 font-medium animate-pulse">Preparando seu portal premium...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="bg-white/5 backdrop-blur-xl border border-red-500/20 p-8 rounded-3xl max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Acesso Negado</h2>
          <p className="text-gray-400 text-sm mb-6">{error || "Não foi possível carregar os dados do portal."}</p>
          <button onClick={() => window.location.reload()} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex overflow-hidden font-sans">
      <Toaster position="top-right" theme="dark" />
      
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-xl border-b border-white/10 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <span className="font-bold tracking-tight">Portal <span className="text-primary-500">Premium</span></span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60] w-72 bg-black/40 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-10 lg:mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                <LayoutDashboard size={22} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-none">Hub<span className="text-primary-500">CRM</span></span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Portal do Cliente</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-gray-400">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group
                  ${activeTab === item.id 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                `}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'group-hover:text-primary-400 transition-colors'} />
                <span className="font-medium">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center font-bold text-sm">
                {client.name.charAt(0)}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-semibold truncate text-sm">{client.name}</span>
                <span className="text-[10px] text-gray-500 truncate lowercase">{client.email}</span>
              </div>
            </div>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-400 transition-colors group">
              <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
              <span className="font-medium text-sm">Sair do Portal</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pt-16 lg:pt-0 relative">
        {/* Top Header (Desktop) */}
        <header className="hidden lg:flex items-center justify-between px-10 h-24 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mt-1">
              Seja bem-vindo, {client.name.split(' ')[0]}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group">
              <Bell size={20} className="text-gray-400 group-hover:text-white" />
              {announcement && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-[#050505]" />}
            </button>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Status do Plano</span>
              <span className={`text-xs font-bold ${client.status === 'Ativo' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {client.status}
              </span>
            </div>
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {activeTab === 'home' && <PortalHome client={client} announcement={announcement} />}
              {activeTab === 'finance' && <PortalFinance client={client} paymentsHistory={paymentsHistory} />}
              {activeTab === 'services' && <PortalServices offers={offers} />}
              {activeTab === 'docs' && <PortalDocuments />}
              {activeTab === 'support' && <PortalSupportChat client={client} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
