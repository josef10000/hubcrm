import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@auth/contexts/AuthContext';

export function usePresence() {
  const { userProfile } = useAuth();
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref para garantir que os listeners sempre tenham acesso ao estado mais recente do perfil
  const userProfileRef = useRef(userProfile);
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutos

  const updateStatus = async (status: 'online' | 'away' | 'offline' | 'lunch' | 'meeting', isManual = false) => {
    if (!userProfileRef.current?.uid) return;

    try {
      const profileDocRef = doc(db, 'profiles', userProfileRef.current.uid);
      await updateDoc(profileDocRef, {
        presenceStatus: status,
        isManualStatus: isManual,
        lastSeen: Date.now()
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  const manualSetStatus = (status: 'online' | 'away' | 'offline' | 'lunch' | 'meeting') => {
    updateStatus(status, true);
  };

  const resetInactivityTimer = () => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    
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

    // Se não houver status definido ou se for offline, inicia como online (automático)
    if (!userProfile.presenceStatus || userProfile.presenceStatus === 'offline') {
      updateStatus('online', false);
    }
    
    resetInactivityTimer();

    const handleVisibilityChange = () => {
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
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('keydown', resetInactivityTimer);
      window.removeEventListener('click', resetInactivityTimer);
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    };
  }, [userProfile?.uid]);

  return { updateStatus, manualSetStatus };
}
