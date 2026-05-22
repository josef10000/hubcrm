import React, { useEffect, useRef } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCallStore } from '@/store/useCallStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CallDocument } from '@/types/call.types';
import { IncomingCallModal } from './IncomingCallModal';

export function GlobalCallListener() {
  const { userProfile } = useAuth();
  const { rejectCall, soundSynth } = useWebRTC();
  const currentCallId = useCallStore((s) => s.currentCallId);
  const callStatus = useCallStore((s) => s.callStatus);
  
  const activeUnsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;

    // Escuta novas chamadas direcionadas ao usuário conectado que estão no estado 'calling'
    const q = query(
      collection(db, 'calls'),
      where('calleeId', '==', userProfile.uid),
      where('status', '==', 'calling')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Só dispara se houver um novo documento e o usuário estiver idle (livre)
      if (!snapshot.empty && useCallStore.getState().callStatus === 'idle') {
        const callDoc = snapshot.docs[0];
        const callData = callDoc.data() as CallDocument;
        const callId = callDoc.id;

        // Configura o estado inicial da store de chamadas (ringing)
        useCallStore.setState({
          currentCallId: callId,
          callStatus: 'ringing',
          callType: callData.callType,
          isVideoOff: callData.callType === 'audio',
          connectionState: 'new',
        });

        // Inicia a pulsação do ringtone sintetizado
        soundSynth.startRingtone();

        // Busca assincronamente as informações de perfil de quem está ligando
        try {
          const callerProfileRef = doc(db, 'profiles', callData.callerId);
          const callerSnap = await getDoc(callerProfileRef);
          if (callerSnap.exists()) {
            const p = callerSnap.data();
            useCallStore.setState({
              otherParticipant: {
                uid: callData.callerId,
                name: p.displayName || p.name || 'Usuário',
                avatarUrl: p.photoURL || p.avatarUrl || ''
              }
            });
          } else {
            useCallStore.setState({
              otherParticipant: {
                uid: callData.callerId,
                name: 'Usuário',
              }
            });
          }
        } catch (e) {
          console.error("Erro ao obter profile do caller", e);
        }

        // Configura um listener focado exclusivamente no documento desta chamada ativa.
        // Se o caller desistir, encerra o ringtone e a interface imediatamente.
        if (activeUnsubscribe.current) activeUnsubscribe.current();
        
        activeUnsubscribe.current = onSnapshot(doc(db, 'calls', callId), (activeSnap) => {
          if (activeSnap.exists()) {
            const activeData = activeSnap.data() as CallDocument;
            if (activeData.status === 'ended' || activeData.status === 'rejected') {
              soundSynth.stop();
              useCallStore.getState().resetStore();
              if (activeUnsubscribe.current) {
                activeUnsubscribe.current();
                activeUnsubscribe.current = null;
              }
            }
          }
        });
      }
    });

    return () => {
      unsubscribe();
      if (activeUnsubscribe.current) {
        activeUnsubscribe.current();
      }
    };
  }, [userProfile?.uid, callStatus]);

  // Adiciona proteção contra recarregamento ou fechamento acidental de aba (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useCallStore.getState();
      if (state.callStatus !== 'idle' && state.currentCallId) {
        const callDocRef = doc(db, 'calls', state.currentCallId);
        // Atualiza o Firestore de forma síncrona/background
        updateDoc(callDocRef, { status: 'ended' }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Se não estiver no estado ringing, não renderiza nada na raiz
  if (callStatus !== 'ringing') return null;

  return <IncomingCallModal />;
}
export default GlobalCallListener;
