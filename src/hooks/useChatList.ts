import { useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../contexts/CRMContext';
import { useSoundEffect } from './useSoundEffect';

export function useChatList() {
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
  const { chats, loadingChats: loading, initChatList } = useChatStore();
  const { playSound } = useSoundEffect();

  useEffect(() => {
    if (effectiveOrgId && userProfile?.uid) {
      const unsubscribe = initChatList(effectiveOrgId, userProfile.uid);
      return () => unsubscribe();
    }
  }, [effectiveOrgId, userProfile?.uid, initChatList]);

  // Lógica de Som pode ser movida para a Store no futuro, 
  // mas por enquanto mantemos aqui ou na Store se preferir.
  // Como a Store já centraliza, é melhor que a Store dispare o som se possível,
  // ou mantemos o useEffect aqui comparando chats.

  return { chats, loading };
}
