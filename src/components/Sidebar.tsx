import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, ChevronRight } from 'lucide-react';
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
  const { 
    sidebarOpen, setSidebarOpen, 
    pinnedItems
  } = useUI();
  const { activeLeadsCount, supportRequests, wikiArticles, pendingVacationsCount } = useCRM();
  const { hasPermission } = usePermissions();
  const { totalUnread: chatUnreadCount } = useGlobalChatAlerts();

  // Estado para o menu flutuante
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
    if (activeGroupId === 'favorites') {
      return { label: 'Favoritos', items: pinnedNavItems };
    }
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
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-md" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        translate="no"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#030712]/90 backdrop-blur-3xl border-r border-white/5 flex flex-col transition-all duration-300 md:relative ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header com Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <img 
              src="https://i.imgur.com/EFBaYb5.png" 
              alt="Logo" 
              className="h-10 w-auto group-hover:scale-110 transition-transform" 
            />
            <h1 className="text-lg font-black tracking-tight text-white whitespace-nowrap opacity-90">Hub Central</h1>
          </div>
          <button
            className="md:hidden text-gray-500 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* LISTA DE PILARES (GATILHOS DO MENU FLUTUANTE) */}
        <nav className="flex-1 px-4 py-4 space-y-3">
          
          {/* Favoritos como gatilho */}
          <button
            onMouseEnter={() => handleMouseEnter('favorites')}
            className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all relative group ${
              activeGroupId === 'favorites' 
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Star size={20} fill={pinnedNavItems.length > 0 ? 'currentColor' : 'none'} className={pinnedNavItems.length > 0 ? 'text-amber-500' : ''} />
              <span className="text-xs font-black uppercase tracking-[0.15em]">Favoritos</span>
            </div>
            <ChevronRight size={16} className={`transition-transform duration-300 ${activeGroupId === 'favorites' ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
          </button>

          <div className="w-12 h-[1px] bg-white/5 mx-auto my-4" />

          {visibleGroups.map((group) => (
            <button
              key={group.id}
              onMouseEnter={() => handleMouseEnter(group.id)}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all relative group ${
                activeGroupId === group.id 
                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <group.icon size={20} />
                <span className="text-xs font-black uppercase tracking-[0.15em]">{group.label}</span>
                {group.totalBadges > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-primary-500 rounded-full border border-[#030712] animate-pulse" />
                )}
              </div>
              <ChevronRight size={16} className={`transition-transform duration-300 ${activeGroupId === group.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
            </button>
          ))}
        </nav>

        {/* MENU FLUTUANTE (QUICK VIEW) */}
        <AnimatePresence>
          {activeGroupId && activeGroupData && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
              onMouseLeave={handleMouseLeave}
              className="fixed left-64 top-0 bottom-0 w-72 bg-[#05070a]/95 backdrop-blur-2xl border-r border-white/10 p-6 z-[60] shadow-[20px_0_50px_rgba(0,0,0,0.5)] flex flex-col"
            >
              <div className="mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Conteúdo</h3>
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
                    <p className="text-xs">Nenhum favorito</p>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-white/5 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                Hub Symples v6.0.7
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RODAPÉ: PERFIL */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div
            onClick={() => navigate(`/profile/${user?.uid}`)}
            className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all group"
          >
            <div className="relative">
              <AvatarFrame size="md">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-gray-900 font-bold shrink-0 shadow-lg overflow-hidden">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    (userProfile?.displayName || user?.displayName || 'U')[0].toUpperCase()
                  )}
                </div>
              </AvatarFrame>
              <span 
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#030712] transition-colors duration-300 ${
                  userProfile?.presenceStatus === 'online' ? 'bg-emerald-500 animate-pulse' :
                  userProfile?.presenceStatus === 'away' ? 'bg-amber-500' :
                  userProfile?.presenceStatus === 'lunch' ? 'bg-rose-500' :
                  userProfile?.presenceStatus === 'meeting' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`}
              />
            </div>
            <div className="truncate flex-1">
              <p className="text-sm font-bold text-white truncate group-hover:text-primary-400 transition-colors">
                {userProfile?.displayName || 'Usuário'}
              </p>
              <p className="text-[10px] text-gray-500 truncate uppercase tracking-wider">
                {userProfile?.jobTitle || 'Membro'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
