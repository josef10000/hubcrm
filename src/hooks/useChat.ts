import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  writeBatch, 
  doc, 
  serverTimestamp, 
  increment,
  updateDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../contexts/CRMContext';
import { Chat, ChatMessage, TypingIndicator } from '../types/chat.types';
import { toast } from 'sonner';

export function useChat(chatId: string | null) {
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState<TypingIndicator[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar mensagens
  useEffect(() => {
    if (!effectiveOrgId || !chatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatMessage)).reverse();
      setMessages(msgs);
      setLoading(false);
      
      // Marcar como lido ao receber novas mensagens se o chat estiver aberto
      markAsRead();
    }, (error) => {
      console.error("Erro no onSnapshot do Chat:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId, chatId]);

  // Carregar typing indicators
  useEffect(() => {
    if (!effectiveOrgId || !chatId) return;

    const q = collection(db, 'organizations', effectiveOrgId, 'chats', chatId, 'typing');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const activeTyping = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as any))
        .filter(t => t.uid !== userProfile?.uid && (t.timestamp?.toMillis() || 0) > now - 3000)
        .map(t => ({ displayName: t.displayName, timestamp: t.timestamp } as TypingIndicator));
      
      setTyping(activeTyping);
    });

    return () => unsubscribe();
  }, [effectiveOrgId, chatId, userProfile?.uid]);

  const markAsRead = useCallback(async () => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return;

    try {
      const chatRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId);
      await updateDoc(chatRef, {
        [`unreadCount.${userProfile.uid}`]: 0,
        [`unreadMentions.${userProfile.uid}`]: 0,
        [`lastRead.${userProfile.uid}`]: serverTimestamp()
      });
    } catch (error) {
       // Silencioso se der erro ao marcar como lido
    }
  }, [effectiveOrgId, chatId, userProfile?.uid]);

  const sendMessage = async (
    text: string, 
    mentions: string[] = [], 
    attachments: string[] = [], 
    replyTo: ChatMessage['replyTo'] = null,
    members: string[] = []
  ) => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return;

    try {
      const batch = writeBatch(db);
      const chatRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId);
      const messagesRef = collection(db, 'organizations', effectiveOrgId, 'chats', chatId, 'messages');
      const newMessageRef = doc(messagesRef);

      const messageData: Partial<ChatMessage> = {
        text,
        senderId: userProfile.uid,
        senderName: userProfile.displayName || 'Membro',
        senderPhotoURL: userProfile.photoURL || '',
        attachments,
        mentions,
        replyTo,
        createdAt: serverTimestamp() as any
      };

      batch.set(newMessageRef, messageData);

      // ATUALIZAÇÃO DO PAI (Denormalização e Notificações)
      const updates: any = {
        lastMessage: {
          text: text.substring(0, 100),
          senderId: userProfile.uid,
          senderName: userProfile.displayName || 'Membro',
          createdAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      };

      // Atualizar contadores para membros
      if (members.length > 0) {
        members.forEach(memberId => {
          if (memberId === userProfile.uid) return;
          
          // Incrementar unreadCount global do chat p/ este usuário
          updates[`unreadCount.${memberId}`] = increment(1);
          
          // Se for mencionado (ou @todos), incrementar unreadMentions
          const isMentioned = mentions.includes(memberId) || mentions.includes('all');
          if (isMentioned) {
            updates[`unreadMentions.${memberId}`] = increment(1);
          }
        });
      }
      
      batch.update(chatRef, updates);
      await batch.commit();
      
      // Remover indicador de digitação após enviar
      const typingRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId, 'typing', userProfile.uid);
      await deleteDoc(typingRef);
      
      return true;
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem.");
      return false;
    }
  };
    
  const deleteMessage = async (messageId: string) => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return false;

    try {
      const messageRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        text: "Mensagem apagada",
        attachments: [],
        mentions: [],
        isDeleted: true
      });
      return true;
    } catch (error) {
      console.error("Erro ao apagar mensagem:", error);
      toast.error("Erro ao apagar mensagem.");
      return false;
    }
  };

  const setTypingStatus = async (isTyping: boolean) => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return;

    try {
      const typingRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId, 'typing', userProfile.uid);
      if (isTyping) {
        await setDoc(typingRef, {
          displayName: userProfile.displayName || 'Alguém',
          timestamp: serverTimestamp()
        });
      } else {
        await deleteDoc(typingRef);
      }
    } catch (error) {
      // Falha silenciosa para typing indicator
    }
  };

  return { messages, typing, loading, sendMessage, setTypingStatus, markAsRead, deleteMessage };
}
