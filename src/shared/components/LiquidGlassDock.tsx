import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Search,
  Headphones,
  User,
  Wallet,
  Settings,
  Shield,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { useGlobalChatAlerts } from '@/hooks/useGlobalChatAlerts';
import { useRadioStore } from '@/store/useRadioStore';
import { getThemePalette } from '@shared/utils/themePalette';
import AvatarFrame, { getCleanPhotoURL } from './AvatarFrame';
import { PremiumIcon } from './Sidebar';
import { navGroups } from '@/constants/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

const isValidPhotoURL = (url: any) =>
  url &&
  typeof url === 'string' &&
  url.trim() !== '' &&
  url !== 'undefined' &&
  url !== 'null' &&
  (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'));

const trayContentVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir * 18,
    filter: 'blur(3px)'
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)'
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -18,
    filter: 'blur(3px)'
  })
};

export default function LiquidGlassDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, unreadAlertsCount = 0 } = useAuth();
  const { pinnedItems, togglePinItem, themeColor } = useUI();
  const { supportRequests = [] } = useCRM();
  const { hasPermission } = usePermissions();
  const { totalUnread: chatUnreadCount } = useGlobalChatAlerts();
  const { isPlaying, isMinimized, toggleMinimize } = useRadioStore();

  const palette = getThemePalette(themeColor);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeTrayIdx, setActiveTrayIdx] = useState<number>(0);
  const [slideDir, setSlideDir] = useState<number>(1);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [peekAutoHide, setPeekAutoHide] = useState(false);

  const dockContainerRef = useRef<HTMLDivElement>(null);

  // Auto-hide inteligente em editores imersivos (Funis, VSL, Canvas, Wiki)
  const isImmersiveEditor =
    location.pathname.startsWith('/funnels/') ||
    location.pathname.startsWith('/canvas/') ||
    location.pathname === '/wiki';

  useEffect(() => {
    if (!isImmersiveEditor) {
      setPeekAutoHide(false);
      return;
    }
    const onMouseMove = (e: MouseEvent) => {
      if (window.innerHeight - e.clientY <= 58) {
        setPeekAutoHide(true);
      } else if (window.innerHeight - e.clientY > 250 && !activeGroupId && !profileMenuOpen) {
        setPeekAutoHide(false);
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [isImmersiveEditor, activeGroupId, profileMenuOpen]);

  // Fechar bandejas ao clicar fora ou apertar ESC
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dockContainerRef.current && !dockContainerRef.current.contains(e.target as Node)) {
        setActiveGroupId(null);
        setProfileMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveGroupId(null);
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const openSupportCount = useMemo(
    () =>
      (supportRequests || []).filter(
        (r: any) => r.status === 'aberto' || r.status === 'em_analise'
      ).length,
    [supportRequests]
  );

  const getBadgeForPath = (path: string): number => {
    if (path === '/support') return openSupportCount;
    if (path === '/chat') return chatUnreadCount || 0;
    if (path === '/notifications') return unreadAlertsCount || 0;
    return 0;
  };

  const visibleGroups = useMemo(() => {
    return navGroups
      .map(group => {
        const allowedItems = group.items.filter(
          (item: any) => !item.permission || hasPermission(item.permission)
        );
        const totalBadges = allowedItems.reduce(
          (acc, item) => acc + getBadgeForPath(item.path),
          0
        );
        return { ...group, items: allowedItems, totalBadges };
      })
      .filter(group => group.items.length > 0);
  }, [hasPermission, openSupportCount, chatUnreadCount, unreadAlertsCount]);

  const allAllowedItems = useMemo(
    () => visibleGroups.flatMap(g => g.items),
    [visibleGroups]
  );

  const pinnedNavItems = useMemo(
    () => allAllowedItems.filter(item => pinnedItems.includes(item.path)),
    [allAllowedItems, pinnedItems]
  );

  const activeGroupData = useMemo(() => {
    if (activeGroupId === 'favorites') {
      return {
        id: 'favorites',
        label: 'Atalhos Favoritos',
        items: pinnedNavItems
      };
    }
    return visibleGroups.find(g => g.id === activeGroupId) || null;
  }, [activeGroupId, visibleGroups, pinnedNavItems]);

  const isPathMatch = (itemPath: string) => {
    const cleanPath = itemPath.split('?')[0];
    if (cleanPath === '/') return location.pathname === '/';
    return location.pathname === cleanPath || location.pathname.startsWith(cleanPath + '/');
  };

  const isGroupActive = (items: any[]) => items.some(item => isPathMatch(item.path));

  // Transição direcional suave entre pilares (quando a bandeja já está aberta)
  const switchToGroup = (nextGroupId: string, nextIdx: number) => {
    if (nextGroupId === activeGroupId) return;
    setSlideDir(nextIdx >= activeTrayIdx ? 1 : -1);
    setActiveTrayIdx(nextIdx);
    setActiveGroupId(nextGroupId);
  };

  const toggleGroupClick = (groupId: string, dockIdx: number) => {
    setProfileMenuOpen(false);
    if (activeGroupId === groupId) {
      setActiveGroupId(null);
    } else {
      setSlideDir(dockIdx >= activeTrayIdx ? 1 : -1);
      setActiveTrayIdx(dockIdx);
      setActiveGroupId(groupId);
    }
  };

  const getScaleForIdx = (idx: number) => {
    if (hoveredIdx === null) return { scale: 1, y: 0 };
    const dist = Math.abs(hoveredIdx - idx);
    if (dist === 0) return { scale: 1.18, y: -7 };
    if (dist === 1) return { scale: 1.07, y: -3 };
    return { scale: 1, y: 0 };
  };

  const isHiddenByImmersive =
    isImmersiveEditor && !peekAutoHide && !activeGroupId && !profileMenuOpen;

  // Estilo Liquid Glass adaptativo para temas escuros e claros (ex: Branco Elite)
  const glassSurfaceStyle: React.CSSProperties = palette.isLight
    ? {
        background:
          'linear-gradient(145deg, rgba(255, 255, 255, 0.88) 0%, rgba(241, 245, 249, 0.82) 100%)',
        boxShadow:
          '0 20px 50px rgba(15, 23, 42, 0.16), inset 0 1px 0.5px rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(15, 23, 42, 0.12)'
      }
    : {
        background: `linear-gradient(145deg, rgba(12, 18, 32, 0.84) 0%, rgba(8, 12, 24, 0.80) 58%, rgba(${palette.rgb}, 0.10) 100%)`,
        boxShadow: `0 24px 60px rgba(0, 0, 0, 0.76), inset 0 1px 0.5px rgba(255, 255, 255, 0.30), inset 0 -1px 1px rgba(${palette.rgb}, 0.22)`,
        borderColor: 'rgba(255, 255, 255, 0.18)'
      };

  const dockBarStyle: React.CSSProperties = palette.isLight
    ? {
        background:
          'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.78) 100%)',
        boxShadow:
          '0 18px 44px rgba(15, 23, 42, 0.14), inset 0 1px 0.5px rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(15, 23, 42, 0.12)'
      }
    : {
        background: `linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(12, 18, 32, 0.68) 50%, rgba(${palette.rgb}, 0.10) 100%)`,
        boxShadow: `0 20px 50px rgba(0, 0, 0, 0.72), inset 0 1px 0.5px rgba(255, 255, 255, 0.36), inset 0 -1px 1px rgba(${palette.rgb}, 0.22)`,
        borderColor: 'rgba(255, 255, 255, 0.18)'
      };

  return (
    <>
      {/* Indicador sutil na base quando auto-oculto em editores de tela cheia */}
      {isHiddenByImmersive && (
        <div
          onMouseEnter={() => setPeekAutoHide(true)}
          className="fixed bottom-0 inset-x-0 h-5 z-[65] flex items-end justify-center pb-1.5 cursor-pointer"
        >
          <div
            className="w-28 h-1 rounded-full backdrop-blur-md"
            style={{
              backgroundColor: `rgba(${palette.rgb}, 0.45)`,
              boxShadow: `0 0 12px rgba(${palette.rgb}, 0.5)`
            }}
          />
        </div>
      )}

      <div
        ref={dockContainerRef}
        onMouseLeave={() => {
          setHoveredIdx(null);
          setHoveredLabel(null);
        }}
        className={`fixed bottom-3.5 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center max-w-[calc(100vw-1.25rem)] transition-all duration-300 ${
          isHiddenByImmersive
            ? 'translate-y-24 opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
      >
        {/* CÁPSULA ÚNICA LIQUID GLASS COM MORPH CONTÍNUO (Opção B: Clique abre, deslizar troca suave) */}
        <AnimatePresence>
          {activeGroupId && activeGroupData && (
            <motion.div
              key="persistent-liquid-glass-tray"
              layout
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{
                opacity: { duration: 0.16, ease: 'easeOut' },
                y: { type: 'spring', stiffness: 460, damping: 32 },
                scale: { type: 'spring', stiffness: 460, damping: 32 },
                layout: { type: 'spring', stiffness: 440, damping: 34 }
              }}
              className="pb-3 w-[min(460px,calc(100vw-1.5rem))]"
            >
              {/* Ponte invisível (pb-3 acima) conecta a bandeja direto aos ícones sem vão morto */}
              <div
                className="w-full rounded-3xl p-4 border backdrop-blur-[32px] saturate-[190%] overflow-hidden"
                style={glassSurfaceStyle}
              >
                <AnimatePresence mode="popLayout" initial={false} custom={slideDir}>
                  <motion.div
                    key={activeGroupData.id}
                    custom={slideDir}
                    variants={trayContentVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: palette.primaryHex,
                            boxShadow: `0 0 8px ${palette.primaryHex}`
                          }}
                        />
                        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                          {activeGroupData.label}
                        </h3>
                      </div>
                      <button
                        onClick={() => setActiveGroupId(null)}
                        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        aria-label="Fechar menu"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {activeGroupData.items.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {activeGroupData.items.map((item: any) => {
                          const active = isPathMatch(item.path);
                          const pinned = pinnedItems.includes(item.path);
                          const badge = getBadgeForPath(item.path);
                          const iconName = item.icon?.displayName || item.icon?.name || 'Target';

                          return (
                            <div
                              key={item.path}
                              className={`group/item flex items-center justify-between rounded-2xl px-3 py-2.5 transition-all border ${
                                active
                                  ? 'bg-primary-500/15 border-primary-500/40 text-white'
                                  : 'bg-white/[0.04] hover:bg-white/[0.10] border-white/[0.07] text-gray-300 hover:text-white'
                              }`}
                            >
                              <Link
                                to={item.path}
                                onClick={() => setActiveGroupId(null)}
                                className="flex items-center gap-2.5 flex-1 min-w-0"
                              >
                                <PremiumIcon
                                  iconName={iconName}
                                  size={18}
                                  className={
                                    active
                                      ? 'text-primary-400 shrink-0'
                                      : 'text-gray-400 group-hover/item:text-primary-400 shrink-0'
                                  }
                                />
                                <span className="text-xs font-semibold truncate">
                                  {item.label}
                                </span>
                              </Link>

                              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                {badge > 0 && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-primary-500 text-white text-[10px] font-black">
                                    {badge}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    togglePinItem(item.path);
                                  }}
                                  className={`p-1 rounded-lg transition cursor-pointer ${
                                    pinned
                                      ? 'text-amber-400 opacity-100'
                                      : 'text-gray-500 opacity-0 group-hover/item:opacity-100 hover:text-amber-300'
                                  }`}
                                  title={pinned ? 'Remover favorito' : 'Fixar nos favoritos'}
                                >
                                  <Star size={12} className={pinned ? 'fill-amber-400' : ''} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-5 text-center text-xs text-gray-400">
                        Clique em qualquer módulo ao lado e marque a estrela ⭐ para salvar seus atalhos favoritos aqui.
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* POPOVER COMPACTO DO PERFIL */}
        <AnimatePresence>
          {profileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 440, damping: 32 }}
              className="pb-3 self-end"
            >
              <div
                className="w-60 rounded-3xl p-3.5 border backdrop-blur-[32px] saturate-[190%]"
                style={glassSurfaceStyle}
              >
                <div className="flex items-center gap-2.5 pb-2.5 mb-2 border-b border-white/10">
                  <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-black text-xs overflow-hidden shrink-0">
                    {isValidPhotoURL(userProfile?.photoURL) ? (
                      <img
                        src={getCleanPhotoURL(userProfile!.photoURL)}
                        alt={userProfile?.displayName || 'Avatar'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (userProfile?.displayName || user?.displayName || 'J')[0].toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-bold text-white truncate">
                      {userProfile?.displayName || 'José'}
                    </p>
                    <p className="text-[10px] text-primary-400 font-medium truncate">
                      Hub Central • Comando Solo
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate(`/profile/${user?.uid || userProfile?.uid || 'me'}`);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                  >
                    <User size={14} className="text-primary-400" />
                    <span>Meu Perfil</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/personal-finance');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                  >
                    <Wallet size={14} className="text-primary-400" />
                    <span>Finanças Pessoais</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                  >
                    <Settings size={14} className="text-gray-400" />
                    <span>Configurações & Tema</span>
                  </button>

                  {hasPermission('MANAGE_SETTINGS') && (
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate('/admin');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                    >
                      <Shield size={14} className="text-primary-400" />
                      <span>Infraestrutura & APIs</span>
                    </button>
                  )}

                  <div className="h-px bg-white/10 my-1" />

                  <button
                    onClick={async () => {
                      try {
                        setProfileMenuOpen(false);
                        await signOut(auth);
                        navigate('/');
                      } catch {
                        toast.error('Erro ao sair da conta.');
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer text-left"
                  >
                    <LogOut size={14} />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LEGENDA MACOS DISCRETA QUANDO FECHADO (Só aparece no hover sem abrir caixas!) */}
        <AnimatePresence>
          {!activeGroupId && !profileMenuOpen && hoveredLabel && (
            <motion.div
              key="macos-hover-pill"
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 3, scale: 0.96 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="mb-2.5 px-3 py-1 rounded-full border backdrop-blur-2xl text-[11px] font-semibold text-white tracking-wide pointer-events-none shadow-lg"
              style={glassSurfaceStyle}
            >
              {hoveredLabel}
            </motion.div>
          )}
        </AnimatePresence>

        {/* BARRA ÚNICA LIQUID GLASS DOCK */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-[26px] border backdrop-blur-[28px] saturate-[190%] overflow-x-auto no-scrollbar max-w-full"
          style={dockBarStyle}
        >
          {/* Favoritos */}
          <motion.button
            type="button"
            animate={getScaleForIdx(0)}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            onMouseEnter={() => {
              setHoveredIdx(0);
              setHoveredLabel('Favoritos');
              if (activeGroupId) {
                switchToGroup('favorites', 0);
              }
            }}
            onClick={() => toggleGroupClick('favorites', 0)}
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
              activeGroupId === 'favorites'
                ? 'bg-amber-400/20 border-amber-300/45 text-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.25)]'
                : 'bg-white/[0.06] hover:bg-white/[0.14] border-white/10 text-gray-300 hover:text-amber-300'
            }`}
            aria-label="Favoritos"
          >
            <PremiumIcon
              iconName="Star"
              size={20}
              className={pinnedNavItems.length > 0 ? 'text-amber-400' : ''}
            />
            {pinnedNavItems.length > 0 && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </motion.button>

          <div className="w-px h-6 bg-white/15 mx-0.5 shrink-0" />

          {/* 6 Pilares Principais */}
          {visibleGroups.map((group, idx) => {
            const dockIdx = idx + 1;
            const active = isGroupActive(group.items);
            const isOpen = activeGroupId === group.id;
            const iconName = group.icon.displayName || group.icon.name || 'Globe';

            return (
              <motion.button
                key={group.id}
                type="button"
                animate={getScaleForIdx(dockIdx)}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                onMouseEnter={() => {
                  setHoveredIdx(dockIdx);
                  setHoveredLabel(group.label);
                  // Opção B: Só troca automaticamente no hover quando a bandeja já foi aberta por clique!
                  if (activeGroupId) {
                    switchToGroup(group.id, dockIdx);
                  }
                }}
                onClick={() => {
                  if (group.items.length === 1) {
                    navigate(group.items[0].path);
                    setActiveGroupId(null);
                  } else {
                    toggleGroupClick(group.id, dockIdx);
                  }
                }}
                className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
                  active || isOpen
                    ? 'bg-primary-500/20 border-primary-500/45 text-primary-300'
                    : 'bg-white/[0.06] hover:bg-white/[0.14] border-white/10 text-gray-300 hover:text-white'
                }`}
                style={
                  active || isOpen
                    ? {
                        boxShadow: `0 0 20px rgba(${palette.rgb}, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                      }
                    : undefined
                }
                aria-label={group.label}
              >
                <PremiumIcon
                  iconName={iconName}
                  size={21}
                  className={active || isOpen ? 'text-primary-400' : 'text-gray-300'}
                />

                {active && (
                  <span
                    className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: palette.primaryHex,
                      boxShadow: `0 0 6px ${palette.primaryHex}`
                    }}
                  />
                )}

                {group.totalBadges > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary-500 text-white text-[9px] font-black flex items-center justify-center border border-slate-950">
                    {group.totalBadges}
                  </span>
                )}
              </motion.button>
            );
          })}

          <div className="w-px h-6 bg-white/15 mx-0.5 shrink-0" />

          {/* Busca Rápida Ctrl+K */}
          <motion.button
            type="button"
            animate={getScaleForIdx(visibleGroups.length + 1)}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            onMouseEnter={() => {
              setHoveredIdx(visibleGroups.length + 1);
              setHoveredLabel('Busca Rápida (Ctrl + K)');
            }}
            onClick={() => {
              setActiveGroupId(null);
              setProfileMenuOpen(false);
              window.dispatchEvent(new CustomEvent('hub:open-command-palette'));
            }}
            className="relative w-11 h-11 rounded-2xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-gray-300 hover:text-primary-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Busca Rápida"
          >
            <Search size={18} />
          </motion.button>

          {/* Focus Station (Rádio Integrada na Dock!) */}
          <motion.button
            type="button"
            data-dock-audio="true"
            animate={getScaleForIdx(visibleGroups.length + 2)}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            onMouseEnter={() => {
              setHoveredIdx(visibleGroups.length + 2);
              setHoveredLabel('Focus Station (Áudio)');
            }}
            onClick={() => {
              setActiveGroupId(null);
              setProfileMenuOpen(false);
              toggleMinimize();
            }}
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
              isPlaying || !isMinimized
                ? 'bg-emerald-400/20 border-emerald-300/45 text-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.28)]'
                : 'bg-white/[0.06] hover:bg-white/[0.14] border-white/10 text-gray-300 hover:text-white'
            }`}
            aria-label="Hub Focus Station"
          >
            <Headphones size={18} />
            {isPlaying && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            )}
          </motion.button>

          {/* Avatar do Fundador */}
          <motion.div
            animate={getScaleForIdx(visibleGroups.length + 3)}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            onMouseEnter={() => {
              setHoveredIdx(visibleGroups.length + 3);
              setHoveredLabel('Perfil & Configurações');
            }}
            onClick={() => {
              setActiveGroupId(null);
              setProfileMenuOpen(prev => !prev);
            }}
            className="relative cursor-pointer shrink-0 pl-0.5"
          >
            <AvatarFrame size="sm" pulseStatus="none" frame={userProfile?.avatarFrame || 'none'}>
              <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center text-white font-black text-xs overflow-hidden border border-white/25 shadow-md">
                {isValidPhotoURL(userProfile?.photoURL) ? (
                  <img
                    src={getCleanPhotoURL(userProfile!.photoURL)}
                    alt={userProfile?.displayName || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (userProfile?.displayName || user?.displayName || 'J')[0].toUpperCase()
                )}
              </div>
            </AvatarFrame>
          </motion.div>
        </div>
      </div>
    </>
  );
}
