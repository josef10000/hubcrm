import { StateCreator } from 'zustand';
import { 
  collection, doc, setDoc, deleteDoc, 
  updateDoc, arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { WikiArticle, WikiComment } from '@/types';
import { CRMStoreState } from '@/types';

export interface WikiSlice {
  wikiArticles: WikiArticle[];
  beginnerGuideArticleId: string;
  
  handleSaveWikiArticle: (articleData: Partial<WikiArticle>) => Promise<void>;
  handleDeleteWikiArticle: (articleId: string) => Promise<void>;
  handleToggleWikiStar: (articleId: string) => Promise<void>;
  handleAddWikiComment: (articleId: string, comment: Partial<WikiComment>) => Promise<void>;
  handleMarkWikiArticleAsRead: (articleId: string) => Promise<void>;
}

export const createWikiSlice: StateCreator<
  CRMStoreState,
  [],
  [],
  WikiSlice
> = (set, get) => ({
  wikiArticles: [],
  beginnerGuideArticleId: '',

  handleSaveWikiArticle: async (articleData) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      const id = articleData.id || doc(collection(db, 'organizations', orgId, 'wikiArticles')).id;
      await setDoc(doc(db, 'organizations', orgId, 'wikiArticles', id), {
        ...articleData,
        id,
        updatedAt: Date.now(),
        createdAt: articleData.createdAt || Date.now()
      }, { merge: true });
      toast.success('Artigo salvo!');
    } catch (err) {
      console.error("[WikiSlice] Error saving wiki:", err);
    }
  },

  handleDeleteWikiArticle: async (articleId) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'wikiArticles', articleId));
      toast.success('Artigo removido.');
    } catch (err) {
      console.error("[WikiSlice] Error deleting wiki:", err);
    }
  },

  handleToggleWikiStar: async (articleId) => {
    const orgId = get().effectiveOrgId;
    const userId = get().currentUserId;
    if (!orgId || !userId) return;
    
    const article = get().wikiArticles.find(a => a.id === articleId);
    if (!article) return;
    
    const stars = article.stars || [];
    const isStarred = stars.includes(userId);
    const newStars = isStarred ? stars.filter(u => u !== userId) : [...stars, userId];
    
    try {
      await setDoc(doc(db, 'organizations', orgId, 'wikiArticles', articleId), { 
        stars: newStars 
      }, { merge: true });
    } catch (err) {
      console.error("[WikiSlice] Error toggling wiki star:", err);
    }
  },

  handleAddWikiComment: async (articleId, comment) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    const commentId = doc(collection(db, 'organizations', orgId, 'wikiArticles', articleId, 'comments')).id;
    await setDoc(doc(db, 'organizations', orgId, 'wikiArticles', articleId, 'comments', commentId), {
      ...comment,
      id: commentId,
      createdAt: Date.now()
    });
  },

  handleMarkWikiArticleAsRead: async (articleId) => {
    const userId = get().currentUserId;
    if (!userId) return;
    try {
      const profileRef = doc(db, 'profiles', userId);
      await updateDoc(profileRef, {
        viewedWikiArticles: arrayUnion(articleId)
      });
    } catch (err) {
      console.error("[WikiSlice] Error marking wiki as read:", err);
    }
  },
});
