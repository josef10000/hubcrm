import { useMemo } from 'react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirestoreQuery } from '../useFirestoreRealtime';
import { useCRMStore } from '@/store/useCRMStore';
import { useAuth } from '@auth/contexts/AuthContext';
import { Client, Lead } from '@/types';

export function useClients() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  const { user, userProfile } = useAuth();
  const permissions = userProfile?.permissions || [];

  const firestoreQuery = useMemo(() => {
    if (!orgId || !user) return null;
    
    // Se não tem permissão para ver todos, filtra pelos designados
    if (!permissions.includes('MANAGE_TEAM') && !permissions.includes('MANAGE_SETTINGS')) {
      return query(
        collection(db, 'organizations', orgId, 'clients'),
        where('assignedTo', '==', user.uid)
      );
    }
    
    return query(collection(db, 'organizations', orgId, 'clients'));
  }, [orgId, user, permissions]);

  return useFirestoreQuery<Client>(
    ['clients', orgId, user?.uid], // Include user.uid in key to refetch if auth changes
    firestoreQuery,
    { enabled: !!orgId && !!user }
  );
}

export function useLeads() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  
  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(
      collection(db, 'organizations', orgId, 'leads'),
      orderBy('createdAt', 'desc')
    );
  }, [orgId]);

  return useFirestoreQuery<Lead>(
    ['leads', orgId],
    firestoreQuery,
    { enabled: !!orgId }
  );
}
