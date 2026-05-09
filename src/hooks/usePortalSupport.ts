import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export function usePortalSupport(orgId: string | undefined, clientId: string | undefined) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !clientId) return;

    const q = query(
      collection(db, 'organizations', orgId, 'supportRequests'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId, clientId]);

  const createRequest = async (data: { category: string; message: string; priority: string; clientName: string; imageUrl?: string }) => {
    if (!orgId || !clientId) return;

    try {
      await addDoc(collection(db, 'organizations', orgId, 'supportRequests'), {
        ...data,
        clientId,
        status: 'aberto',
        origin: 'portal',
        createdAt: serverTimestamp(),
      });
      toast.success('Chamado aberto com sucesso!');
      return true;
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Erro ao abrir chamado.');
      return false;
    }
  };

  const addMessageToRequest = async (requestId: string, message: string) => {
    if (!orgId) return;
    
    // For now, we'll use the 'message' field as the main conversation starter
    // and 'reply' as the consultant response.
    // If the user sends another message, we might need a better structure.
    // But per user request to "keep old logic", we'll stick to basic fields.
    try {
      const docRef = doc(db, 'organizations', orgId, 'supportRequests', requestId);
      await updateDoc(docRef, {
        message: message, // Overwriting for now to follow "old logic" 
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating request:', error);
      return false;
    }
  };

  return {
    requests,
    loading,
    createRequest,
    addMessageToRequest
  };
}
