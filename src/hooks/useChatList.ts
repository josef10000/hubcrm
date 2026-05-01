import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../contexts/CRMContext';
import { Chat } from '../types/chat.types';
import { useSoundEffect } from './useSoundEffect';

export function useChatList() {
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { playSound } = useSoundEffect();
  const prevUnreadCounts = useRef<{ [chatId: string]: number }>({});
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!effectiveOrgId || !userProfile?.uid) return;

    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'chats'),
      where('members', 'array-contains', userProfile.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Chat));

      // Lógica de Som de Notificação
      if (!isFirstLoad.current && userProfile?.uid) {
        let shouldPlaySound = false;
        
        chatList.forEach(chat => {
          const currentUnread = chat.unreadCount?.[userProfile.uid] || 0;
          const prevUnread = prevUnreadCounts.current[chat.id] || 0;
          const isMuted = chat.muted?.[userProfile.uid] || false;

          // Se o contador aumentou e NÃO está silenciado
          if (currentUnread > prevUnread && !isMuted) {
            shouldPlaySound = true;
          }
          
          // Atualizar ref para a próxima comparação
          prevUnreadCounts.current[chat.id] = currentUnread;
        });

        if (shouldPlaySound) {
          playSound('notification');
        }
      } else {
        // Na primeira carga, apenas popula o ref sem tocar som
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (userProfile?.uid) {
            prevUnreadCounts.current[doc.id] = data.unreadCount?.[userProfile.uid] || 0;
          }
        });
        isFirstLoad.current = false;
      }

      setChats(chatList);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar lista de chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId, userProfile?.uid]);

  return { chats, loading };
}
