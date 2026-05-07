import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    })).filter(g => g.items.length > 0);
  }, [hasPermission, activeLeadsCount, openTicketCount, chatUnreadCount, newWikiCount, pendingVacationsCount]);

  const activeGroup = visibleGroups.find(g => g.label === activeNavGroup) || visibleGroups[0];

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
        className={`fixed inset-y-0 left-0 z-50 flex h-full transition-all duration-500 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } p-4`} // O segredo do "Floating" está no padding aqui
      >
        <div className="flex h-full bg-[#05070a]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          {/* COLUNA 1: Mini Sidebar (Ícones dos Pilares) */}
          <div className="w-20 bg-black/40 border-r border-white/5 flex flex-col items-center py-8 gap-6 shrink-0 z-20">
            <div className="mb-4">
              <img 
                src="https://i.imgur.com/EFBaYb5.png" 
                alt="Logo" 
                className="h-10 w-auto cursor-pointer hover:scale-110 transition-transform" 
                onClick={() => navigate('/')}
              />
            </div>

            <div className="flex-1 flex flex-col gap-4 items-center w-full px-2">
              <button
                onClick={() => setActiveNavGroup('Favoritos')}
                className={`p-3.5 rounded-2xl transition-all relative group ${
                  activeNavGroup === 'Favoritos' 
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
                title="Favoritos"
              >
                <Star size={22} fill={activeNavGroup === 'Favoritos' ? 'currentColor' : 'none'} />
                {pinnedNavItems.length > 0 && activeNavGroup !== 'Favoritos' && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border border-[#05070a]" />
                )}
              </button>

              <div className="w-8 h-[1px] bg-white/10 my-2" />

              {visibleGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setActiveNavGroup(group.label)}
                  className={`p-3.5 rounded-2xl transition-all relative group ${
                    activeNavGroup === group.label 
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]' 
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                  title={group.label}
                >
                  <group.icon size={22} />
                  {group.totalBadges > 0 && activeNavGroup !== group.label && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-[#05070a] animate-pulse" />
                  )}
                  
                  {/* Tooltip Cyber */}
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#0a0c10] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 z-50 border border-white/10 shadow-2xl">
                    {group.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* COLUNA 2: Conteúdo Expandido */}
          <div className="w-64 flex flex-col z-10">
            <div className="p-8 flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 select-none">
                {activeNavGroup}
              </h2>
              <button
                className="md:hidden text-gray-500 hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 px-5 space-y-1 overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeNavGroup}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.3, ease: "circOut" }}
                  className="space-y-1"
                >
                  {activeNavGroup === 'Favoritos' ? (
                    pinnedNavItems.length > 0 ? (
                      pinnedNavItems.map(item => (
                        <NavItem
                          key={item.path}
                          icon={item.icon}
                          label={item.label}
                          path={item.path}
                          onClick={() => setSidebarOpen(false)}
                          badge={getBadgeForPath(item.path)}
                        />
                      ))
                    ) : (
                      <div className="py-16 px-4 text-center opacity-40">
                        <Star size={40} className="mx-auto text-gray-600 mb-4" />
                        <p className="text-xs font-medium text-gray-500">Nenhum atalho favoritado.</p>
                      </div>
                    )
                  ) : (
                    activeGroup?.items.map(item => (
                      <NavItem
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                        onClick={() => setSidebarOpen(false)}
                        badge={getBadgeForPath(item.path)}
                      />
                    ))
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* PERFIL FLUTUANTE */}
            <div className="p-6 mt-auto">
              <div
                onClick={() => navigate(`/profile/${user?.uid}`)}
                className="flex items-center gap-4 p-4 bg-white/5 rounded-[1.5rem] border border-white/5 cursor-pointer hover:bg-white/10 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <AvatarFrame size="md">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-gray-900 font-bold shrink-0 shadow-lg overflow-hidden border border-white/10">
                      {userProfile?.photoURL ? (
                        <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                      ) : (
                        (userProfile?.displayName || user?.displayName || 'U')[0].toUpperCase()
                      )}
                    </div>
                  </AvatarFrame>
                  <span 
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#05070a] transition-colors duration-300 ${
                      userProfile?.presenceStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                      userProfile?.presenceStatus === 'away' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                      'bg-gray-500'
                    }`}
                  />
                  {unreadAlertsCount > 0 && (
                    <span className="absolute -top-2 -left-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#05070a] shadow-xl animate-pulse z-10">
                      {unreadAlertsCount}
                    </span>
                  )}
                </div>
                <div className="truncate flex-1 relative z-10">
                  <p className="text-sm font-black text-white truncate group-hover:text-primary-400 transition-colors">
                    {userProfile?.displayName?.split(' ')[0] || 'Usuário'}
                  </p>
                  <p className="text-[9px] text-gray-500 truncate uppercase tracking-widest font-black">
                    {userProfile?.jobTitle || 'Membro'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
