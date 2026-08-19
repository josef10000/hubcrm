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
import { OfferBlueprint } from '@/types';

export const offerService = {
  async getOffers(orgId: string): Promise<OfferBlueprint[]> {
    if (!orgId) return [];
    try {
      const q = query(
        collection(db, 'organizations', orgId, 'offers'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const offers: OfferBlueprint[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        offers.push({
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as OfferBlueprint);
      });
      
      return offers;
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw error;
    }
  },

  async getOffer(orgId: string, offerId: string): Promise<OfferBlueprint | null> {
    if (!orgId) return null;
    try {
      const docRef = doc(db, 'organizations', orgId, 'offers', offerId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as OfferBlueprint;
      }
      return null;
    } catch (error) {
      console.error('Error fetching offer:', error);
      throw error;
    }
  },

  async createOffer(orgId: string, data: Omit<OfferBlueprint, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!orgId) throw new Error("orgId is required");
    try {
      const docRef = await addDoc(collection(db, 'organizations', orgId, 'offers'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  },

  async updateOffer(orgId: string, offerId: string, data: Partial<OfferBlueprint>): Promise<void> {
    if (!orgId) throw new Error("orgId is required");
    try {
      const docRef = doc(db, 'organizations', orgId, 'offers', offerId);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if ((updateData as any)[key] === undefined) {
          delete (updateData as any)[key];
        }
      });

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating offer:', error);
      throw error;
    }
  },

  async deleteOffer(orgId: string, offerId: string): Promise<void> {
    if (!orgId) throw new Error("orgId is required");
    try {
      const docRef = doc(db, 'organizations', orgId, 'offers', offerId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting offer:', error);
      throw error;
    }
  }
};
