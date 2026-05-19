import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirestoreQuery } from '../useFirestoreRealtime';
import { useCRMStore } from '@/store/useCRMStore';
import { Transaction, TransactionCategory, Budget } from '@/types';

export function useTransactions() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);

  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(
      collection(db, 'organizations', orgId, 'transactions'),
      orderBy('date', 'desc')
    );
  }, [orgId]);

  return useFirestoreQuery<Transaction>(
    ['transactions', orgId],
    firestoreQuery,
    { enabled: !!orgId }
  );
}

export function useTransactionCategories() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);

  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(collection(db, 'organizations', orgId, 'transactionCategories'));
  }, [orgId]);

  return useFirestoreQuery<TransactionCategory>(
    ['transactionCategories', orgId],
    firestoreQuery,
    { enabled: !!orgId }
  );
}

export function useBudgets() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);

  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(collection(db, 'organizations', orgId, 'budgets'));
  }, [orgId]);

  return useFirestoreQuery<Budget>(
    ['budgets', orgId],
    firestoreQuery,
    { enabled: !!orgId }
  );
}

export function useCashflowProjections() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);

  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(
      collection(db, 'organizations', orgId, 'cashflow_projections'),
      orderBy('month', 'asc')
    );
  }, [orgId]);

  return useFirestoreQuery<any>(
    ['cashflow_projections', orgId],
    firestoreQuery,
    { enabled: !!orgId }
  );
}
