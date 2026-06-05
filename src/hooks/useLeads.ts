import { useState, useMemo } from 'react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { leadService } from '../services/leadService';
import { Lead, LeadStatus } from '@/types';
import { toast } from '@heroui/react';
import { usePermissions } from '@auth/hooks/usePermissions';

export type LeadFilterMode = 'all' | 'mine';

export function useLeads() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { leads: rawLeads = [], effectiveOrgId = '', userProfile, teamProfiles, tags, orgRoles } = useCRM();
  const { confirm } = useDialog();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [leadFilter, setLeadFilter] = useState<LeadFilterMode>('all');
  
  const leads = useMemo(() => 
    Array.isArray(rawLeads) ? rawLeads.filter(Boolean) : [], 
  [rawLeads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchesSearch = !searchTerm || l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || l.whatsapp?.includes(searchTerm);
      const matchesSource = filterSource === 'all' || l.leadSource === filterSource;
      const matchesTag = filterTag === 'all' || l.tagIds?.includes(filterTag);
      const matchesOwner = leadFilter === 'all' || l.assignedTo === user?.uid;
      return matchesSearch && matchesSource && matchesTag && matchesOwner;
    });
  }, [leads, searchTerm, filterSource, filterTag, leadFilter, user?.uid]);

  const stats = useMemo(() => {
    const activeLeads = leads.filter(l => !['Convertido', 'Perdido'].includes(l.status || ''));
    const convertedLeads = leads.filter(l => l.status === 'Convertido');
    const conversionRate = leads.length > 0 ? ((convertedLeads.length / leads.length) * 100).toFixed(1) : '0';
    const totalPipelineValue = activeLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
    
    const thisMonthLeads = leads.filter(l => {
      if (!l.createdAt) return false;
      const d = new Date(l.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    return {
      activeCount: activeLeads.length,
      conversionRate,
      totalPipelineValue,
      thisMonthCount: thisMonthLeads.length
    };
  }, [leads]);

  const handleSaveLead = async (formData: any, editingLead: Lead | null) => {
    if (!user || !effectiveOrgId) return false;
    if (!formData.name?.trim()) {
      toast.error('Nome é obrigatório');
      return false;
    }
    
    try {
      const payload: any = {
        name: formData.name.trim(),
        whatsapp: formData.whatsapp.trim(),
        email: formData.email?.trim() || null,
        leadSource: formData.leadSource || null,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : null,
        notes: formData.notes?.trim() || null,
        plan: formData.plan || null,
        niche: formData.niche?.trim() || null,
        nextFollowUp: formData.nextFollowUp ? new Date(formData.nextFollowUp).getTime() : null,
        assignedTo: hasPermission('MANAGE_TEAM') 
          ? (formData.assignedTo || user?.uid) 
          : (user?.uid),
        tagIds: formData.tagIds || []
      };

      if (editingLead) {
        await toast.promise(
          leadService.updateLead(effectiveOrgId, editingLead.id, payload),
          {
            loading: 'Atualizando lead...',
            success: 'Lead atualizado com sucesso!',
            error: (e: Error) => `Erro ao atualizar lead: ${e.message}`
          }
        );
      } else {
        await toast.promise(
          leadService.createLead(effectiveOrgId, payload, userProfile?.displayName || user?.email || 'Sistema'),
          {
            loading: 'Adicionando novo lead...',
            success: 'Lead adicionado com sucesso!',
            error: (e: Error) => `Erro ao adicionar lead: ${e.message}`
          }
        );
      }
      return true;
    } catch (e: any) {
      return false;
    }
  };

  const handleMoveLead = async (lead: Lead, targetStatus: LeadStatus) => {
    if (!effectiveOrgId) return;
    try {
      await toast.promise(
        leadService.moveLead(effectiveOrgId, lead, targetStatus, userProfile?.displayName || user?.email || 'Sistema'),
        {
          loading: `Movendo lead para ${targetStatus}...`,
          success: `Lead movido para ${targetStatus}!`,
          error: (e: Error) => `Erro ao mover lead: ${e.message}`
        }
      );
    } catch (e: any) {
      // Já tratado pelo toast.promise
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!effectiveOrgId) return;
    if (!hasPermission('MANAGE_LEADS')) {
      toast.error('Apenas administradores podem excluir leads.');
      return;
    }
    const ok = await confirm({
      title: 'Excluir Lead',
      message: 'Excluir este lead permanentemente?',
      confirmText: 'Sim, excluir',
      variant: 'danger'
    });
    if (!ok) return;
    try {
      await toast.promise(
        leadService.deleteLead(effectiveOrgId, leadId),
        {
          loading: 'Excluindo lead...',
          success: 'Lead excluído com sucesso!',
          error: (e: Error) => `Erro ao excluir lead: ${e.message}`
        }
      );
    } catch (e: any) {
      // Já tratado pelo toast.promise
    }
  };

  const handleCleanup = async () => {
    if (!effectiveOrgId || !leads.length) return;
    const validStatuses = ['Novo', 'Em Contato', 'Negociação', 'Convertido', 'Perdido'].map(s => s.toLowerCase());
    const ghostLeads = leads.filter(l => !l.status || !validStatuses.includes(l.status.toLowerCase()));
    
    if (ghostLeads.length === 0) {
      toast.success('Nenhum lead fantasma encontrado.');
      return;
    }

    const ok = await confirm({
      title: 'Limpar Leads Fantasmas',
      message: `Encontrados ${ghostLeads.length} leads fantasmas. Deseja excluí-los?`,
      confirmText: 'Sim, limpar',
      variant: 'warning'
    });
    if (!ok) return;

    try {
      await toast.promise(
        leadService.cleanupGhostLeads(effectiveOrgId, ghostLeads),
        {
          loading: 'Limpando leads fantasmas...',
          success: 'Limpeza concluída com sucesso!',
          error: (e: Error) => `Erro ao limpar leads: ${e.message}`
        }
      );
    } catch (e: any) {
      // Já tratado pelo toast.promise
    }
  };

  return {
    leads: filteredLeads,
    allLeads: leads,
    stats,
    tags,
    teamProfiles,
    userProfile,
    orgRoles,
    searchTerm,
    setSearchTerm,
    filterSource,
    setFilterSource,
    filterTag,
    setFilterTag,
    leadFilter,
    setLeadFilter,
    handleSaveLead,
    handleMoveLead,
    handleDeleteLead,
    handleCleanup
  };
}
