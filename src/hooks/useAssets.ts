import { useState, useEffect, useMemo } from 'react';
import { Asset } from '@/types/people';
import { assetService } from '../services/assetService';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ContractTemplate, UserContract } from '@/types';

import { usePermissions } from '@auth/hooks/usePermissions';

/**
 * Custom Hook to manage assets business logic.
 * Handles real-time sync, filtering, contract templates integration, and role-based permissions.
 */
export function useAssets(userId?: string) {
  const { userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const crm = useCRM();
  const { effectiveOrgId = '', teamProfiles: rawTeamProfiles = [] } = crm || {};
  const teamProfiles = Array.isArray(rawTeamProfiles) ? rawTeamProfiles : [];

  const [assets, setAssets] = useState<Asset[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdminOrManager = hasPermission('MANAGE_TEAM');

  // Real-time synchronization for assets
  useEffect(() => {
    if (!effectiveOrgId) return;
    
    const unsubscribe = assetService.subscribeToAssets(effectiveOrgId, (loadedAssets) => {
      setAssets(loadedAssets);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  // Load contract templates (specifically for terms of responsibility)
  useEffect(() => {
    if (!effectiveOrgId) return;

    const fetchTemplates = async () => {
      try {
        const templatesRef = collection(db, 'organizations', effectiveOrgId, 'contract_templates');
        const snap = await getDocs(templatesRef);
        const list: ContractTemplate[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as ContractTemplate);
        });
        setTemplates(list);
      } catch (err) {
        console.error('[useAssets] Erro ao carregar templates de termos:', err);
      }
    };

    fetchTemplates();
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

  const createAsset = async (assetData: Partial<Asset> & { termTemplateId?: string }) => {
    if (!isAdminOrManager) {
      toast.error('Sem permissão para gerenciar ativos.');
      return;
    }
    
    // Novas atribuições exigem a obrigatoriedade do termo
    if (assetData.assignedTo && !assetData.termTemplateId) {
      toast.error('O Termo de Responsabilidade é obrigatório para novos ativos atribuídos.');
      return;
    }

    try {
      const customAssetId = doc(collection(db, 'tmp')).id;
      const assetCode = assetData.assetCode || `CRM-AST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      let assignedToName = '';
      let assignedToJobTitle = '';
      let assignedAt = null;
      let status = assetData.status || 'Devolvido';
      let contractId = '';

      if (assetData.assignedTo) {
        const profile = teamProfiles.find(p => p.uid === assetData.assignedTo);
        if (profile) {
          assignedToName = profile.displayName || 'Colaborador';
          assignedToJobTitle = profile.jobTitle || (typeof profile.role === 'string' ? profile.role : profile.role?.name || profile.role?.id) || 'Colaborador';
          assignedAt = Date.now();
          status = 'Em uso';
        }
      }

      // Se houver termo de responsabilidade a gerar
      if (assetData.assignedTo && assetData.termTemplateId) {
        const template = templates.find(t => t.id === assetData.termTemplateId);
        if (template) {
          contractId = doc(collection(db, 'tmp')).id;

          let filledText = template.bodyText
            .replace(/{ATIVO_NOME}/g, assetData.name || '')
            .replace(/{ATIVO_CODIGO}/g, assetCode)
            .replace(/{ATIVO_SERIAL}/g, assetData.serialNumber || 'N/A')
            .replace(/{ATIVO_ESPECIFICACOES}/g, assetData.specifications || 'N/A');

          const profile = teamProfiles.find(p => p.uid === assetData.assignedTo);
          if (profile) {
            filledText = filledText
              .replace(/{NOME_COLABORADOR}/g, profile.displayName || '')
              .replace(/{CARGO}/g, profile.jobTitle || 'Colaborador')
              .replace(/{TIPO_CONTRATO}/g, profile.contractType || 'PJ');
          }

          const newContract: UserContract = {
            id: contractId,
            templateId: template.id,
            title: `Termo de Responsabilidade: ${assetData.name}`,
            bodyText: filledText,
            status: 'pending',
            type: 'asset_term',
            assetId: customAssetId,
            createdAt: Date.now()
          };

          // Gravar o contrato pendente no perfil do colaborador
          const memberRef = doc(db, 'profiles', assetData.assignedTo);
          await updateDoc(memberRef, {
            contracts: arrayUnion(newContract)
          });
        }
      }

      // Gravar o Ativo com o contractId gerado
      await assetService.addAsset(effectiveOrgId, {
        ...assetData,
        assetCode,
        status,
        assignedTo: assetData.assignedTo || '',
        assignedToName,
        assignedToJobTitle,
        assignedAt,
        contractId: contractId || undefined
      } as any, customAssetId);

      toast.success('Ativo atribuído e registrado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar ativo.');
    }
  };

  const generateTermForAsset = async (assetId: string, userId: string, templateId: string) => {
    if (!isAdminOrManager) {
      toast.error('Sem permissão para gerenciar termos.');
      return;
    }

    try {
      const asset = assets.find(a => a.id === assetId);
      const profile = teamProfiles.find(p => p.uid === userId);
      const template = templates.find(t => t.id === templateId);

      if (!asset || !profile || !template) {
        toast.error('Dados inválidos para geração do termo.');
        return;
      }

      const contractId = doc(collection(db, 'tmp')).id;
      
      let filledText = template.bodyText
        .replace(/{ATIVO_NOME}/g, asset.name || '')
        .replace(/{ATIVO_CODIGO}/g, asset.assetCode || '')
        .replace(/{ATIVO_SERIAL}/g, asset.serialNumber || 'N/A')
        .replace(/{ATIVO_ESPECIFICACOES}/g, asset.specifications || 'N/A')
        .replace(/{NOME_COLABORADOR}/g, profile.displayName || '')
        .replace(/{CARGO}/g, profile.jobTitle || 'Colaborador')
        .replace(/{TIPO_CONTRATO}/g, profile.contractType || 'PJ');

      const newContract: UserContract = {
        id: contractId,
        templateId: template.id,
        title: `Termo de Responsabilidade: ${asset.name}`,
        bodyText: filledText,
        status: 'pending',
        type: 'asset_term',
        assetId: assetId,
        createdAt: Date.now()
      };

      // 1. Gravar contrato pendente no perfil do colaborador
      const memberRef = doc(db, 'profiles', userId);
      await updateDoc(memberRef, {
        contracts: arrayUnion(newContract)
      });

      // 2. Gravar o contractId no ativo correspondente
      const assetRef = doc(db, 'organizations', effectiveOrgId, 'assets', assetId);
      await updateDoc(assetRef, {
        contractId: contractId
      });

      toast.success('Termo de Responsabilidade gerado e enviado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar Termo de Responsabilidade.');
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
    removeAsset,
    templates,
    generateTermForAsset
  };
}
