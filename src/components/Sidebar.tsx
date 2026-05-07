import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useCRM } from '../contexts/CRMContext';
import { usePermissions } from '../hooks/usePermissions';
import { useGlobalChatAlerts } from '../hooks/useGlobalChatAlerts';
import NavItem from './NavItem';
import AvatarFrame from './AvatarFrame';
import { navGroups } from '../constants/navigation';

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, userProfile, unreadAlertsCount, isBirthday } = useAuth();
  const { sidebarOpen, setSidebarOpen, pinnedItems } = useUI();
  const { activeLeadsCount, supportRequests, wikiArticles, pendingVacationsCount } = useCRM();
  const { hasPermission } = usePermissions();
  const { totalUnread: chatUnreadCount } = useGlobalChatAlerts();

  // Estado para o menu Flyout
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Contadores para badges
  const openTicketCount = useMemo(() => supportRequests.filter(r => r.status === 'aberto' || r.status === 'em_analise').length, [supportRequests]);
  const newWikiCount = useMemo(() => {
    if (!userProfile?.viewedWikiArticles) return wikiArticles.length;
    return wikiArticles.filter(art => !userProfile.viewedWikiArticles?.includes(art.id)).length;
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

      {/* MINI SIDEBAR (Sempre visível como barra fina de ícones) */}
      <aside
        translate="no"
        className={`fixed inset-y-0 left-0 z-50 flex h-full transition-all duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } p-4`}
        onMouseLeave={handleMouseLeave}
      >
        <div className="w-20 bg-[#05070a]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] flex flex-col items-center py-8 gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex-1 flex flex-col gap-4 items-center w-full px-2">
            {/* Gatilho Favoritos */}
            <button
              onMouseEnter={() => handleMouseEnter('favorites')}
              className={`p-3.5 rounded-2xl transition-all relative group ${
                activeGroupId === 'favorites' 
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <Star size={22} fill={pinnedNavItems.length > 0 ? 'currentColor' : 'none'} className={pinnedNavItems.length > 0 ? 'text-amber-500' : ''} />
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
                className={`p-3.5 rounded-2xl transition-all relative group ${
                  activeGroupId === group.id 
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <group.icon size={22} />
                {group.totalBadges > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-[#05070a] animate-pulse" />
                )}
                
                {/* Tooltip Mini */}
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#0a0c10] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 z-50 border border-white/10 shadow-2xl">
                  {group.label}
                </div>
              </button>
            ))}
          </div>

          {/* Perfil Mini no Rodapé */}
          <div className="mt-auto">
            <div 
              onClick={() => navigate(`/profile/${user?.uid}`)}
              className="relative cursor-pointer group"
            >
              <AvatarFrame size="md">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-gray-900 font-bold shrink-0 shadow-lg overflow-hidden border border-white/10">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    (userProfile?.displayName || user?.displayName || 'U')[0].toUpperCase()
                  )}
                </div>
              </AvatarFrame>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#05070a] ${
                userProfile?.presenceStatus === 'online' ? 'bg-emerald-500' : 'bg-gray-500'
              }`} />
            </div>
          </div>
        </div>

        {/* SUBMENU FLYOUT (Painel Flutuante) */}
        <AnimatePresence>
          {activeGroupId && activeGroupData && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
              onMouseLeave={handleMouseLeave}
              className="fixed left-24 top-6 bottom-6 w-64 bg-[#0a0c10]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 z-[60] shadow-[30px_0_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-500 opacity-50" />
              
              <div className="mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-1">Módulo</h3>
                <h2 className="text-xl font-bold text-white">{activeGroupData.label}</h2>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2">
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
                  <div className="py-12 text-center opacity-30">
                    <Star size={32} className="mx-auto mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Vazio</p>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 text-[9px] text-gray-600 uppercase tracking-widest font-black text-center opacity-50">
                Hub CRM v6.0.9
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </>
  );
}
