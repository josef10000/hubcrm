import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { MessageBookmark } from '../types/chat.types';

export function useBookmarks() {
  const { userProfile, organization } = useAuth();
  const [bookmarks, setBookmarks] = useState<MessageBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid || !organization?.id) return;

    const bookmarksRef = collection(db, 'organizations', organization.id, 'users', userProfile.uid, 'bookmarks');
    const q = query(bookmarksRef, orderBy('savedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MessageBookmark[];
      setBookmarks(bks);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bookmarks:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid, organization?.id]);

  return { bookmarks, loading };
}
