import React, { createContext, useContext, useEffect } from 'react';
import { useCRMStore } from '../store/useCRMStore';
import { useAuth } from './AuthContext';
import { usePermissions } from '../hooks/usePermissions';

const CRMContext = createContext<any>(null);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  
  const store = useCRMStore();
  const orgId = userProfile?.orgId || user?.uid || '';
  const permissions = userProfile?.permissions || [];

  // Sincroniza a Store com o Firestore
  useEffect(() => {
    if (orgId && user?.uid) {
      const unsubscribe = store.init(orgId, user.uid, permissions);
      return () => unsubscribe();
    }
  }, [orgId, user?.uid, permissions]);

  // Adaptador para manter compatibilidade com o código legado que usa useCRM()
  const value = {
    ...store,
    // Mapeamentos de nomes se necessário para componentes legados
    activeLeadsCount: store.leads.filter(l => !['Convertido', 'Perdido'].includes(l.status || '')).length,
    effectiveOrgId: orgId,
    userProfile,
    // Mapeamento de ações para nomes legados (se necessário)
    handlePayCommission: async (id: string) => {
      // Implementação rápida ou delegar para store se existir
    },
    handleDeleteCommission: async (id: string) => {
      // Implementação rápida
    },
    syncPayments: async () => { /* Logic mapping */ },
    isSyncing: false,
    isEmailLoading: false,
    pendingVacationsCount: store.vacations.filter(v => v.status === 'Pendente').length,
    // Widgets e estados de UI que o CRMContext carregava
    isOfferModalOpen: false,
    setIsOfferModalOpen: () => {},
    editingOffer: null,
    setEditingOffer: () => {},
    editingClient: null,
    setEditingClient: () => {},
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
