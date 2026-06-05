import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Bell,
  Calendar,
  DollarSign,
  Lock
} from 'lucide-react';
import { usePortalData } from '@/hooks/usePortalData';
import { toast, Toaster } from 'sonner';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Importando as views
import PortalHome from '../views/PortalHome';
import PortalFinance from '../views/PortalFinance';
import PortalServices from '../views/PortalServices';
import PortalDocuments from '../views/PortalDocuments';
import PortalSupport from '../views/PortalSupport';
import PortalAgenda from '../views/PortalAgenda';
import PortalCRMFinance from '../views/PortalCRMFinance';

export default function ClientPortalLayout() {
  const { orgId, clientId } = useParams<{ orgId: string; clientId: string }>();
  const navigate = useNavigate();
  const { 
    client, 
    allClients,
    activeClientId,
    setActiveClientId,
    loading, 
    switching,
    error, 
    announcement, 
    paymentsHistory, 
    offers 
  } = usePortalData(orgId, clientId);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isClientAdmin, setIsClientAdmin] = useState(false);

  // Escuta autenticação para verificar se o usuário está logado como client_admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
          if (profileSnap.exists()) {
            const pData = profileSnap.data();
            const isAuthorized = 
              (pData.role === 'client_admin' && pData.orgId === orgId) ||
              (pData.role === 'admin' || pData.role === 'manager');
            
            setIsClientAdmin(isAuthorized);
          } else {
            setIsClientAdmin(false);
          }
        } catch (e) {
          console.error(e);
          setIsClientAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setIsClientAdmin(false);
      }
    });
    return () => unsub();
  }, [orgId]);

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'crm_finance', label: 'CRM Financeiro', icon: DollarSign },
    ...(client && !client.isCourtesy ? [
      { id: 'finance', label: 'Faturas Hub', icon: CreditCard },
      { id: 'services', label: 'Marketplace', icon: ShoppingBag }
    ] : []),
    { id: 'docs', label: 'Documentos', icon: Files },
    { id: 'support', label: 'Atendimento', icon: MessageCircle },
  ];

  const RenderLockScreen = ({ tabName }: { tabName: string }) => {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mb-6 border border-primary-500/20 shadow-lg shadow-primary-500/5">
          <Lock className="w-8 h-8 text-primary-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Área Restrita: {tabName}</h3>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Esta área contém informações administrativas e de agendamento reservadas para o dono da empresa. Faça login com suas credenciais do portal para acessar.
        </p>
        <button
          onClick={() => navigate('/portal/login')}
          className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary-500/20 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>Acessar com Login</span>
        </button>
      </div>
    );
  };

  if (loading && !client) {
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
        <div className="flex flex-col">
          <span className="text-[10px] text-primary-500 font-bold uppercase tracking-widest">Portal Hub</span>
          <h1 className="text-sm font-bold text-white">
            {navItems.find(i => i.id === activeTab)?.label}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative p-2 hover:bg-white/5 rounded-xl transition-colors">
            <Bell size={20} className="text-gray-400" />
            {announcement && <span className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full border-2 border-black" />}
          </button>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60] w-72 bg-black/40 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-10 lg:mb-12">
            <div className="flex items-center gap-3">
              <img 
                src="https://i.imgur.com/zCvL7xy.png" 
                alt="Hub Symples Logo" 
                className="w-10 h-10 object-contain drop-shadow-lg" 
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-none">Portal <span className="text-primary-500">Hub</span></span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-gray-400">
              <X size={20} />
            </button>
          </div>

          {/* Subscription Selector (Multi-Plan) */}
          {allClients.length > 1 && (
            <div className="mb-8">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 px-2">Suas Assinaturas</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                {allClients.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveClientId(sub.id)}
                    className={`
                      w-full flex flex-col items-start p-3 rounded-xl transition-all duration-300 border
                      ${activeClientId === sub.id 
                        ? 'bg-primary-500/10 border-primary-500/30 text-white' 
                        : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}
                    `}
                  >
                    <span className="text-xs font-bold truncate w-full text-left">{sub.plan}</span>
                    <span className="text-[10px] opacity-60 truncate w-full text-left">{sub.id.toUpperCase()}</span>
                    {activeClientId === sub.id && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-400 uppercase">Ativa Agora</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          <div className="mt-auto pt-6 border-t border-white/10 space-y-3">
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                {client.name.charAt(0)}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-semibold truncate text-sm">{client.name}</span>
                <span className="text-[10px] text-gray-500 truncate lowercase">{client.email}</span>
              </div>
            </div>
            {currentUser && (
              <button
                onClick={async () => {
                  try {
                    await auth.signOut();
                    toast.success('Você saiu da área restrita.');
                    setActiveTab('home');
                  } catch (e) {
                    toast.error('Erro ao sair.');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
              >
                <LogOut size={14} />
                Sair da Área Restrita
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pt-16 lg:pt-0 relative">
        {/* Switching Loader Overlay */}
        <AnimatePresence>
          {switching && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
            >
              <div className="flex flex-col items-center gap-3 bg-black/40 p-6 rounded-3xl border border-white/10 shadow-2xl">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full"
                />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sincronizando...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
        <div className="flex-1 overflow-y-auto px-4 lg:px-10 pb-32 lg:pb-10 custom-scrollbar relative">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeTab + activeClientId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {activeTab === 'home' && <PortalHome client={client} announcement={announcement} setActiveTab={setActiveTab} />}
              {activeTab === 'agenda' && (
                isClientAdmin ? (
                  <PortalAgenda orgId={orgId || ''} clientId={activeClientId || ''} />
                ) : (
                  <RenderLockScreen tabName="Agenda" />
                )
              )}
              {activeTab === 'crm_finance' && (
                isClientAdmin ? (
                  <PortalCRMFinance orgId={orgId || ''} clientId={activeClientId || ''} />
                ) : (
                  <RenderLockScreen tabName="CRM Financeiro" />
                )
              )}
              {activeTab === 'finance' && (
                <PortalFinance 
                  client={client} 
                  paymentsHistory={paymentsHistory} 
                  allClients={allClients}
                  activeClientId={activeClientId}
                  setActiveClientId={setActiveClientId}
                />
              )}
              {activeTab === 'services' && <PortalServices offers={offers} client={client} />}
              {activeTab === 'docs' && <PortalDocuments client={client} orgId={orgId || ''} />}
              {activeTab === 'support' && <PortalSupport client={client} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-2xl border-t border-white/10 z-50 flex items-center justify-around px-2">
        {navItems.filter(item => ['home', 'agenda', 'crm_finance', 'support'].includes(item.id)).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`
              flex flex-col items-center gap-1 p-2 transition-all duration-300 relative
              ${activeTab === item.id ? 'text-primary-500' : 'text-gray-500'}
            `}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
            {activeTab === item.id && (
              <motion.div 
                layoutId="activeIndicatorMobile"
                className="absolute -top-2 w-10 h-1 bg-primary-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
              />
            )}
          </button>
        ))}
      </nav>

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

