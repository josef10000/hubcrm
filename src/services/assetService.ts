import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, addDoc, setDoc, deleteDoc, doc, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { Asset } from '@/types/people';

/**
 * Service to handle all Firestore operations related to Assets.
 * Follows Repository Pattern principles.
 */
export const assetService = {
  /**
   * Subscribes to real-time updates of assets for a specific organization.
   */
  subscribeToAssets: (orgId: string, callback: (assets: Asset[]) => void) => {
    if (!orgId) return () => {};

    const q = query(collection(db, 'organizations', orgId, 'assets'));
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const loaded = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as Asset));
      callback(loaded);
    });
  },

  /**
   * Adds a new asset to the organization. Supports custom ID.
   */
  addAsset: async (orgId: string, assetData: Partial<Asset>, customId?: string) => {
    if (!orgId) throw new Error('OrgId is required');
    
    if (customId) {
      const docRef = doc(db, 'organizations', orgId, 'assets', customId);
      await setDoc(docRef, {
        ...assetData,
        assignedAt: Date.now(),
        orgId: orgId
      });
      return docRef;
    }
    
    return await addDoc(collection(db, 'organizations', orgId, 'assets'), {
      ...assetData,
      assignedAt: Date.now(),
      orgId: orgId
    });
  },

  /**
   * Deletes an asset by ID.
   */
  deleteAsset: async (orgId: string, assetId: string) => {
    if (!orgId || !assetId) throw new Error('OrgId and AssetId are required');
    
    return await deleteDoc(doc(db, 'organizations', orgId, 'assets', assetId));
  }
};
