import { useState, useEffect, useMemo } from 'react';
import { Asset } from '@/types/people';
import { assetService } from '../services/assetService';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { toast } from 'sonner';

import { usePermissions } from '@auth/hooks/usePermissions';

/**
 * Custom Hook to manage assets business logic.
 * Handles real-time sync, filtering and role-based permissions.
 */
export function useAssets(userId?: string) {
  const { userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const crm = useCRM();
  const { effectiveOrgId = '', teamProfiles: rawTeamProfiles = [] } = crm || {};
  const teamProfiles = Array.isArray(rawTeamProfiles) ? rawTeamProfiles : [];

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdminOrManager = hasPermission('MANAGE_TEAM');

  // Real-time synchronization
  useEffect(() => {
    if (!effectiveOrgId) return;
    
    const unsubscribe = assetService.subscribeToAssets(effectiveOrgId, (loadedAssets) => {
      setAssets(loadedAssets);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  // Filtered assets logic
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teamProfiles.find(p => p.uid === a.assignedTo)?.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (userId) {
        return matchesSearch && a.assignedTo === userId;
      }
      return matchesSearch;
    });
  }, [assets, searchTerm, userId, teamProfiles]);

  const createAsset = async (assetData: Partial<Asset>) => {
    if (!isAdminOrManager) {
      toast.error('Sem permissão para gerenciar ativos.');
      return;
    }
    try {
      const assetCode = assetData.assetCode || `CRM-AST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      let assignedToName = '';
      let assignedToJobTitle = '';
      let assignedAt = null;
      let status = assetData.status || 'Devolvido';

      if (assetData.assignedTo) {
        const profile = teamProfiles.find(p => p.uid === assetData.assignedTo);
        if (profile) {
          assignedToName = profile.displayName || 'Colaborador';
          assignedToJobTitle = profile.jobTitle || (typeof profile.role === 'string' ? profile.role : profile.role?.name || profile.role?.id) || 'Colaborador';
          assignedAt = Date.now();
          status = 'Em uso';
        }
      }

      await assetService.addAsset(effectiveOrgId, {
        ...assetData,
        assetCode,
        status,
        assignedTo: assetData.assignedTo || '',
        assignedToName,
        assignedToJobTitle,
        assignedAt
      } as any);
      toast.success('Ativo registrado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar ativo.');
    }
  };

  const removeAsset = async (id: string) => {
    if (!isAdminOrManager) {
      toast.error('Sem permissão para remover ativos.');
      return;
    }
    try {
      await assetService.deleteAsset(effectiveOrgId, id);
      toast.success('Ativo removido.');
    } catch (error) {
      toast.error('Erro ao remover ativo.');
    }
  };

  return {
    assets: filteredAssets,
    loading,
    searchTerm,
    setSearchTerm,
    isAdminOrManager,
    teamProfiles,
    createAsset,
    removeAsset
  };
}
