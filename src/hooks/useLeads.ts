import { useState, useMemo } from 'react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { leadService } from '../services/leadService';
import { Lead, LeadStatus } from '../types';
import { toast } from 'sonner';
import { usePermissions } from './usePermissions';

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
        email: formData.email.trim() || undefined,
        leadSource: formData.leadSource || undefined,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
        notes: formData.notes.trim() || undefined,
        plan: formData.plan || undefined,
        niche: formData.niche.trim() || undefined,
        nextFollowUp: formData.nextFollowUp ? new Date(formData.nextFollowUp).getTime() : undefined,
        assignedTo: hasPermission('MANAGE_TEAM') 
          ? (formData.assignedTo || user?.uid) 
          : (user?.uid),
        tagIds: formData.tagIds
      };

      if (editingLead) {
        await leadService.updateLead(effectiveOrgId, editingLead.id, payload);
        toast.success('Lead atualizado!');
      } else {
        await leadService.createLead(effectiveOrgId, payload, userProfile?.displayName || user?.email || 'Sistema');
        toast.success('Lead adicionado!');
      }
      return true;
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
      return false;
    }
  };

  const handleMoveLead = async (lead: Lead, targetStatus: LeadStatus) => {
    if (!effectiveOrgId) return;
    try {
      await leadService.moveLead(effectiveOrgId, lead, targetStatus, userProfile?.displayName || user?.email || 'Sistema');
      toast.success(`Lead movido para ${targetStatus}`);
    } catch (e: any) {
      toast.error('Erro ao mover lead.');
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
      await leadService.deleteLead(effectiveOrgId, leadId);
      toast.success('Lead excluído');
    } catch (e: any) {
      toast.error('Erro ao excluir lead.');
    }
  };

  const handleCleanup = async () => {
    if (!effectiveOrgId || !leads.length) return;
    const validStatuses = ['Novo', 'Em Contato', 'Proposta Enviada', 'Negociação', 'Convertido', 'Perdido'].map(s => s.toLowerCase());
    const ghostLeads = leads.filter(l => !l.status || !validStatuses.includes(l.status.toLowerCase()));
    
    if (ghostLeads.length === 0) {
      toast.info('Nenhum lead fantasma encontrado.');
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
      await leadService.cleanupGhostLeads(effectiveOrgId, ghostLeads);
      toast.success('Limpeza concluída!');
    } catch (e: any) {
      toast.error('Erro na limpeza.');
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
