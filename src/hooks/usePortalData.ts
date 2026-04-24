import { useState, useEffect } from 'react';
import { doc, collection, query, where, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function usePortalData(orgId: string | undefined, clientId: string | undefined) {
  const [client, setClient] = useState<any>(null);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !clientId) {
      setError("Parâmetros inválidos.");
      setLoading(false);
      return;
    }

    const clientRef = doc(db, 'organizations', orgId, 'clients', clientId);
    const requestsRef = collection(db, 'organizations', orgId, 'supportRequests');
    const offersRef = collection(db, 'organizations', orgId, 'offers');
    const globalRef = doc(db, 'organizations', orgId, 'settings', 'global');

    // 1. Client Data & Consultant Profile
    // 1. Client Data
    let unsubConsultant: () => void = () => {};
    const unsubClient = onSnapshot(clientRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        
        // Se houver integração Asaas, buscar dados em tempo real
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
        }

        // Definir dados iniciais do cliente imediatamente
        const clientData = { id: snap.id, ...data };
        setClient(clientData);

        // Se houver consultor designado, escutar em tempo real para atualizar o objeto client
        if (data.assignedTo) {
          const userRef = doc(db, 'organizations', orgId, 'users', data.assignedTo);
          unsubConsultant(); // Limpar anterior se existir
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
        setError("Cliente não encontrado.");
        setLoading(false);
      }
    });

    // 2. Support Requests
    const qRequests = query(requestsRef, where('clientId', '==', clientId));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(list.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    });

    // 3. Offers/Marketplace
    const qOffers = query(offersRef, where('active', '==', true));
    const unsubOffers = onSnapshot(qOffers, (snap) => {
      setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 4. Announcements
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
  }, [orgId, clientId]);

  return { client, paymentsHistory, requests, offers, announcement, loading, error };
}
