import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCRMStore } from '@store/useCRMStore';
import { useAuth } from '@auth/contexts/AuthContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { Client, Offer } from '@/types';
import { ClientMapper } from '../entities/client.entity';
import { LeadMapper } from '../entities/lead.entity';
import { useClients, useLeads } from '@/hooks/queries/useClients';
import { useTags, useTeamProfiles, useOrgRoles } from '@/hooks/queries/useCRMQueries';

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
  
  // Sincroniza a Store com o Firestore (Apenas preferências e dados leves da Store)
  useEffect(() => {
    if (orgId && user?.uid && orgId !== 'pending') {
      const unsubscribe = store.init(user.uid, orgId, permissions, userProfile);
      return () => unsubscribe();
    }
  }, [orgId, user?.uid, permissionsKey]);

  // Adaptador para manter compatibilidade com o código legado que usa useCRM()
  const value = {
    ...store,
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

  // Consome os hooks do React Query de forma Lazy (somente onde o useCRM for chamado)
  const { data: clientsData = [] } = useClients();
  const { data: leadsData = [] } = useLeads();
  const { data: tagsData = [] } = useTags();
  const { data: teamProfilesData = [] } = useTeamProfiles();
  const { data: orgRolesData = [] } = useOrgRoles();

  // Mapeamento de dados para Entidades robustas
  const clients = React.useMemo(() => 
    (clientsData || []).map(ClientMapper.toEntity), 
    [clientsData]
  );

  const leads = React.useMemo(() => 
    (leadsData || []).map(LeadMapper.toEntity), 
    [leadsData]
  );

  return {
    ...context,
    clients,
    leads,
    tags: tagsData,
    teamProfiles: teamProfilesData,
    orgRoles: orgRolesData,
  };
}

