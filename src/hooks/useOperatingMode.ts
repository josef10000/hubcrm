import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCRMStore } from '@/store/useCRMStore';

export type OperatingMode = 'solo' | 'team';

/** Solo is the safe default for existing organizations; the setting only changes visibility/automation. */
export function useOperatingMode() {
  const orgId = useCRMStore(state => state.effectiveOrgId);
  const [mode, setMode] = useState<OperatingMode>('solo');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMode('solo');
    if (!orgId) { setReady(true); return; }
    setReady(false);
    return onSnapshot(doc(db, 'organizations', orgId, 'settings', 'preferences'), snapshot => {
      const value = snapshot.data()?.operatingMode;
      setMode(value === 'team' ? 'team' : 'solo');
      setReady(true);
    }, () => { setMode('solo'); setReady(true); });
  }, [orgId]);

  return { mode, isSolo: mode === 'solo', ready };
}
