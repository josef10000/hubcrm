import { StateCreator } from 'zustand';
import { SupportRequest } from '@/types';
import { CRMStoreState } from '../types';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SupportSlice {
  supportRequests: SupportRequest[];
  setSupportRequests: (requests: SupportRequest[]) => void;
  handleCreateSupportRequest: (data: {
    clientId: string;
    clientName: string;
    category: string;
    priority: 'baixa' | 'media' | 'alta';
    message: string;
    whatsappContext?: string;
    origin?: string;
  }) => Promise<void>;
}

export const createSupportSlice: StateCreator<
  CRMStoreState,
  [],
  [],
  SupportSlice
> = (set, get) => ({
  supportRequests: [],
  setSupportRequests: (requests) => set({ supportRequests: requests }),
  handleCreateSupportRequest: async (data) => {
    const { effectiveOrgId } = get();
    if (!effectiveOrgId) throw new Error("ID da organização não disponível.");

    try {
      const ref = collection(db, 'organizations', effectiveOrgId, 'supportRequests');
      const newDocRef = doc(ref);
      await setDoc(newDocRef, {
        ...data,
        status: 'aberto',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[CRMStore] Error creating support request:", error);
      throw error;
    }
  }
});
