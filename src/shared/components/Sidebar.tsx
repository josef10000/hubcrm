import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Globe, Clock, Coffee, Circle, User, LogOut, Users } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { useGlobalChatAlerts } from '@/hooks/useGlobalChatAlerts';
import NavItem from './NavItem';
import AvatarFrame from './AvatarFrame';
import { navGroups } from '@/constants/navigation';
import { usePresence } from '@/hooks/usePresence';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';


// Mapeador de Ícones Premium (Phosphor Duotone)
export const PremiumIcon = ({ iconName, size = 22, className = "" }: { iconName: string, size?: number, className?: string }) => {
  const mapping: Record<string, string> = {
    'Target': 'ph-target',
    'LayoutDashboard': 'ph-house',
    'Package': 'ph-package',
    'Users': 'ph-users-three',
    'Megaphone': 'ph-megaphone',
    'Calendar': 'ph-calendar-blank',
    'MessageCircle': 'ph-chats-circle',
    'Rocket': 'ph-rocket',
    'Globe': 'ph-globe',
    'LayoutTemplate': 'ph-layout',
    'Map': 'ph-map-trifold',
    'Layout': 'ph-kanban',
    'CreditCard': 'ph-credit-card',
    'DollarSign': 'ph-currency-circle-dollar',
    'Shield': 'ph-shield-checkered',
    'BarChart3': 'ph-chart-bar',
    'HeartHandshake': 'ph-hand-heart',
    'BookOpen': 'ph-book-open-text',
    'Settings': 'ph-gear-six',
    'Bell': 'ph-bell',
    'ShieldCheck': 'ph-shield-check',
    'Star': 'ph-star',
    'Search': 'ph-magnifying-glass',
    'X': 'ph-x-circle',
    'Zap': 'ph-lightning'
  };

  const phClass = mapping[iconName] || 'ph-question';
  
  return (
    <i 
      className={`ph-duotone ${phClass} ${className}`} 
      style={{ fontSize: `${size}px`, filter: className.includes('text-primary') || className.includes('text-amber') ? 'drop-shadow(0 0 8px currentColor)' : 'none' }} 
    />
  );
};

const isValidPhotoURL = (url: any) => {
  return url && 
         typeof url === 'string' && 
         url.trim() !== '' && 
         url !== 'undefined' && 
         url !== 'null' && 
         (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'));
};

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, userProfile, unreadAlertsCount, isBirthday } = useAuth();
  const { sidebarOpen, setSidebarOpen, pinnedItems } = useUI();
  const { supportRequests = [], wikiArticles = [], pendingVacationsCount = 0 } = useCRM();
  const { hasPermission } = usePermissions();
  const { totalUnread: chatUnreadCount } = useGlobalChatAlerts();
  
  const { manualSetStatus } = usePresence();
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fecha o menu de status se o usuário clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        avatarMenuRef.current && 
        !avatarMenuRef.current.contains(target) && 
        (!popoverRef.current || !popoverRef.current.contains(target))
      ) {
        setStatusMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cores de status reativas
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
      case 'away': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
      case 'lunch': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]';
      case 'meeting': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]';
      default: return 'bg-gray-500';
    }
  };

  const statuses = [
    { id: 'online', label: 'Online', color: 'bg-emerald-500', icon: <Globe size={14} /> },
    { id: 'away', label: 'Ausente', color: 'bg-amber-500', icon: <Clock size={14} /> },
    { id: 'lunch', label: 'Almoço', color: 'bg-rose-500', icon: <Coffee size={14} /> },
    { id: 'meeting', label: 'Em Reunião', color: 'bg-blue-500', icon: <Users size={14} /> },
    { id: 'offline', label: 'Offline', color: 'bg-gray-500', icon: <Circle size={14} /> },
  ];

  // Estado local para o tema Dark/Light
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Estado para o menu Flyout
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Contadores para badges
  const openTicketCount = useMemo(() => (supportRequests || []).filter(r => r.status === 'aberto' || r.status === 'em_analise').length, [supportRequests]);
  const newWikiCount = useMemo(() => {
    if (!userProfile?.viewedWikiArticles) return (wikiArticles || []).length;
    return (wikiArticles || []).filter(art => !userProfile.viewedWikiArticles?.includes(art.id)).length;
  }, [wikiArticles, userProfile?.viewedWikiArticles]);

  const getBadgeForPath = (path: string) => {
    if (path === '/support') return openTicketCount;
    if (path === '/chat') return chatUnreadCount > 0 ? chatUnreadCount : undefined;
    if (path === '/wiki') return newWikiCount > 0 ? newWikiCount : undefined;
    if (path === '/people') return pendingVacationsCount > 0 ? pendingVacationsCount : undefined;
    return undefined;
  };

  const pinnedNavItems = useMemo(() => {
    const allItems = navGroups.flatMap(g => g.items);
    return allItems.filter(item => pinnedItems.includes(item.path));
  }, [pinnedItems]);

  const visibleGroups = useMemo(() => {
    return navGroups.map(group => ({
      ...group,
      items: group.items.filter(item => !item.permission || hasPermission(item.permission as any)),
      totalBadges: group.items.reduce((acc, item) => acc + (getBadgeForPath(item.path) || 0), 0)
    })).filter(g => g.items.length > 0);
  }, [hasPermission, openTicketCount, chatUnreadCount, newWikiCount, pendingVacationsCount]);

  const activeGroupData = useMemo(() => {
    if (activeGroupId === 'favorites') return { label: 'Favoritos', items: pinnedNavItems };
    return visibleGroups.find(g => g.id === activeGroupId);
  }, [activeGroupId, visibleGroups, pinnedNavItems]);

  const handleMouseEnter = (groupId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveGroupId(groupId);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveGroupId(null);
    }, 300);
  };

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-md" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MINI SIDEBAR PREMIUM GLASS */}
      <aside
        translate="no"
        className={`fixed inset-y-0 left-0 z-50 flex h-full transition-all duration-500 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } p-3`}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative w-20 bg-[#05070a]/60 backdrop-blur-[40px] border border-white/10 rounded-[2.5rem] flex flex-col items-center py-6 gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden">
          {/* Grain Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]" />
          
          <div className="relative z-10 mb-4">
            <img 
              src="https://i.imgur.com/zCvL7xy.png" 
              alt="Logo" 
              className="h-10 w-auto cursor-pointer hover:scale-110 transition-transform duration-500" 
              onClick={() => navigate('/')}
            />
          </div>

          <div className="relative z-10 flex-1 flex flex-col gap-2.5 items-center w-full px-2 pb-4 overflow-y-auto overflow-x-hidden no-scrollbar">
            {/* Gatilho Favoritos */}
            <button
              onMouseEnter={() => handleMouseEnter('favorites')}
              className={`p-3 rounded-2xl transition-all duration-300 relative group ${
                activeGroupId === 'favorites' 
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.25)]' 
                : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <PremiumIcon 
                iconName="Star" 
                className={activeGroupId === 'favorites' || pinnedNavItems.length > 0 ? 'text-amber-500' : ''} 
              />
              {pinnedNavItems.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border border-[#05070a]" />
              )}
            </button>

            <div className="w-8 h-[1px] bg-white/10 my-2" />

            {/* Gatilhos dos Pilares */}
            {visibleGroups.map((group) => (
              <button
                key={group.id}
                onMouseEnter={() => handleMouseEnter(group.id)}
                className={`p-3 rounded-2xl transition-all duration-300 relative group ${
                  activeGroupId === group.id 
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-[0_0_25px_rgba(var(--primary-rgb),0.25)]' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <PremiumIcon iconName={group.icon.name || group.icon.displayName || 'Target'} />
                {group.totalBadges > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-[#05070a] animate-pulse" />
                )}
                
                {/* Tooltip Mini Cyber */}
                <div className="absolute left-full ml-5 px-3 py-1.5 bg-[#0a0c10] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-2 group-hover:translate-x-0 z-50 border border-white/10 shadow-2xl backdrop-blur-xl">
                  {group.label}
                </div>
              </button>
            ))}
          </div>

          <div ref={avatarMenuRef} className="relative z-10 mt-auto flex flex-col items-center gap-4">
            <div 
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className="relative cursor-pointer group"
            >
              <AvatarFrame size="md">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-gray-900 font-bold shrink-0 shadow-lg overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
                  {isValidPhotoURL(userProfile?.photoURL) ? (
                    <img src={userProfile!.photoURL} alt={userProfile?.displayName || 'Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    (userProfile?.displayName || user?.displayName || 'U')[0].toUpperCase()
                  )}
                </div>
              </AvatarFrame>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#05070a] shadow-lg transition-colors duration-300 ${
                getStatusColor(userProfile?.presenceStatus || 'offline')
              }`} />
            </div>

            {/* Menu Popover Flutuante de Presença (Status Rápido) */}
            <AnimatePresence>
              {statusMenuOpen && createPortal(
                <motion.div
                  ref={popoverRef}
                  initial={{ opacity: 0, scale: 0.95, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="fixed left-24 bottom-6 w-64 bg-[#05070a]/90 backdrop-blur-[30px] border border-white/10 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-[100] flex flex-col gap-3"
                >
                  {/* Cabeçalho do Popover */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-gray-900 font-bold shrink-0 overflow-hidden border border-white/10">
                      {isValidPhotoURL(userProfile?.photoURL) ? (
                        <img src={userProfile!.photoURL} alt={userProfile?.displayName || 'Avatar'} className="w-full h-full object-cover" />
                      ) : (
                        (userProfile?.displayName || user?.displayName || 'U')[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-bold text-white truncate">{userProfile?.displayName}</p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">
                        {statuses.find(s => s.id === (userProfile?.presenceStatus || 'offline'))?.label || 'Offline'}
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-[1px] bg-white/10" />

                  {/* Lista de Status Rápidos */}
                  <div className="flex flex-col gap-1">
                    {statuses.map((status) => {
                      const isActive = userProfile?.presenceStatus === status.id || (!userProfile?.presenceStatus && status.id === 'offline');
                      return (
                        <button
                          key={status.id}
                          onClick={() => {
                            manualSetStatus(status.id as any);
                            setStatusMenuOpen(false);
                            toast.success(`Status alterado para ${status.label}`);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                            isActive 
                              ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
                          <span className="flex-1 text-left">{status.label}</span>
                          <span className="opacity-60">{status.icon}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="w-full h-[1px] bg-white/10" />

                  {/* Ações do Rodapé */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setStatusMenuOpen(false);
                        navigate(`/profile/${user?.uid || userProfile?.uid || userProfile?.id}`);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent text-left"
                    >
                      <User size={14} />
                      <span>Ver Perfil</span>
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          setStatusMenuOpen(false);
                          await signOut(auth);
                          navigate('/');
                        } catch (e) {
                          toast.error('Erro ao sair da conta.');
                        }
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all border border-transparent text-left"
                    >
                      <LogOut size={14} />
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                </motion.div>,
                document.body
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* SUBMENU FLYOUT PREMIUM GLASS */}
        <AnimatePresence>
          {activeGroupId && activeGroupData && (
            <motion.div
              initial={{ opacity: 0, x: -30, scale: 0.9, rotateY: -10 }}
              animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, x: -20, scale: 0.95, rotateY: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
              onMouseLeave={handleMouseLeave}
              className="fixed left-28 top-6 bottom-6 w-72 bg-[#0a0c10]/70 backdrop-blur-[45px] border border-white/15 rounded-[2.5rem] p-8 z-[60] shadow-[40px_0_80px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
            >
              {/* Grain Texture Overlay */}
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]" />
              
              <div className="relative z-10 mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-500/60 mb-2">Workspace</h3>
                <h2 className="text-2xl font-black text-white tracking-tight leading-none">{activeGroupData.label}</h2>
              </div>

              <div className="relative z-10 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden no-scrollbar pr-2">
                {activeGroupData.items.map(item => (
                  <NavItem
                    key={`${activeGroupId}-${item.path}`}
                    icon={item.icon}
                    label={item.label}
                    path={item.path}
                    onClick={() => {
                      setActiveGroupId(null);
                      setSidebarOpen(false);
                    }}
                    badge={getBadgeForPath(item.path)}
                  />
                ))}
                {activeGroupId === 'favorites' && pinnedNavItems.length === 0 && (
                  <div className="py-20 text-center opacity-20">
                    <Star size={48} className="mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.3em]">Vault Vazio</p>
                  </div>
                )}
              </div>

              <div className="relative z-10 mt-auto pt-6 text-[9px] text-gray-500 uppercase tracking-[0.5em] font-black text-center opacity-40">
                Hub CRM Core v6.1
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </>
  );
}
