import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../contexts/CRMContext';
import { Chat } from '../types/chat.types';

export function useGlobalChatAlerts() {
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid || !effectiveOrgId) return;

    // Escutar chats onde o usuário é membro
    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'chats'),
      where('members', 'array-contains', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      
      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid, effectiveOrgId]);

  const stats = useMemo(() => {
    let unreadCount = 0;
    let mentionCount = 0;
    const uid = userProfile?.uid || '';

    chats.forEach(chat => {
      unreadCount += chat.unreadCount?.[uid] || 0;
      mentionCount += chat.unreadMentions?.[uid] || 0;
    });

    return {
      totalUnread: unreadCount,
      totalMentions: mentionCount,
      hasAlerts: unreadCount > 0 || mentionCount > 0
    };
  }, [chats, userProfile?.uid]);

  return { ...stats, loading };
}
