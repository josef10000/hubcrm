import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface CanvasDocument {
  id?: string;
  title: string;
  document: string; // JSON string containing tldraw snapshot
  createdBy: string;
  isPublic: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION_NAME = 'canvases';

export const canvasService = {
  // Get all canvases (either public or owned by the user)
  async getCanvases(orgId: string, userId: string): Promise<CanvasDocument[]> {
    if (!orgId) return [];
    try {
      const q = query(
        collection(db, 'organizations', orgId, 'canvases'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const canvases: CanvasDocument[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only include if public or created by the user
        if (data.isPublic || data.createdBy === userId) {
          canvases.push({
            id: docSnap.id,
            title: data.title,
            document: data.document,
            createdBy: data.createdBy,
            isPublic: data.isPublic,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          });
        }
      });
      
      return canvases;
    } catch (error) {
      console.error('Error fetching canvases:', error);
      throw error;
    }
  },

  // Get a single canvas
  async getCanvas(orgId: string, canvasId: string): Promise<CanvasDocument | null> {
    if (!orgId) return null;
    try {
      const docRef = doc(db, 'organizations', orgId, 'canvases', canvasId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          document: data.document,
          createdBy: data.createdBy,
          isPublic: data.isPublic,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching canvas:', error);
      throw error;
    }
  },

  // Create a new canvas
  async createCanvas(orgId: string, data: Omit<CanvasDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!orgId) throw new Error("orgId is required");
    try {
      const docRef = await addDoc(collection(db, 'organizations', orgId, 'canvases'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating canvas:', error);
      throw error;
    }
  },

  // Update an existing canvas
  async updateCanvas(orgId: string, canvasId: string, data: Partial<CanvasDocument>): Promise<void> {
    if (!orgId) throw new Error("orgId is required");
    try {
      const docRef = doc(db, 'organizations', orgId, 'canvases', canvasId);
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
      console.error('Error updating canvas:', error);
      throw error;
    }
  },

  // Delete a canvas
  async deleteCanvas(orgId: string, canvasId: string): Promise<void> {
    if (!orgId) throw new Error("orgId is required");
    try {
      const docRef = doc(db, 'organizations', orgId, 'canvases', canvasId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting canvas:', error);
      throw error;
    }
  }
};
