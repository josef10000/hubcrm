import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirestoreQuery } from '../useFirestoreRealtime';
import { useCRMStore } from '@/store/useCRMStore';
import { Transaction, TransactionCategory, Budget } from '@/types';
import { useOffers } from './useCRMQueries';
import { filterTransactionsByContext, useScreenContext } from '@/domains/screens/utils/screenContext';

export function useTransactions() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  const context = useScreenContext();
  const { data: offers = [] } = useOffers();
  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(collection(db, 'organizations', orgId, 'transactions'), orderBy('date', 'desc'));
  }, [orgId]);
  const queryResult = useFirestoreQuery<Transaction>(['transactions', orgId], firestoreQuery, { enabled: !!orgId });
  const filteredData = useMemo(() => filterTransactionsByContext(queryResult.data || [], offers, context), [queryResult.data, offers, context]);
  return { ...queryResult, data: filteredData };
}

export function useTransactionCategories() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(collection(db, 'organizations', orgId, 'transactionCategories'));
  }, [orgId]);
  return useFirestoreQuery<TransactionCategory>(['transactionCategories', orgId], firestoreQuery, { enabled: !!orgId });
}

export function useBudgets() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(collection(db, 'organizations', orgId, 'budgets'));
  }, [orgId]);
  return useFirestoreQuery<Budget>(['budgets', orgId], firestoreQuery, { enabled: !!orgId });
}

export function useCashflowProjections() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(collection(db, 'organizations', orgId, 'cashflow_projections'), orderBy('month', 'asc'));
  }, [orgId]);
  return useFirestoreQuery<any>(['cashflow_projections', orgId], firestoreQuery, { enabled: !!orgId });
}
