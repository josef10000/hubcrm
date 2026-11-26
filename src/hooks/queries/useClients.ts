import { useMemo } from 'react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirestoreQuery } from '../useFirestoreRealtime';
import { useCRMStore } from '@/store/useCRMStore';
import { useAuth } from '@auth/contexts/AuthContext';
import { Client, Lead } from '@/types';
import { useOffers } from './useCRMQueries';
import { useTransactions } from './useFinance';
import { filterClientsByContext, useScreenContext } from '@/domains/screens/utils/screenContext';

export function useClients() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  const { user, userProfile } = useAuth();
  const permissions = userProfile?.permissions || [];
  const context = useScreenContext();
  const { data: offers = [] } = useOffers();
  const { data: transactions = [] } = useTransactions();

  const firestoreQuery = useMemo(() => {
    if (!orgId || !user) return null;
    if (!permissions.includes('MANAGE_TEAM') && !permissions.includes('MANAGE_SETTINGS')) {
      return query(collection(db, 'organizations', orgId, 'clients'), where('assignedTo', '==', user.uid));
    }
    return query(collection(db, 'organizations', orgId, 'clients'));
  }, [orgId, user, permissions]);

  const queryResult = useFirestoreQuery<Client>(
    ['clients', orgId, user?.uid],
    firestoreQuery,
    { enabled: !!orgId && !!user }
  );

  const filteredData = useMemo(
    () => filterClientsByContext(queryResult.data || [], transactions, offers, context),
    [queryResult.data, transactions, offers, context]
  );

  return { ...queryResult, data: filteredData };
}

export function useLeads() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(collection(db, 'organizations', orgId, 'leads'), orderBy('createdAt', 'desc'));
  }, [orgId]);
  return useFirestoreQuery<Lead>(['leads', orgId], firestoreQuery, { enabled: !!orgId });
}
