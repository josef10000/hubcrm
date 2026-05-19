import { useMemo } from 'react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirestoreQuery } from './useFirestoreRealtime';
import { useCRMStore } from '@/store/useCRMStore';
import { Offer, Tag, UserProfile, Role } from '@/types';

export function useOffers() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  
  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(
      collection(db, 'organizations', orgId, 'offers'),
      orderBy('order')
    );
  }, [orgId]);

  return useFirestoreQuery<Offer>(
    ['offers', orgId],
    firestoreQuery,
    { enabled: !!orgId }
  );
}

export function useTags() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  
  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(
      collection(db, 'organizations', orgId, 'tags'),
      orderBy('name')
    );
  }, [orgId]);

  return useFirestoreQuery<Tag>(
    ['tags', orgId],
    firestoreQuery,
    { enabled: !!orgId }
  );
}

export function useTeamProfiles() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  
  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(
      collection(db, 'profiles'),
      where('orgId', '==', orgId)
    );
  }, [orgId]);

  return useFirestoreQuery<UserProfile>(
    ['teamProfiles', orgId],
    firestoreQuery,
    { enabled: !!orgId }
  );
}

export function useOrgRoles() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  
  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(
      collection(db, 'organizations', orgId, 'roles')
    );
  }, [orgId]);

  return useFirestoreQuery<Role>(
    ['orgRoles', orgId],
    firestoreQuery,
    { enabled: !!orgId }
  );
}
