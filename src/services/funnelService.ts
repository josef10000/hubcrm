import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FunnelBlueprint } from '@/types';

export interface FunnelVersion {
  id: string;
  createdAt: Date;
  snapshot: Partial<FunnelBlueprint>;
}

/**
 * Sanitiza recursivamente objetos e arrays, eliminando propriedades com valor undefined
 * que são rejeitadas pelo SDK do Firebase Firestore.
 */
function sanitizeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeFirestoreData(item));
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeFirestoreData(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export const funnelService = {
  async createFunnelVersion(orgId: string, funnelId: string, snapshot: FunnelBlueprint): Promise<void> {
    const data = sanitizeFirestoreData(snapshot) as Record<string, unknown>;
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    await addDoc(collection(db, 'organizations', orgId, 'funnels', funnelId, 'versions'), {
      snapshot: data,
      createdAt: serverTimestamp(),
    });
  },

  async getFunnelVersions(orgId: string, funnelId: string): Promise<FunnelVersion[]> {
    const versions = await getDocs(query(
      collection(db, 'organizations', orgId, 'funnels', funnelId, 'versions'),
      orderBy('createdAt', 'desc'),
      limit(20),
    ));
    return versions.docs.map(version => {
      const data = version.data();
      return {
        id: version.id,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        snapshot: data.snapshot as Partial<FunnelBlueprint>,
      };
    });
  },

  async getFunnels(orgId: string): Promise<FunnelBlueprint[]> {
    if (!orgId) return [];
    try {
      const q = query(
        collection(db, 'organizations', orgId, 'funnels'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const funnels: FunnelBlueprint[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        funnels.push({
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as FunnelBlueprint);
      });
      
      return funnels;
    } catch (error) {
      console.error('Error fetching funnels:', error);
      throw error;
    }
  },

  async getFunnel(orgId: string, funnelId: string): Promise<FunnelBlueprint | null> {
    if (!orgId || !funnelId) return null;
    try {
      const docRef = doc(db, 'organizations', orgId, 'funnels', funnelId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as FunnelBlueprint;
      }
      return null;
    } catch (error) {
      console.error('Error fetching funnel:', error);
      throw error;
    }
  },

  async createFunnel(orgId: string, data: Omit<FunnelBlueprint, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!orgId) throw new Error('orgId is required');
    try {
      const sanitized = sanitizeFirestoreData(data);
      if (sanitized) {
        delete sanitized.id;
        delete sanitized.createdAt;
        delete sanitized.updatedAt;
      }

      const docRef = await addDoc(collection(db, 'organizations', orgId, 'funnels'), {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating funnel:', error);
      throw error;
    }
  },

  async updateFunnel(orgId: string, funnelId: string, data: Partial<FunnelBlueprint>): Promise<void> {
    if (!orgId || !funnelId) throw new Error('orgId and funnelId are required');
    try {
      const docRef = doc(db, 'organizations', orgId, 'funnels', funnelId);
      const sanitized = sanitizeFirestoreData(data);
      if (sanitized) {
        delete sanitized.id;
        delete sanitized.createdAt;
        delete sanitized.updatedAt;
      }

      const updateData: any = {
        ...sanitized,
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, updateData, { merge: true });
    } catch (error) {
      console.error('Error updating funnel:', error);
      throw error;
    }
  },

  async deleteFunnel(orgId: string, funnelId: string): Promise<void> {
    if (!orgId || !funnelId) throw new Error('orgId and funnelId are required');
    try {
      const docRef = doc(db, 'organizations', orgId, 'funnels', funnelId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting funnel:', error);
      throw error;
    }
  },
};
