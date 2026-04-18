import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../contexts/CRMContext';
import { Chat } from '../types/chat.types';

export function useChatList() {
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

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
