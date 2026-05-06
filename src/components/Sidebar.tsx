import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, ChevronDown, ChevronRight } from 'lucide-react';
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
    activeNavGroup, setActiveNavGroup,
    pinnedItems
  } = useUI();
  const { activeLeadsCount, supportRequests, wikiArticles, pendingVacationsCount } = useCRM();
  const { hasPermission } = usePermissions();
  const { totalUnread: chatUnreadCount } = useGlobalChatAlerts();

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
    })).filter(g => g.items.length > 0 || (g.id === 'favorites' && pinnedNavItems.length > 0));
  }, [hasPermission, activeLeadsCount, openTicketCount, chatUnreadCount, newWikiCount, pendingVacationsCount, pinnedNavItems]);

  const toggleGroup = (groupLabel: string) => {
    if (activeNavGroup === groupLabel) {
      setActiveNavGroup(''); // Fecha se clicar no que já está aberto
    } else {
      setActiveNavGroup(groupLabel);
    }
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
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#030712]/90 backdrop-blur-3xl border-r border-white/5 flex flex-col transition-all duration-300 md:relative ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header com Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <img 
              src="https://i.imgur.com/EFBaYb5.png" 
              alt="Logo" 
              className="h-10 w-auto group-hover:scale-110 transition-transform" 
            />
            <h1 className="text-lg font-black tracking-tight text-white whitespace-nowrap opacity-90 group-hover:opacity-100">Hub Central</h1>
          </div>
          <button
            className="md:hidden text-gray-500 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* ÁREA DE NAVEGAÇÃO (ACORDEON) */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          
          {/* SEÇÃO FIXA: FAVORITOS (Se houver itens) */}
          {pinnedNavItems.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => toggleGroup('Favoritos')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                  activeNavGroup === 'Favoritos' 
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Star size={18} fill={activeNavGroup === 'Favoritos' ? 'currentColor' : 'none'} />
                  <span className="text-xs font-black uppercase tracking-widest">Favoritos</span>
                </div>
                {activeNavGroup === 'Favoritos' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              <AnimatePresence>
                {activeNavGroup === 'Favoritos' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 pl-4 space-y-1">
                      {pinnedNavItems.map(item => (
                        <NavItem
                          key={`pinned-${item.path}`}
                          icon={item.icon}
                          label={item.label}
                          path={item.path}
                          onClick={() => setSidebarOpen(false)}
                          badge={getBadgeForPath(item.path)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* PILARES (GRUPOS) */}
          <div className="space-y-3">
            {visibleGroups.map((group) => {
              const isOpen = activeNavGroup === group.label;
              return (
                <div key={group.id} className="group/pilar">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all relative ${
                      isOpen 
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <group.icon size={18} />
                      <span className="text-xs font-black uppercase tracking-widest">{group.label}</span>
                      {group.totalBadges > 0 && !isOpen && (
                        <span className="absolute top-2 right-8 w-2 h-2 bg-primary-500 rounded-full border border-[#030712] animate-pulse" />
                      )}
                    </div>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2 pl-4 space-y-1">
                          {group.items.map(item => (
                            <NavItem
                              key={item.path}
                              icon={item.icon}
                              label={item.label}
                              path={item.path}
                              onClick={() => setSidebarOpen(false)}
                              badge={getBadgeForPath(item.path)}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </nav>

        {/* RODAPÉ: PERFIL DO USUÁRIO */}
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
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#030712] shadow-lg animate-pulse z-10">
                  {unreadAlertsCount}
                </span>
              )}
            </div>
            <div className="truncate flex-1">
              <p className="text-sm font-bold text-white truncate group-hover:text-primary-400 transition-colors">
                {userProfile?.displayName || 'Usuário'}
              </p>
              <p className="text-[10px] text-gray-500 truncate uppercase tracking-wider font-medium">
                {userProfile?.jobTitle || 'Membro'}
              </p>
            </div>
          </div>
          
          {isBirthday && (
            <div className="mt-2 py-1 px-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-center gap-2">
              <span className="text-xs">🎂 Parabéns!</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
