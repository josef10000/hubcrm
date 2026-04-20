import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { MessageBookmark } from '../types/chat.types';

export function useBookmarks() {
  const { userProfile } = useAuth();
  const [bookmarks, setBookmarks] = useState<MessageBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid || !userProfile?.orgId) return;

    const bookmarksRef = collection(db, 'organizations', userProfile.orgId, 'users', userProfile.uid, 'bookmarks');
    const q = query(bookmarksRef, orderBy('savedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          messageId: data.messageId,
          chatId: data.chatId,
          text: data.text,
          senderName: data.senderName,
          senderPhotoURL: data.senderPhotoURL,
          savedAt: data.savedAt
        } as MessageBookmark;
      });
      setBookmarks(bks);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bookmarks:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid, userProfile?.orgId]);

  return { bookmarks, loading };
}
