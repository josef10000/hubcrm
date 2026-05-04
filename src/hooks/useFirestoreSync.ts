import { useEffect, useState } from 'react';
import { Editor, TLRecord } from 'tldraw';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';

export function useFirestoreSync(editor: Editor | null, orgId: string | undefined, canvasId: string | undefined) {
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!editor || !orgId || !canvasId) return;

    let isSyncingToFirestore = false;
    const recordsRef = collection(db, 'organizations', orgId, 'canvases', canvasId, 'records');

    // 1. Escutar alterações remotas (Firestore -> Tldraw)
    const unsubscribeFirestore = onSnapshot(recordsRef, (snapshot) => {
      const changes = snapshot.docChanges();
      
      const toMerge: TLRecord[] = [];
      const toRemove: TLRecord['id'][] = [];
      
      changes.forEach(change => {
        const data = change.doc.data() as TLRecord;
        if (['instance', 'camera', 'instance_page_state', 'instance_presence', 'pointer'].includes(data.typeName)) return;

        // Sanitização de dados corrompidos (ex: geo shapes antigos com propriedade text que quebra o schema do v3)
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

    // 2. Escutar alterações locais (Tldraw -> Firestore)
    const unsubscribeEditor = editor.store.listen(
      (update) => {
        const batch = writeBatch(db);
        let hasChanges = false;

        Object.values(update.changes.added).forEach(record => {
           if (['instance', 'camera', 'instance_page_state', 'instance_presence', 'pointer'].includes(record.typeName)) return;
           const docRef = doc(recordsRef, record.id);
           batch.set(docRef, record);
           hasChanges = true;
        });

        Object.values(update.changes.updated).forEach(([oldRecord, newRecord]) => {
           if (['instance', 'camera', 'instance_page_state', 'instance_presence', 'pointer'].includes(newRecord.typeName)) return;
           const docRef = doc(recordsRef, newRecord.id);
           batch.set(docRef, newRecord);
           hasChanges = true;
        });

        Object.values(update.changes.removed).forEach(record => {
           if (['instance', 'camera', 'instance_page_state', 'instance_presence', 'pointer'].includes(record.typeName)) return;
           const docRef = doc(recordsRef, record.id);
           batch.delete(docRef);
           hasChanges = true;
        });
        
        if (hasChanges) {
          batch.commit().catch(e => console.error("Hub Canvas Sync Error:", e));
        }
      },
      { source: 'user', scope: 'document' } // Somente ações geradas pelo usuário atual
    );

    return () => {
      unsubscribeFirestore();
      unsubscribeEditor();
    };
  }, [editor, orgId, canvasId]);

  return isSynced;
}
