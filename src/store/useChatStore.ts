import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  collection, query, where, orderBy, onSnapshot, doc, 
  addDoc, updateDoc, serverTimestamp, Timestamp, arrayUnion, arrayRemove,
  getDoc, setDoc, deleteDoc, limit, writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Chat, ChatMessage, TypingIndicator } from '@/types/chat.types';
import { toast } from 'sonner';
import { Logger } from '@/lib/logger';

interface ChatState {
  // Data
  chats: Chat[];
  activeChatId: string | null;
  messages: ChatMessage[];
  typing: TypingIndicator[];
  loadingChats: boolean;
  loadingMessages: boolean;
  error: string | null;

  // Actions
  initChatList: (orgId: string, userId: string) => () => void;
  setActiveChat: (chatId: string | null) => void;
  loadMessages: (orgId: string, chatId: string) => () => void;
  
  // Optimistic Messaging
  sendMessage: (
    orgId: string,
    chatId: string,
    userId: string,
    userName: string,
    userPhoto: string,
    text: string,
    mentions: string[],
    attachments: string[],
    replyTo?: ChatMessage['replyTo'],
    type?: ChatMessage['type'],
    poll?: ChatMessage['poll'],
    approval?: ChatMessage['approval'],
    richPreview?: ChatMessage['richPreview'],
    parentMessageId?: string,
    scheduledAt?: Timestamp
  ) => Promise<void>;

  // Other Actions
  setTypingStatus: (orgId: string, chatId: string, userId: string, userName: string, isTyping: boolean) => Promise<void>;
  deleteMessage: (orgId: string, chatId: string, messageId: string) => Promise<boolean>;
  editMessage: (orgId: string, chatId: string, messageId: string, newText: string) => Promise<void>;
  markAsRead: (orgId: string, chatId: string, userId: string) => Promise<void>;
  markMessageAsRead: (orgId: string, chatId: string, messageId: string, userId: string) => Promise<void>;
  toggleReaction: (orgId: string, chatId: string, messageId: string, userId: string, emoji: string) => Promise<void>;
  votePoll: (orgId: string, chatId: string, messageId: string, userId: string, optionId: string) => Promise<void>;
  togglePin: (orgId: string, chatId: string, messageId: string, isPinned: boolean) => Promise<void>;
  toggleBookmark: (orgId: string, userId: string, messageId: string, msg: ChatMessage, chatId: string) => Promise<void>;
  respondApproval: (orgId: string, chatId: string, messageId: string, userId: string, status: 'approved' | 'rejected') => Promise<void>;
  setMessageReminder: (orgId: string, userId: string, chatId: string, message: ChatMessage, date: Date) => Promise<void>;
  createChannel: (orgId: string, data: Partial<Chat>) => Promise<string>;
  sendBotMessage: (orgId: string, chatId: string, botName: string, text: string, type?: ChatMessage['type'], parentMessageId?: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  chats: [],
  activeChatId: null,
  messages: [],
  typing: [],
  loadingChats: true,
  loadingMessages: false,
  error: null,

  initChatList: (orgId: string, userId: string) => {
    if (!orgId || !userId) return () => {};

    const q = query(
      collection(db, 'organizations', orgId, 'chats'),
      where('members', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Chat));
      set({ chats: chatList, loadingChats: false });
    }, (err) => {
      Logger.error("[ChatStore] Error loading chats:", err);
      set({ error: err.message, loadingChats: false });
    });

    return unsubscribe;
  },

  setActiveChat: (chatId) => {
    set({ activeChatId: chatId, messages: [], loadingMessages: !!chatId });
  },

  loadMessages: (orgId: string, chatId: string) => {
    if (!orgId || !chatId) return () => {};

    set({ loadingMessages: true });
    
    // Listener de Mensagens
    const qMsg = query(
      collection(db, 'organizations', orgId, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMsg = onSnapshot(qMsg, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatMessage));
      set({ messages: msgs, loadingMessages: false });

      // Verificar Notificações (Última mensagem enviada por outros)
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        const userId = (window as any).currentUserUid; // Fallback se não tiver no escopo
        
        if (lastMsg.senderId !== userId) {
          const isMentioned = lastMsg.mentions?.includes(userId || '') || lastMsg.mentionAll;
          if (isMentioned && Notification.permission === 'granted') {
            new Notification(`${lastMsg.senderName} te mencionou`, {
              body: lastMsg.text,
              icon: lastMsg.senderPhotoURL || '/logo192.png'
            });
          }
        }
      }
    });

    // Listener de Typing
    const typingRef = doc(db, 'organizations', orgId, 'chats', chatId, 'typing', 'status');
    const unsubscribeTyping = onSnapshot(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const now = Date.now();
        const activeTyping = Object.entries(data)
          .filter(([uid, info]: [string, any]) => {
            if (!info || typeof info !== 'object') return false;
            const infoTs = info.timestamp?.toMillis ? info.timestamp.toMillis() : 0;
            return now - infoTs < 5000; // 5 segundos de validade
          })
          .map(([_, info]: [string, any]) => info as TypingIndicator);
        set({ typing: activeTyping });
      } else {
        set({ typing: [] });
      }
    });

    return () => {
      unsubscribeMsg();
      unsubscribeTyping();
    };
  },

  sendMessage: async (orgId, chatId, userId, userName, userPhoto, text, mentions, attachments, replyTo, type = "text", poll, approval, richPreview, parentMessageId, scheduledAt) => {
    if (!orgId || !chatId) return;

    // 1. Criar Mensagem Otimista
    const optimisticId = `opt-${Date.now()}`;
    const newMessage: ChatMessage = {
      id: optimisticId,
      text,
      senderId: userId,
      senderName: userName,
      senderPhotoURL: userPhoto,
      attachments: attachments || [],
      mentions: mentions || [],
      mentionAll: text.toLowerCase().includes('@todos') || text.toLowerCase().includes('@everyone'),
      replyTo: replyTo || null,
      type,
      createdAt: Timestamp.now(), // Fake timestamp para UI
    };

    // Adiciona campos opcionais apenas se definidos para evitar erro de 'undefined' no Firestore
    if (poll) newMessage.poll = poll;
    if (approval) newMessage.approval = approval;
    if (richPreview) newMessage.richPreview = richPreview;
    if (parentMessageId) newMessage.parentMessageId = parentMessageId;
    if (scheduledAt) newMessage.scheduledAt = scheduledAt;

    // 2. Atualizar UI imediatamente
    set(state => ({
      messages: [...state.messages, newMessage]
    }));

    // 3. Persistir no Firebase
    try {
      const messagesRef = collection(db, 'organizations', orgId, 'chats', chatId, 'messages');
      const chatRef = doc(db, 'organizations', orgId, 'chats', chatId);

      const batch = writeBatch(db);

      // Nova Mensagem
      const msgData = {
        ...newMessage,
        createdAt: serverTimestamp(), // Real timestamp
        status: scheduledAt ? "scheduled" : "sent"
      };
      delete (msgData as any).id; // Firestore gera o ID

      const newMsgRef = doc(messagesRef);
      batch.set(newMsgRef, msgData);

      // Atualizar Chat (Denormalização)
      if (!scheduledAt && !parentMessageId) {
        batch.update(chatRef, {
          lastMessage: {
            text: type === 'text' ? text : `[${type}]`,
            senderId: userId,
            senderName: userName,
            createdAt: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        });

        // Incrementar unreadCount para outros membros
        const currentChat = get().chats.find(c => c.id === chatId);
        if (currentChat) {
          const unreadUpdates: any = {};
          currentChat.members.forEach(memberId => {
            if (memberId !== userId) {
              unreadUpdates[`unreadCount.${memberId}`] = (currentChat.unreadCount?.[memberId] || 0) + 1;
              if (mentions?.includes(memberId) || text.toLowerCase().includes('@todos') || text.toLowerCase().includes('@everyone')) {
                unreadUpdates[`unreadMentions.${memberId}`] = (currentChat.unreadMentions?.[memberId] || 0) + 1;
              }
            }
          });
          if (Object.keys(unreadUpdates).length > 0) {
            batch.update(chatRef, unreadUpdates);
          }
        }
      }

      await batch.commit();
    } catch (err: any) {
      Logger.error("[ChatStore] Error sending message:", err);
      toast.error(`Erro ao enviar: ${err.message || 'Erro desconhecido'}`);
      
      // Reverter otimismo em caso de erro
      set(state => ({
        messages: state.messages.filter(m => m.id !== optimisticId)
      }));
    }
  },

  setTypingStatus: async (orgId, chatId, userId, userName, isTyping) => {
    if (!orgId || !chatId) return;
    const typingRef = doc(db, 'organizations', orgId, 'chats', chatId, 'typing', 'status');
    try {
      await setDoc(typingRef, {
        [userId]: isTyping ? {
          displayName: userName,
          timestamp: serverTimestamp()
        } : null
      }, { merge: true });
    } catch (err) {
      Logger.error("[ChatStore] Error updating typing status:", err);
    }
  },

  deleteMessage: async (orgId, chatId, messageId) => {
    if (!orgId || !chatId) return false;
    try {
      const msgRef = doc(db, 'organizations', orgId, 'chats', chatId, 'messages', messageId);
      await updateDoc(msgRef, { 
        isDeleted: true, 
        text: "🚫 Esta mensagem foi apagada",
        attachments: [] 
      });
      return true;
    } catch (err) {
      Logger.error("[ChatStore] Error deleting message:", err);
      return false;
    }
  },

  editMessage: async (orgId, chatId, messageId, newText) => {
    if (!orgId || !chatId) return;
    const msgRef = doc(db, 'organizations', orgId, 'chats', chatId, 'messages', messageId);
    await updateDoc(msgRef, { 
      text: newText, 
      isEdited: true,
      updatedAt: serverTimestamp() 
    });
  },

  markAsRead: async (orgId, chatId, userId) => {
    if (!orgId || !chatId) return;
    const chatRef = doc(db, 'organizations', orgId, 'chats', chatId);
    await updateDoc(chatRef, {
      [`unreadCount.${userId}`]: 0,
      [`unreadMentions.${userId}`]: 0,
      [`lastRead.${userId}`]: serverTimestamp()
    });
  },

  markMessageAsRead: async (orgId, chatId, messageId, userId) => {
    if (!orgId || !chatId) return;
    const msgRef = doc(db, 'organizations', orgId, 'chats', chatId, 'messages', messageId);
    await updateDoc(msgRef, {
      readBy: arrayUnion(userId)
    });
  },

  toggleReaction: async (orgId, chatId, messageId, userId, emoji) => {
    const msgRef = doc(db, 'organizations', orgId, 'chats', chatId, 'messages', messageId);
    const msg = get().messages.find(m => m.id === messageId);
    if (!msg) return;
    const reactions = msg.reactions || {};
    const userList = reactions[emoji] || [];
    const hasReacted = userList.includes(userId);
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: hasReacted ? arrayRemove(userId) : arrayUnion(userId)
    });
  },

  votePoll: async (orgId, chatId, messageId, userId, optionId) => {
    const msgRef = doc(db, 'organizations', orgId, 'chats', chatId, 'messages', messageId);
    const msg = get().messages.find(m => m.id === messageId);
    if (!msg || !msg.poll) return;

    const newOptions = msg.poll.options.map(opt => {
      if (opt.id === optionId) {
        return {
          ...opt,
          votes: opt.votes.includes(userId) ? opt.votes.filter(id => id !== userId) : [...opt.votes, userId]
        };
      }
      return { ...opt, votes: opt.votes.filter(id => id !== userId) }; // Voto único
    });

    await updateDoc(msgRef, { "poll.options": newOptions });
  },

  togglePin: async (orgId, chatId, messageId, isPinned) => {
    const chatRef = doc(db, 'organizations', orgId, 'chats', chatId);
    await updateDoc(chatRef, {
      pinnedMessages: isPinned ? arrayRemove(messageId) : arrayUnion(messageId),
      updatedAt: serverTimestamp()
    });
  },

  toggleBookmark: async (orgId, userId, messageId, msg, chatId) => {
    const bookmarkRef = doc(db, 'organizations', orgId, 'users', userId, 'bookmarks', messageId);
    const snap = await getDoc(bookmarkRef);
    if (snap.exists()) {
      await deleteDoc(bookmarkRef);
      toast.info("Removido dos favoritos.");
    } else {
      await setDoc(bookmarkRef, {
        messageId,
        chatId,
        text: msg.text,
        senderName: msg.senderName,
        senderPhotoURL: msg.senderPhotoURL || '',
        savedAt: serverTimestamp()
      }, { merge: true });
      toast.success("Salvo nos favoritos!");
    }
  },

  respondApproval: async (orgId, chatId, messageId, userId, status) => {
    const msgRef = doc(db, 'organizations', orgId, 'chats', chatId, 'messages', messageId);
    await updateDoc(msgRef, {
      "approval.status": status,
      "approval.processedBy": userId,
      "approval.processedAt": serverTimestamp()
    });
  },

  setMessageReminder: async (orgId, userId, chatId, message, date) => {
    const remindersRef = collection(db, 'organizations', orgId, 'users', userId, 'reminders');
    await addDoc(remindersRef, {
      messageId: message.id,
      chatId,
      remindAt: Timestamp.fromDate(date),
      textPreview: message.text.substring(0, 100),
      senderName: message.senderName,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    toast.success("Lembrete agendado!");
  },

  createChannel: async (orgId, data) => {
    const channelsRef = collection(db, 'organizations', orgId, 'chats');
    const newChannel = {
      ...data,
      type: 'channel',
      orgId,
      unreadCount: {},
      unreadMentions: {},
      lastRead: {},
      lastMessage: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(channelsRef, newChannel);
    return docRef.id;
  },

  sendBotMessage: async (orgId, chatId, botName, text, type = "text", parentMessageId) => {
    if (!orgId || !chatId) return;

    try {
      const messagesRef = collection(db, 'organizations', orgId, 'chats', chatId, 'messages');
      const chatRef = doc(db, 'organizations', orgId, 'chats', chatId);

      const batch = writeBatch(db);

      const botMessage: any = {
        text,
        senderId: 'hub-bot',
        senderName: botName,
        senderPhotoURL: '', // Pode adicionar um avatar fixo aqui
        attachments: [],
        mentions: [],
        type,
        isBot: true,
        botName,
        createdAt: serverTimestamp(),
        status: 'sent'
      };

      if (parentMessageId) botMessage.parentMessageId = parentMessageId;

      const newMsgRef = doc(messagesRef);
      batch.set(newMsgRef, botMessage);

      // Atualizar Chat
      if (!parentMessageId) {
        batch.update(chatRef, {
          lastMessage: {
            text: type === 'text' ? text : `[${type}]`,
            senderId: 'hub-bot',
            senderName: botName,
            createdAt: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        });

        // Incrementar unreadCount para todos
        const currentChat = get().chats.find(c => c.id === chatId);
        if (currentChat) {
          const unreadUpdates: any = {};
          currentChat.members.forEach(memberId => {
            unreadUpdates[`unreadCount.${memberId}`] = (currentChat.unreadCount?.[memberId] || 0) + 1;
          });
          if (Object.keys(unreadUpdates).length > 0) {
            batch.update(chatRef, unreadUpdates);
          }
        }
      }

      await batch.commit();
    } catch (err) {
      Logger.error("[ChatStore] Error sending bot message:", err);
    }
  }
}), {
  name: 'hubcrm-chat-storage',
  partialize: (state) => ({ 
    chats: state.chats 
  }),
}));
