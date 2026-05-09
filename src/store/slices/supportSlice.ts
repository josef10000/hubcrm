import { StateCreator } from 'zustand';
import { SupportRequest } from '@/types';
import { CRMStoreState } from '../types';

export interface SupportSlice {
  supportRequests: SupportRequest[];
  setSupportRequests: (requests: SupportRequest[]) => void;
}

export const createSupportSlice: StateCreator<
  CRMStoreState,
  [],
  [],
  SupportSlice
> = (set) => ({
  supportRequests: [],
  setSupportRequests: (requests) => set({ supportRequests: requests }),
});
