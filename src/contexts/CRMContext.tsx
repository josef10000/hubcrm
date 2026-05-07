import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCRMStore } from '../store/useCRMStore';
import { useAuth } from './AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Client, Offer } from '../types';

const CRMContext = createContext<any>(null);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  
  const store = useCRMStore();
  const orgId = userProfile?.orgId || user?.uid || '';
  const permissions = userProfile?.permissions || [];

  // Estados de UI que o CRMContext carregava (Bridge)
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);

  const permissionsKey = JSON.stringify(permissions);
  
  // Sincroniza a Store com o Firestore
  useEffect(() => {
    if (orgId && user?.uid && orgId !== 'pending') {
      const unsubscribe = store.init(orgId, user.uid, permissions);
      return () => unsubscribe();
    }
  }, [orgId, user?.uid, permissionsKey]);

  // Adaptador para manter compatibilidade com o código legado que usa useCRM()
  const value = {
    ...store,
    // Mapeamentos de nomes se necessário para componentes legados
    activeLeadsCount: store.leads.filter(l => !['Convertido', 'Perdido'].includes(l.status || '')).length,
    effectiveOrgId: orgId,
    userProfile,
    
    // UI States (Bridge)
    isOfferModalOpen, setIsOfferModalOpen,
    editingOffer, setEditingOffer,
    editingClient, setEditingClient,
    isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen,
    offerToDelete, setOfferToDelete,
    
    // Fallbacks e mapeamentos de ações
    handleExportCSV: (data: any[]) => {
      console.log("Exporting CSV...", data);
      // Implementação do export se necessário
    },
    errorMsg: store.errorMsg
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM deve ser usado dentro de um CRMProvider');
  }
  return context;
}
