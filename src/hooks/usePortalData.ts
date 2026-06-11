import { useState, useEffect } from 'react';
import { doc, collection, query, where, onSnapshot, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GrowthAsset } from '@/types';

export function usePortalData(orgId: string | undefined, initialClientId: string | undefined) {
  const [activeClientId, setActiveClientId] = useState<string | undefined>(initialClientId);
  const [growthAssets, setGrowthAssets] = useState<GrowthAsset[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Buscar dados consolidados do portal
  useEffect(() => {
    if (!orgId || !activeClientId) {
      if (!initialClientId) {
        setError("Parâmetros inválidos.");
        setLoading(false);
      }
      return;
    }

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setError("Token de segurança ausente. Use o link oficial enviado pelo seu consultor.");
      setLoading(false);
      return;
    }

    const fetchPortalData = async () => {
      if (!client) {
        setLoading(true);
      } else {
        setSwitching(true);
      }

      try {
        const response = await fetch(`/api/portal_handler?orgId=${orgId}&clientId=${activeClientId}&token=${token}`);
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Erro ao carregar dados do portal.");
        }

        const data = await response.json();
        
        setClient(data.client);
        setPaymentsHistory(data.payments || []);
        setRequests(data.requests || []);
        setOffers(data.offers || []);
        setAnnouncement(data.announcement);
        
        // Se ainda não temos a lista de todas as assinaturas, buscar (opcional, pode ser feito via API também se necessário)
        if (allClients.length === 0 && data.client.cpfCnpj) {
          // Manter lógica de busca de multi-assinaturas se necessário, 
          // mas idealmente a API já deveria lidar com isso ou o cliente deveria ser informado.
          setAllClients([data.client]);
        }

        setLoading(false);
        setSwitching(false);
        setError(null);
      } catch (err: any) {
        console.error("Portal fetch error:", err);
        setError(err.message);
        setLoading(false);
        setSwitching(false);
      }
    };

    fetchPortalData();

    // Opcional: Polling a cada 60 segundos para manter dados atualizados sem onSnapshot
    const interval = setInterval(fetchPortalData, 60000);
    return () => clearInterval(interval);
  }, [orgId, activeClientId]);

  // 2. Buscar todas as assinaturas vinculadas (CPF/CNPJ) - Requerer API dedicada no futuro se Firestore estiver bloqueado
  useEffect(() => {
    if (!orgId || !initialClientId || !client?.cpfCnpj) return;

    // Nota: Esta parte ainda usa Firestore e pode falhar se não estiver logado.
    // Para simplificar agora, vamos apenas garantir que o portal funcione para a assinatura atual.
    if (allClients.length === 0) {
      setAllClients([client]);
    }
  }, [orgId, initialClientId, client]);

  // Buscar ativos de crescimento globais da organização em tempo real no Firestore
  useEffect(() => {
    if (!orgId) return;

    const colRef = collection(db, 'organizations', orgId, 'growth_assets');
    const unsub = onSnapshot(colRef, (snapshot) => {
      const assets: GrowthAsset[] = [];
      snapshot.forEach((doc) => {
        assets.push({ id: doc.id, ...doc.data() } as GrowthAsset);
      });
      setGrowthAssets(assets);
    }, (error) => {
      console.error("Erro ao carregar growth_assets no portal:", error);
    });

    return () => unsub();
  }, [orgId]);

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
    switching,
    error,
    growthAssets
  };
}

