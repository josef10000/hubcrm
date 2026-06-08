import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Coffee, Shield, Globe, Users, Circle, Calendar } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useCRM } from '@crm/contexts/CRMContext';

interface ProfileHoverCardProps {
  userId: string;
  orgId: string;
  children: React.ReactNode;
}

// Auxiliar local para obter a data no Horário de Brasília
const getLocalDateString = (): string => {
  const formatter = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
};

// Auxiliar local para validar URLs de imagem
const isValidPhotoURL = (url: any) => {
  return url && 
         typeof url === 'string' && 
         url.trim() !== '' && 
         url !== 'undefined' && 
         url !== 'null' && 
         (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'));
};

export default function ProfileHoverCard({ userId, orgId, children }: ProfileHoverCardProps) {
  const { teamProfiles = [], orgRoles = [] } = useCRM();
  const [isVisible, setIsVisible] = useState(false);
  const [todayLog, setTodayLog] = useState<any>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Busca perfil e cargo do colaborador correspondente
  const profile = teamProfiles.find((p: any) => p.uid === userId);
  const roleName = profile 
    ? (orgRoles.find((r: any) => r.id === profile.roleId || r.name === profile.role)?.name || profile.role || 'Colaborador') 
    : 'Colaborador';

  // Escuta expediente no Firestore apenas quando o card estiver visível (Lazy Loading)
  useEffect(() => {
    if (!isVisible || !userId || !orgId) {
      setTodayLog(null);
      return;
    }

    const dateStr = getLocalDateString();
    const docId = `${dateStr}_${userId}`;
    const docRef = doc(db, 'organizations', orgId, 'time_logs', docId);

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setTodayLog(snap.data());
      } else {
        setTodayLog(null);
      }
    }, (err) => {
      console.error('[ProfileHoverCard] Erro ao escutar log de expediente:', err);
    });

    return () => unsubscribe();
  }, [isVisible, userId, orgId]);

  // Gerenciamento de eventos de Hover com Debounce de 250ms
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    const rect = e.currentTarget.getBoundingClientRect();
    let leftCoords = rect.right + window.scrollX + 12; // 12px à direita do avatar
    const topCoords = rect.top + window.scrollY;

    // Se bater na extremidade direita da tela, abre à esquerda
    if (leftCoords + 288 > window.innerWidth) {
      leftCoords = rect.left + window.scrollX - 288 - 12;
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setCoords({ top: topCoords, left: leftCoords });
      setIsVisible(true);
    }, 250);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Cores de status reativas
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'away': return 'bg-amber-500';
      case 'lunch': return 'bg-rose-500';
      case 'meeting': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Ícones de status reativos
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Globe size={12} className="text-emerald-400" />;
      case 'away': return <Clock size={12} className="text-amber-400" />;
      case 'lunch': return <Coffee size={12} className="text-rose-400" />;
      case 'meeting': return <Users size={12} className="text-blue-400" />;
      default: return <Circle size={12} className="text-gray-400" />;
    }
  };

  // Tradução do Status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Ausente';
      case 'lunch': return 'Almoço';
      case 'meeting': return 'Em Reunião';
      default: return 'Offline';
    }
  };

  // Componente interno para exibir o relógio em tempo real do expediente
  const LiveDuration = ({ startTime, pauses = [] }: { startTime: number; pauses: any[] }) => {
    const [duration, setDuration] = useState(0);

    useEffect(() => {
      const calculateDuration = () => {
        const now = Date.now();
        let totalTime = now - startTime;
        let totalPauseTime = 0;
        pauses.forEach(p => {
          const pEnd = p.endTime || now;
          totalPauseTime += (pEnd - p.startTime);
        });
        const net = totalTime - totalPauseTime;
        setDuration(net > 0 ? net : 0);
      };

      calculateDuration();
      const interval = setInterval(calculateDuration, 1000);
      return () => clearInterval(interval);
    }, [startTime, pauses]);

    const formatDuration = (ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);
      
      return parts.join(' ');
    };

    return <span className="font-mono text-emerald-400 font-bold">{formatDuration(duration)}</span>;
  };

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && coords && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            style={{ 
              position: 'absolute', 
              top: coords.top, 
              left: coords.left, 
              zIndex: 9999 
            }}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={handleMouseLeave}
            className="w-72 bg-[#05070a]/90 backdrop-blur-[35px] border border-white/10 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col gap-4 overflow-hidden pointer-events-auto"
          >
            {/* Grain Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]" />

            {/* Cabeçalho do Card com Gradiente de Status */}
            <div className="flex items-center gap-4 relative z-10">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-gray-900 font-bold shrink-0 overflow-hidden border border-white/15">
                  {profile && isValidPhotoURL(profile.photoURL) ? (
                    <img src={profile.photoURL} alt={profile.displayName || 'Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    (profile?.displayName || 'U')[0].toUpperCase()
                  )}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#05070a] shadow-md ${
                  getStatusColor(profile?.presenceStatus || 'offline')
                }`} />
              </div>

              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-sm font-bold text-white truncate leading-tight">{profile?.displayName || 'Colaborador'}</h4>
                <p className="text-[10px] text-primary-400 font-black uppercase tracking-widest mt-0.5 truncate">{roleName}</p>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{profile?.email || ''}</p>
              </div>
            </div>

            <div className="w-full h-[1px] bg-white/10 relative z-10" />

            {/* Seção de Status e Detalhes do Expediente */}
            <div className="space-y-3 relative z-10 text-left">
              {/* Presença */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Presença do Chat:</span>
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  {getStatusIcon(profile?.presenceStatus || 'offline')}
                  {getStatusLabel(profile?.presenceStatus || 'offline')}
                </span>
              </div>

              {/* Detalhes de Expediente Ponto */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock size={13} className="text-primary-400" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Expediente de Hoje</span>
                </div>

                {!todayLog ? (
                  <p className="text-[11px] text-gray-500 italic">Expediente não iniciado ou offline.</p>
                ) : (
                  <div className="space-y-1.5 text-[11px] text-gray-300">
                    <div className="flex justify-between">
                      <span>Início:</span>
                      <span className="font-mono text-white">
                        {new Date(todayLog.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Situação do Ponto */}
                    <div className="flex justify-between">
                      <span>Status do Ponto:</span>
                      <span className={`font-bold uppercase tracking-wide text-[9px] px-1.5 py-0.5 rounded-md ${
                        todayLog.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                        todayLog.status === 'paused' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {todayLog.status === 'active' ? 'Ativo' :
                         todayLog.status === 'paused' ? 'Em Pausa' :
                         'Encerrado'}
                      </span>
                    </div>

                    {/* Duração Acumulada */}
                    <div className="flex justify-between pt-1 border-t border-white/5 mt-1">
                      <span>Tempo Ativo:</span>
                      {todayLog.status === 'active' ? (
                        <LiveDuration startTime={todayLog.startTime} pauses={todayLog.pauses} />
                      ) : (
                        <span className="font-mono text-gray-400">
                          {Math.floor(todayLog.totalDuration / 3600000)}h {Math.floor((todayLog.totalDuration % 3600000) / 60000)}m
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
