import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, QuerySnapshot, DocumentData, serverTimestamp } from 'firebase/firestore';

/**
 * Service to handle all Firestore operations related to Support Requests.
 */
export const supportService = {
  /**
   * Subscribes to support requests for an organization.
   */
  subscribeToRequests: (orgId: string, callback: (requests: any[]) => void) => {
    if (!orgId) return () => {};
    const q = query(collection(db, 'organizations', orgId, 'supportRequests'));
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(loaded);
    });
  },

  /**
   * Updates a specific support request.
   */
  updateRequest: async (orgId: string, requestId: string, data: any) => {
    return await setDoc(doc(db, 'organizations', orgId, 'supportRequests', requestId), data, { merge: true });
  },

  /**
   * Sends a reply to a support request.
   */
  sendReply: async (orgId: string, requestId: string, message: string, currentStatus: string) => {
    return await setDoc(doc(db, 'organizations', orgId, 'supportRequests', requestId), { 
      reply: message,
      repliedAt: serverTimestamp(),
      status: currentStatus === 'aberto' ? 'em_analise' : currentStatus
    }, { merge: true });
  },

  /**
   * Deletes a support request.
   */
  deleteRequest: async (orgId: string, requestId: string) => {
    return await deleteDoc(doc(db, 'organizations', orgId, 'supportRequests', requestId));
  }
};
