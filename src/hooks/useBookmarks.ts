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
          ...data
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

  const updateBookmark = async (id: string, updates: Partial<MessageBookmark>) => {
    if (!userProfile?.uid || !userProfile?.orgId) return;
    const { doc: fireDoc, updateDoc } = await import('firebase/firestore');
    const bookmarkRef = fireDoc(db, 'organizations', userProfile.orgId, 'users', userProfile.uid, 'bookmarks', id);
    await updateDoc(bookmarkRef, updates);
  };

  const removeBookmark = async (id: string) => {
    if (!userProfile?.uid || !userProfile?.orgId) return;
    const { doc: fireDoc, deleteDoc } = await import('firebase/firestore');
    const bookmarkRef = fireDoc(db, 'organizations', userProfile.orgId, 'users', userProfile.uid, 'bookmarks', id);
    await deleteDoc(bookmarkRef);
  };

  return { bookmarks, loading, updateBookmark, removeBookmark };
}
