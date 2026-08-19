import { useEffect, useState, useRef } from 'react';
import { Editor, TLRecord } from 'tldraw';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';

export function useFirestoreSync(editor: Editor | null, orgId: string | undefined, canvasId: string | undefined) {
  const [isSynced, setIsSynced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ref para armazenar mudanças pendentes no debounce
  const pendingChangesRef = useRef<{
    added: Record<string, TLRecord>;
    updated: Record<string, TLRecord>;
    removed: Record<string, TLRecord>;
  }>({ added: {}, updated: {}, removed: {} });

  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editor || !orgId || !canvasId) return;

    const recordsRef = collection(db, 'organizations', orgId, 'canvases', canvasId, 'records');

    // 1. Escutar alterações remotas (Firestore -> Tldraw)
    const unsubscribeFirestore = onSnapshot(recordsRef, (snapshot) => {
      const changes = snapshot.docChanges();
      
      const toMerge: TLRecord[] = [];
      const toRemove: TLRecord['id'][] = [];
      
      changes.forEach(change => {
        const data = change.doc.data() as TLRecord;
        if (['instance', 'camera', 'instance_page_state', 'instance_presence', 'pointer'].includes(data.typeName)) return;

        // Sanitização de dados corrompidos
        if (data.typeName === 'shape' && data.type === 'geo') {
          if (data.props && 'text' in data.props) {
            delete (data.props as any).text;
          }
        }

        if (change.type === 'added' || change.type === 'modified') {
          toMerge.push(data);
        } else if (change.type === 'removed') {
          toRemove.push(data.id);
        }
      });
      
      if (toMerge.length > 0 || toRemove.length > 0) {
        editor.store.mergeRemoteChanges(() => {
          if (toMerge.length > 0) {
            editor.store.put(toMerge);
          }
          if (toRemove.length > 0) {
            editor.store.remove(toRemove);
          }
        });
      }
      
      setIsSynced(true);
    });

    // 2. Escutar alterações locais (Tldraw -> Firestore) com DEBOUNCE
    const unsubscribeEditor = editor.store.listen(
      (update) => {
        if (update.source === 'remote') return;

        let hasRelevantChanges = false;
        const pending = pendingChangesRef.current;

        Object.values(update.changes.added).forEach(record => {
           if (['instance', 'camera', 'instance_page_state', 'instance_presence', 'pointer'].includes(record.typeName)) return;
           pending.added[record.id] = record;
           hasRelevantChanges = true;
        });

        Object.values(update.changes.updated).forEach(([_, newRecord]) => {
           if (['instance', 'camera', 'instance_page_state', 'instance_presence', 'pointer'].includes(newRecord.typeName)) return;
           pending.updated[newRecord.id] = newRecord;
           hasRelevantChanges = true;
        });

        Object.values(update.changes.removed).forEach(record => {
           if (['instance', 'camera', 'instance_page_state', 'instance_presence', 'pointer'].includes(record.typeName)) return;
           pending.removed[record.id] = record;
           delete pending.added[record.id];
           delete pending.updated[record.id];
           hasRelevantChanges = true;
        });

        if (hasRelevantChanges) {
          setIsSaving(true);
          
          if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = window.setTimeout(() => {
            const batch = writeBatch(db);
            let hasBatchWrites = false;

            Object.values(pending.added).forEach(record => {
              batch.set(doc(recordsRef, record.id), record);
              hasBatchWrites = true;
            });

            Object.values(pending.updated).forEach(record => {
              batch.set(doc(recordsRef, record.id), record);
              hasBatchWrites = true;
            });

            Object.values(pending.removed).forEach(record => {
              batch.delete(doc(recordsRef, record.id));
              hasBatchWrites = true;
            });

            if (hasBatchWrites) {
              batch.commit()
                .then(() => setIsSaving(false))
                .catch(e => {
                  console.error("Hub Canvas Sync Error:", e);
                  setIsSaving(false);
                });
            } else {
              setIsSaving(false);
            }

            pendingChangesRef.current = { added: {}, updated: {}, removed: {} };
          }, 800);
        }
      },
      { scope: 'document' }
    );

    return () => {
      unsubscribeFirestore();
      unsubscribeEditor();
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [editor, orgId, canvasId]);

  return { isSynced, isSaving };
}
