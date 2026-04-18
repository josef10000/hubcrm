import { useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export function usePresence() {
  const { userProfile } = useAuth();
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutos

  const updateStatus = async (status: 'online' | 'away' | 'offline') => {
    if (!userProfile?.uid) return;

    try {
      const profileRef = doc(db, 'profiles', userProfile.uid);
      await updateDoc(profileRef, {
        presenceStatus: status,
        lastSeen: Date.now()
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  const resetInactivityTimer = () => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    
    // Se estava away ou offline (e não foi manual), volta para online
    if (userProfile?.presenceStatus !== 'online') {
      updateStatus('online');
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      updateStatus('away');
    }, INACTIVITY_LIMIT);
  };

  useEffect(() => {
    if (!userProfile?.uid) return;

    // Inicializa como online
    updateStatus('online');
    resetInactivityTimer();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStatus('online');
        resetInactivityTimer();
      } else {
        // Opcional: não marcar offline imediatamente, apenas parar timer ou marcar away
        updateStatus('away');
      }
    };

    const handleBeforeUnload = () => {
      // Best effort para marcar offline ao fechar
      updateStatus('offline');
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

  return { updateStatus };
}
