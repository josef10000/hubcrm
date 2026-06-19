import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirestoreQuery } from '@/hooks/useFirestoreRealtime';
import { useCRMStore } from '@/store/useCRMStore';
import { CreativeEntity } from '../entities/creative.entity';

export function useCreatives() {
  const orgId = useCRMStore((state) => state.effectiveOrgId);
  
  const firestoreQuery = useMemo(() => {
    if (!orgId) return null;
    return query(
      collection(db, 'organizations', orgId, 'hubads_creatives'),
      orderBy('createdAt', 'desc')
    );
  }, [orgId]);

  return useFirestoreQuery<CreativeEntity>(
    ['hubads_creatives', orgId],
    firestoreQuery,
    { enabled: !!orgId }
  );
}
