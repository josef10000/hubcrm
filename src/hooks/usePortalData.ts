import { useState, useEffect } from 'react';
import { doc, collection, query, where, onSnapshot, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function usePortalData(orgId: string | undefined, initialClientId: string | undefined) {
  const [activeClientId, setActiveClientId] = useState<string | undefined>(initialClientId);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Buscar todas as assinaturas (clientes) com o mesmo CPF/CNPJ
  useEffect(() => {
    if (!orgId || !initialClientId) return;

    const fetchAllSubscriptions = async () => {
      try {
        const clientsRef = collection(db, 'organizations', orgId, 'clients');
        const initialClientDoc = doc(db, 'organizations', orgId, 'clients', initialClientId);
        const initialClientSnap = await getDoc(initialClientDoc);

        if (initialClientSnap.exists()) {
          const data = initialClientSnap.data();
          if (data.cpfCnpj) {
            const q = query(clientsRef, where('cpfCnpj', '==', data.cpfCnpj));
            const qSnap = await getDocs(q);
            const clients = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllClients(clients);
          } else {
            setAllClients([{ id: initialClientSnap.id, ...data }]);
          }
        }
      } catch (err) {
        console.error("Error fetching all subscriptions:", err);
      }
    };

    fetchAllSubscriptions();
  }, [orgId, initialClientId]);

  // 2. Escutar dados da assinatura ativa
  useEffect(() => {
    if (!orgId || !activeClientId) {
      if (!initialClientId) {
        setError("Parâmetros inválidos.");
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    const clientRef = doc(db, 'organizations', orgId, 'clients', activeClientId);
    const requestsRef = collection(db, 'organizations', orgId, 'supportRequests');
    const offersRef = collection(db, 'organizations', orgId, 'offers');
    const globalRef = doc(db, 'organizations', orgId, 'settings', 'global');

    let unsubConsultant: () => void = () => {};
    const unsubClient = onSnapshot(clientRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        
        if (data.asaasCustomerId) {
          try {
            const res = await fetch(`/api/asaas/payments?customer=${data.asaasCustomerId}`);
            if (res.ok) {
              const payData = await res.json();
              setPaymentsHistory(payData.data || []);
            }
          } catch (e) {
            console.error("Asaas fetch error:", e);
          }
        } else {
          setPaymentsHistory([]);
        }

        const clientData = { id: snap.id, ...data };
        setClient(clientData);

        if (data.assignedTo) {
          const userRef = doc(db, 'organizations', orgId, 'users', data.assignedTo);
          unsubConsultant();
          unsubConsultant = onSnapshot(userRef, (userSnap) => {
            if (userSnap.exists()) {
              setClient({
                ...clientData,
                consultant: { id: userSnap.id, ...userSnap.data() }
              });
            }
          });
        }
        
        setLoading(false);
      } else {
        setError("Assinatura não encontrada.");
        setLoading(false);
      }
    });

    const qRequests = query(requestsRef, where('clientId', '==', activeClientId));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(list.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    });

    const qOffers = query(offersRef, where('active', '==', true));
    const unsubOffers = onSnapshot(qOffers, (snap) => {
      setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubGlobal = onSnapshot(globalRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.announcement?.isActive) {
          setAnnouncement(data.announcement);
        }
      }
    });

    return () => {
      unsubClient();
      unsubConsultant();
      unsubRequests();
      unsubOffers();
      unsubGlobal();
    };
  }, [orgId, activeClientId]);

  return { 
    client, 
    allClients,
    activeClientId,
    setActiveClientId,
    paymentsHistory, 
    requests, 
    offers, 
    announcement, 
    loading, 
    error 
  };
}

