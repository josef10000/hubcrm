import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCRMStore } from '@store/useCRMStore';
import { useAuth } from '@auth/contexts/AuthContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { Client, Offer } from '@/types';
import { ClientMapper } from '../entities/client.entity';
import { LeadMapper } from '../entities/lead.entity';

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
      const unsubscribe = store.init(user.uid, orgId, permissions);
      return () => unsubscribe();
    }
  }, [orgId, user?.uid, permissionsKey]);

  // Mapeamento de dados para Entidades robustas
  const clients = React.useMemo(() => 
    (store.clients || []).map(ClientMapper.toEntity), 
    [store.clients]
  );

  const leads = React.useMemo(() => 
    (store.leads || []).map(LeadMapper.toEntity), 
    [store.leads]
  );

  // Adaptador para manter compatibilidade com o código legado que usa useCRM()
  const value = {
    ...store,
    clients,
    leads,
    // Mapeamentos de nomes se necessário para componentes legados
    activeLeadsCount: (leads || []).filter(l => !['Convertido', 'Perdido'].includes(l.status || '')).length,
    effectiveOrgId: orgId,
    userProfile,
    
    // UI States (Bridge)
    isOfferModalOpen, setIsOfferModalOpen,
    editingOffer, setEditingOffer,
    editingClient, setEditingClient,
    isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen,
    offerToDelete, setOfferToDelete,
    
    // Permissions Bridge
    hasPermission,
    hasAnyPermission: (perms: any[]) => perms.some(p => permissions.includes(p)),
    
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
