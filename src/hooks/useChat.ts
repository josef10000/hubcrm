import { useEffect, useCallback } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../contexts/CRMContext';
import { ChatMessage } from '../types/chat.types';
import { Timestamp } from 'firebase/firestore';

export function useChat(chatId: string | null) {
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
  const store = useChatStore();

  useEffect(() => {
    if (effectiveOrgId && chatId) {
      const unsubscribe = store.loadMessages(effectiveOrgId, chatId);
      return () => unsubscribe();
    }
  }, [effectiveOrgId, chatId]);

  const sendMessage = useCallback(async (
    text: string, 
    mentions: string[] = [], 
    attachments: string[] = [], 
    replyTo: ChatMessage['replyTo'] = null,
    members: string[] = [],
    type: ChatMessage['type'] = "text",
    poll?: ChatMessage['poll'],
    approval?: ChatMessage['approval'],
    richPreview?: ChatMessage['richPreview'],
    parentMessageId?: string,
    scheduledAt?: Timestamp
  ) => {
    console.log("[useChat] Chamando sendMessage:", { text, type, chatId, orgId: effectiveOrgId });
    if (!effectiveOrgId || !chatId || !userProfile) {
      console.warn("[useChat] Abortando envio: dados insuficientes", { effectiveOrgId, chatId, userProfile: !!userProfile });
      return;
    }
    await store.sendMessage(
      effectiveOrgId, chatId, userProfile.uid, 
      userProfile.displayName || 'Membro', userProfile.photoURL || '',
      text, mentions, attachments, replyTo, type, poll, approval, richPreview, parentMessageId, scheduledAt
    );
  }, [effectiveOrgId, chatId, userProfile]);

  const setTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!effectiveOrgId || !chatId || !userProfile) return;
    await store.setTypingStatus(effectiveOrgId, chatId, userProfile.uid, userProfile.displayName || 'Membro', isTyping);
  }, [effectiveOrgId, chatId, userProfile]);

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!effectiveOrgId || !chatId) return false;
    return await store.deleteMessage(effectiveOrgId, chatId, messageId);
  }, [effectiveOrgId, chatId]);

  const editMessage = useCallback(async (messageId: string, text: string) => {
    if (!effectiveOrgId || !chatId) return;
    await store.editMessage(effectiveOrgId, chatId, messageId, text);
  }, [effectiveOrgId, chatId]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!effectiveOrgId || !chatId || !userProfile) return;
    await store.toggleReaction(effectiveOrgId, chatId, messageId, userProfile.uid, emoji);
  }, [effectiveOrgId, chatId, userProfile]);

  const votePoll = useCallback(async (messageId: string, optionId: string) => {
    if (!effectiveOrgId || !chatId || !userProfile) return;
    await store.votePoll(effectiveOrgId, chatId, messageId, userProfile.uid, optionId);
  }, [effectiveOrgId, chatId, userProfile]);

  const togglePin = useCallback(async (messageId: string) => {
    if (!effectiveOrgId || !chatId) return;
    await store.togglePin(effectiveOrgId, chatId, messageId, false);
  }, [effectiveOrgId, chatId]);

  const unpinMessage = useCallback(async (messageId: string) => {
    if (!effectiveOrgId || !chatId) return;
    await store.togglePin(effectiveOrgId, chatId, messageId, true);
  }, [effectiveOrgId, chatId]);

  const toggleBookmark = useCallback(async (msg: ChatMessage) => {
    if (!effectiveOrgId || !userProfile || !chatId) return;
    await store.toggleBookmark(effectiveOrgId, userProfile.uid, msg.id, msg, chatId);
  }, [effectiveOrgId, userProfile, chatId]);

  const respondApproval = useCallback(async (messageId: string, status: 'approved' | 'rejected') => {
    if (!effectiveOrgId || !chatId || !userProfile) return;
    await store.respondApproval(effectiveOrgId, chatId, messageId, userProfile.uid, status);
  }, [effectiveOrgId, chatId, userProfile]);

  const setMessageReminder = useCallback(async (message: ChatMessage, date: Date) => {
    if (!effectiveOrgId || !userProfile || !chatId) return;
    await store.setMessageReminder(effectiveOrgId, userProfile.uid, chatId, message, date);
  }, [effectiveOrgId, userProfile, chatId]);

  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!effectiveOrgId || !chatId || !userProfile) return;
    await store.markMessageAsRead(effectiveOrgId, chatId, messageId, userProfile.uid);
  }, [effectiveOrgId, chatId, userProfile]);

  return {
    messages: store.messages,
    typing: store.typing,
    loading: store.loadingMessages,
    sendMessage,
    setTypingStatus,
    deleteMessage,
    editMessage,
    toggleReaction,
    votePoll,
    togglePin,
    unpinMessage,
    toggleBookmark,
    respondApproval,
    setMessageReminder,
    markMessageAsRead,
    sharedMedia: store.messages.filter(m => m.attachments && m.attachments.length > 0)
  };
}
