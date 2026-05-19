import { StateCreator } from 'zustand';
import { 
  collection, doc, setDoc, deleteDoc, 
  query, where, onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Transaction, TransactionCategory, Budget } from '@/types';
import { CRMStoreState } from '../types';

export interface FinanceSlice {
  handleSaveTransaction: (data: Partial<Transaction>) => Promise<void>;
  handleDeleteTransaction: (id: string) => Promise<void>;
  handleSaveBudget: (data: Partial<Budget>) => Promise<void>;
}

export const createFinanceSlice: StateCreator<
  CRMStoreState,
  [],
  [],
> = (set, get) => ({
  handleSaveTransaction: async (data) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      const id = data.id || doc(collection(db, 'organizations', orgId, 'transactions')).id;
      await setDoc(doc(db, 'organizations', orgId, 'transactions', id), {
        ...data,
        id,
        date: data.date || Date.now()
      }, { merge: true });
      toast.success('Transação salva!');
    } catch (err) {
      console.error("[FinanceSlice] Error saving transaction:", err);
    }
  },

  handleDeleteTransaction: async (id) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'transactions', id));
      toast.success('Transação removida.');
    } catch (err) {
      console.error("[FinanceSlice] Error deleting transaction:", err);
    }
  },

  handleSaveBudget: async (data) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      const id = data.id || doc(collection(db, 'organizations', orgId, 'budgets')).id;
      await setDoc(doc(db, 'organizations', orgId, 'budgets', id), {
        ...data,
        id
      }, { merge: true });
      toast.success('Orçamento atualizado!');
    } catch (err) {
      console.error("[FinanceSlice] Error saving budget:", err);
    }
  },
});
