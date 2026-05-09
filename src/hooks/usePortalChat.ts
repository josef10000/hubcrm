import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  serverTimestamp, 
  addDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';

export function usePortalChat(orgId: string | undefined, clientId: string | undefined, consultantId: string | undefined) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !clientId) return;

    const chatPath = `organizations/${orgId}/portalChats/${clientId}/messages`;
    const q = query(
      collection(db, chatPath),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Garantir que o documento do chat existe
    const ensureChatDoc = async () => {
      const chatRef = doc(db, 'organizations', orgId, 'portalChats', clientId);
      const snap = await getDoc(chatRef);
      if (!snap.exists()) {
        await setDoc(chatRef, {
          clientId,
          consultantId: consultantId || 'queue',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'active',
          lastMessage: ''
        });
      }
    };
    ensureChatDoc();

    return () => unsubscribe();
  }, [orgId, clientId, consultantId]);

  const sendMessage = async (text: string, senderName: string) => {
    if (!orgId || !clientId || !text.trim()) return;

    try {
      const chatPath = `organizations/${orgId}/portalChats/${clientId}/messages`;
      const chatRef = doc(db, 'organizations', orgId, 'portalChats', clientId);

      await addDoc(collection(db, chatPath), {
        text,
        senderId: clientId,
        senderName,
        createdAt: serverTimestamp(),
        type: 'text'
      });

      await setDoc(chatRef, {
        updatedAt: serverTimestamp(),
        lastMessage: text,
        lastSenderName: senderName,
        unreadByConsultant: true
      }, { merge: true });

      return true;
    } catch (e) {
      console.error("Error sending portal message:", e);
      return false;
    }
  };

  return { messages, sendMessage, loading };
}
