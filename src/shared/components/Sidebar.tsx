import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { useGlobalChatAlerts } from '@/hooks/useGlobalChatAlerts';
import NavItem from './NavItem';
import AvatarFrame from './AvatarFrame';
import { navGroups } from '@/constants/navigation';

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
    'X': 'ph-x-circle'
  };

  const phClass = mapping[iconName] || 'ph-question';
  
  return (
    <i 
      className={`ph-duotone ${phClass} ${className}`} 
      style={{ fontSize: `${size}px`, filter: className.includes('text-primary') || className.includes('text-amber') ? 'drop-shadow(0 0 8px currentColor)' : 'none' }} 
    />
  );
};

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, userProfile, unreadAlertsCount, isBirthday } = useAuth();
  const { sidebarOpen, setSidebarOpen, pinnedItems } = useUI();
  const { activeLeadsCount = 0, supportRequests = [], wikiArticles = [], pendingVacationsCount = 0 } = useCRM();
  const { hasPermission } = usePermissions();
  const { totalUnread: chatUnreadCount } = useGlobalChatAlerts();

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
    if (path === '/leads') return activeLeadsCount;
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
  }, [hasPermission, activeLeadsCount, openTicketCount, chatUnreadCount, newWikiCount, pendingVacationsCount]);

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
              src="https://i.imgur.com/EFBaYb5.png" 
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

          {/* Perfil Mini no Rodapé */}
          <div className="relative z-10 mt-auto">
            <div 
              onClick={() => navigate(`/profile/${user?.uid}`)}
              className="relative cursor-pointer group"
            >
              <AvatarFrame size="md">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-gray-900 font-bold shrink-0 shadow-lg overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    (userProfile?.displayName || user?.displayName || 'U')[0].toUpperCase()
                  )}
                </div>
              </AvatarFrame>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#05070a] shadow-lg transition-colors duration-300 ${
                userProfile?.presenceStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-gray-500'
              }`} />
            </div>
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
