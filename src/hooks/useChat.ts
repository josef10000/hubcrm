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
  getDoc,
  serverTimestamp, 
  increment,
  updateDoc,
  setDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove
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

  // Derivar mídia compartilhada
  const sharedMedia = messages.filter(m => m.attachments && m.attachments.length > 0);

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
    members: string[] = [],
    type: "text" | "poll" | "approval" | "rich_link" = "text",
    poll?: ChatMessage['poll'],
    approval?: ChatMessage['approval']
  ) => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return;

    try {
      const batch = writeBatch(db);
      const chatRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId);
      const messagesRef = collection(db, 'organizations', effectiveOrgId, 'chats', chatId, 'messages');
      const newMessageRef = doc(messagesRef);

      let messageContent = text;
      if (type === 'poll') messageContent = `📊 Enquete: ${poll?.question}`;
      if (type === 'approval') messageContent = `📝 Pedido de Aprovação: ${approval?.question}`;

      const messageData: any = {
        text: messageContent,
        senderId: userProfile.uid,
        senderName: userProfile.displayName || 'Membro',
        senderPhotoURL: userProfile.photoURL || '',
        attachments,
        mentions,
        replyTo,
        type,
        createdAt: serverTimestamp()
      };

      if (type === 'poll' && poll) {
        messageData.poll = poll;
      }

      if (type === 'approval' && approval) {
        messageData.approval = approval;
      }

      batch.set(newMessageRef, messageData);

      // ATUALIZAÇÃO DO PAI (Denormalização e Notificações)
      const updates: any = {
        lastMessage: {
          text: messageContent.substring(0, 100),
          senderId: userProfile.uid,
          senderName: userProfile.displayName || 'Membro',
          createdAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      };

      // Atualizar contadores para membros
      if (members.length > 0) {
        // Detectar @todos ou @everyone
        const hasMentionAll = text.toLowerCase().includes('@everyone') || text.toLowerCase().includes('@todos');
        if (hasMentionAll) messageData.mentionAll = true;

        members.forEach(memberId => {
          if (memberId === userProfile.uid) return;
          
          // Incrementar unreadCount global do chat p/ este usuário
          updates[`unreadCount.${memberId}`] = increment(1);
          
          // Se for mencionado (ou @todos), incrementar unreadMentions
          const isMentioned = mentions.includes(memberId) || mentions.includes('all') || hasMentionAll;
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
      // Aqui pode-se adicionar um toast de erro se necessário
      return false;
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return false;

    try {
      const messageRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        text: newText,
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Erro ao editar mensagem:", error);
      toast.error("Erro ao editar mensagem.");
      return false;
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return;

    try {
      const messageRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        readBy: arrayUnion(userProfile.uid)
      });
    } catch (error) {
      // Falha silenciosa
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
    
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return;

    try {
      const messageRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId, 'messages', messageId);
      const message = messages.find(m => m.id === messageId);
      const reactions = message?.reactions || {};
      const userList = reactions[emoji] || [];
      const hasReacted = userList.includes(userProfile.uid);

      if (hasReacted) {
        await updateDoc(messageRef, {
          [`reactions.${emoji}`]: arrayRemove(userProfile.uid)
        });
      } else {
        await updateDoc(messageRef, {
          [`reactions.${emoji}`]: arrayUnion(userProfile.uid)
        });
      }
    } catch (error) {
      console.error("Erro ao alternar reação:", error);
    }
  };

  const votePoll = async (messageId: string, optionId: string) => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return;

    try {
      const messageRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId, 'messages', messageId);
      const message = messages.find(m => m.id === messageId);
      if (!message || !message.poll) return;

      const currentOptions = [...message.poll.options];
      const newOptions = currentOptions.map(opt => {
        // Se for a opção que cliquei
        if (opt.id === optionId) {
          const hasVoted = opt.votes.includes(userProfile.uid);
          return {
            ...opt,
            votes: hasVoted 
              ? opt.votes.filter(id => id !== userProfile.uid) // Toggle off
              : [...opt.votes, userProfile.uid]                // Vote on
          };
        }
        // Se for outra opção e eu já tinha votado nela, remove (Voto Único)
        if (opt.votes.includes(userProfile.uid)) {
          return {
            ...opt,
            votes: opt.votes.filter(id => id !== userProfile.uid)
          };
        }
        return opt;
      });

      await updateDoc(messageRef, {
        "poll.options": newOptions
      });
    } catch (error) {
      console.error("Erro ao votar em enquete:", error);
    }
  };

  const togglePin = async (messageId: string) => {
    if (!effectiveOrgId || !chatId) return;

    try {
      const chatRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId);
      
      await updateDoc(chatRef, {
        pinnedMessages: arrayUnion(messageId),
        updatedAt: serverTimestamp()
      });
      toast.success("Mensagem fixada!");
    } catch (error) {
      console.error("Erro ao fixar mensagem:", error);
    }
  };

  const unpinMessage = async (messageId: string) => {
    if (!effectiveOrgId || !chatId) return;
    try {
      const chatRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId);
      await updateDoc(chatRef, {
        pinnedMessages: arrayRemove(messageId),
        updatedAt: serverTimestamp()
      });
      toast.success("Mensagem desfixada.");
    } catch (error) {
      console.error("Erro ao desfixar:", error);
    }
  };

  const toggleBookmark = async (msg: ChatMessage) => {
    if (!effectiveOrgId || !userProfile?.uid) return;

    try {
      const bookmarkRef = doc(db, 'organizations', effectiveOrgId, 'users', userProfile.uid, 'bookmarks', msg.id);
      const snap = await getDoc(bookmarkRef);

      if (snap.exists()) {
        await deleteDoc(bookmarkRef);
        toast.info("Removido dos favoritos.");
      } else {
        await setDoc(bookmarkRef, {
          messageId: msg.id,
          chatId: chatId,
          text: msg.text,
          senderName: msg.senderName,
          senderPhotoURL: msg.senderPhotoURL || '',
          savedAt: serverTimestamp()
        });
        toast.success("Salvo nos favoritos!");
      }
    } catch (error) {
      console.error("Erro no toggle de favorito:", error);
      toast.error("Erro ao processar favorito.");
    }
  };

  const respondApproval = async (messageId: string, status: 'approved' | 'rejected') => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return;

    try {
      const messageRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        "approval.status": status,
        "approval.processedBy": userProfile.uid,
        "approval.processedAt": serverTimestamp()
      });
      
      toast.success(status === 'approved' ? "Pedido aprovado!" : "Pedido rejeitado.");
      
      // Aqui poderíamos disparar uma lógica extra se for desconto (ex: atualizar o lead)
    } catch (error) {
      console.error("Erro ao responder aprovação:", error);
    }
  };

  // Editar mensagem já enviada
  const editMessage = async (messageId: string, newText: string) => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return;
    try {
      const messageRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        text: newText,
        isEdited: true
      });
      toast.success("Mensagem editada!");
    } catch (error) {
      console.error("Erro ao editar mensagem:", error);
      toast.error("Falha ao editar mensagem.");
    }
  };

  // Marcar mensagem como lida (readBy array)
  const markMessageAsRead = async (messageId: string) => {
    if (!effectiveOrgId || !chatId || !userProfile?.uid) return;
    try {
      const messageRef = doc(db, 'organizations', effectiveOrgId, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        readBy: arrayUnion(userProfile.uid)
      });
    } catch (error) {
      console.error("Erro ao marcar como lido:", error);
    }
  };

  return { 
    messages, 
    typing, 
    loading, 
    sendMessage, 
    setTypingStatus, 
    markAsRead, 
    deleteMessage, 
    toggleReaction, 
    votePoll,
    togglePin,
    unpinMessage,
    toggleBookmark,
    respondApproval,
    editMessage,
    markMessageAsRead,
    sharedMedia
  };
}
