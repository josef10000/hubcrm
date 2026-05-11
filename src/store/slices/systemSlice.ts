import { StateCreator } from 'zustand';
import { CRMStoreState } from '../types';

export interface SystemSlice {
  isSystemLoading: boolean;
}

export const createSystemSlice: StateCreator<
  CRMStoreState,
  [['zustand/persist', unknown]],
  [],
  SystemSlice
> = (set) => ({
  isSystemLoading: false
});
