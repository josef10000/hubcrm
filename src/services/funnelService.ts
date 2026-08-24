import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FunnelBlueprint } from '@/types';

export const funnelService = {
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
      const docRef = await addDoc(collection(db, 'organizations', orgId, 'funnels'), {
        ...data,
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
      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      delete updateData.id;
      delete updateData.createdAt;

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await updateDoc(docRef, updateData);
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
