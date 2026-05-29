import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRMStore } from '@/store/useCRMStore';
import { getLocalDateString } from '@/store/slices/timeTrackingSlice';
import { toast } from 'sonner';

export function usePresence() {
  const { userProfile } = useAuth();
  const store = useCRMStore();
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref para garantir que os listeners sempre tenham acesso ao estado mais recente do perfil
  const userProfileRef = useRef(userProfile);
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutos

  const updateStatus = async (status: 'online' | 'away' | 'offline' | 'lunch' | 'meeting', isManual = false) => {
    if (!userProfileRef.current?.uid) return;

    // Se o ponto ainda está carregando do Firestore, bloqueamos qualquer alteração para evitar race conditions
    if (store.loadingTimeLog) return;

    // Se o expediente do dia já foi concluído, o colaborador deve permanecer offline no chat.
    // Ignoramos qualquer transição automática ou manual para outro status.
    if (store.todayLog?.status === 'completed' && status !== 'offline') {
      return;
    }

    try {
      const profileDocRef = doc(db, 'profiles', userProfileRef.current.uid);
      await updateDoc(profileDocRef, {
        presenceStatus: status,
        isManualStatus: isManual,
        lastSeen: Date.now()
      });

      // Sincronização com o Módulo de Ponto Eletrônico
      const log = store.todayLog;

      if (status === 'lunch') {
        if (log && log.status === 'active') {
          await store.registerPause('lunch');
        }
      } else if (status === 'away') {
        if (log && log.status === 'active') {
          await store.registerPause('away');
        }
      } else if (status === 'meeting') {
        if (log && log.status === 'active') {
          await store.registerPause('meeting');
        }
      } else if (status === 'online') {
        if (!log) {
          // Se ficou online e não tem ponto batido hoje, abre o expediente!
          await store.startExpediente(
            userProfileRef.current.uid,
            userProfileRef.current.displayName || 'Colaborador',
            userProfileRef.current.photoURL || ''
          );
        } else if (log.status === 'paused') {
          // Se estava pausado e voltou, retoma contagem de horas
          await store.resumeExpediente();
        }
      } else if (status === 'offline') {
        if (log && log.status !== 'completed') {
          // Se ficou offline no chat e o ponto estava aberto, fecha expediente
          await store.endExpediente();
        }
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  const manualSetStatus = (status: 'online' | 'away' | 'offline' | 'lunch' | 'meeting') => {
    updateStatus(status, true);
  };

  const resetInactivityTimer = () => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    
    // Se o ponto ainda está carregando, não faz nada
    if (store.loadingTimeLog) return;

    // Se o expediente já foi concluído hoje, abortamos o timer de inatividade
    if (store.todayLog?.status === 'completed') return;
    
    const currentProfile = userProfileRef.current;
    
    // Se for um status manual (Almoço/Reunião/etc), não voltamos para Online automaticamente
    if (!currentProfile?.isManualStatus) {
      if (currentProfile?.presenceStatus !== 'online') {
        updateStatus('online', false);
      }

      inactivityTimeoutRef.current = setTimeout(() => {
        // Verifica novamente se continua não sendo manual antes de marcar away
        if (!userProfileRef.current?.isManualStatus) {
          updateStatus('away', false);
        }
      }, INACTIVITY_LIMIT);
    }
  };

  useEffect(() => {
    if (!userProfile?.uid) return;

    const sessionStartTime = Date.now();
    let hasCheckedAutoClock = false;
    let activityTimer: NodeJS.Timeout | null = null;

    // Assina em tempo real o log de hoje para mantê-lo sincronizado no Zustand
    const unsubLog = store.loadTodayLog(userProfile.uid);

    const initPresence = async () => {
      // Se ainda está carregando o log do Firestore, não faz nada e tenta novamente mais tarde
      if (store.loadingTimeLog) {
        setTimeout(initPresence, 200);
        return;
      }

      const currentLog = store.todayLog;
      if (currentLog?.status === 'completed') {
        await updateStatus('offline', false);
      } else if (!userProfile.presenceStatus || userProfile.presenceStatus === 'offline') {
        await updateStatus('online', false);
      }
    };

    const trackActivityForAutoClockIn = () => {
      const currentLog = store.todayLog;
      if (currentLog?.status === 'completed') return;
      if (hasCheckedAutoClock || currentLog || store.loadingTimeLog) return;

      if (!activityTimer) {
        activityTimer = setTimeout(async () => {
          const checkLog = store.todayLog;
          if (!checkLog && !hasCheckedAutoClock) {
            hasCheckedAutoClock = true;

            // Inicia o expediente de forma automática no Zustand/Firestore
            await store.startExpediente(
              userProfile.uid,
              userProfile.displayName || 'Colaborador',
              userProfile.photoURL || ''
            );

            // Ajusta o startTime retroativamente para a hora em que o colaborador abriu a aba do CRM
            const todayStr = getLocalDateString();
            const docId = `${todayStr}_${userProfile.uid}`;
            const orgId = store.effectiveOrgId;
            if (orgId) {
              try {
                const docRef = doc(db, 'organizations', orgId, 'time_logs', docId);
                await updateDoc(docRef, { startTime: sessionStartTime });
              } catch (e) {
                console.error('[AutoClockIn] Erro ao aplicar retroatividade:', e);
              }
            }

            toast.info('Auto-Clock In: Identificamos atividade contínua no CRM e iniciamos seu expediente!');
          }
        }, 60 * 1000); // 1 minuto de atividade no site
      }
    };

    const handleUserInteraction = () => {
      if (store.todayLog?.status === 'completed') return;
      resetInactivityTimer();
      trackActivityForAutoClockIn();
    };

    initPresence();
    resetInactivityTimer();

    const handleVisibilityChange = () => {
      if (store.todayLog?.status === 'completed') return;
      
      // Só alteramos automaticamente se não for um status manual
      if (!userProfileRef.current?.isManualStatus) {
        if (document.visibilityState === 'visible') {
          updateStatus('online', false);
          resetInactivityTimer();
        } else {
          updateStatus('away', false);
        }
      }
    };

    const handleBeforeUnload = () => {
      // Ao fechar a aba/janela, marcamos offline independente de ser manual ou não
      updateStatus('offline', false);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('mousemove', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('click', handleUserInteraction);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      if (activityTimer) clearTimeout(activityTimer);
      unsubLog();
    };
  }, [userProfile?.uid]);

  return { updateStatus, manualSetStatus };
}
