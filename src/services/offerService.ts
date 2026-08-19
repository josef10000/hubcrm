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
        collection(db, 'organizations', orgId, 'offer_blueprints'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const offers: OfferBlueprint[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        offers.push({
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
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
      const docRef = doc(db, 'organizations', orgId, 'offer_blueprints', offerId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
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
      const docRef = await addDoc(collection(db, 'organizations', orgId, 'offer_blueprints'), {
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
      const docRef = doc(db, 'organizations', orgId, 'offer_blueprints', offerId);
      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      delete updateData.id;
      delete updateData.createdAt;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
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
      const docRef = doc(db, 'organizations', orgId, 'offer_blueprints', offerId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting offer:', error);
      throw error;
    }
  }
};
