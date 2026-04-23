import { useState, useMemo } from 'react';
import { supportService } from '../services/supportService';
import { useCRM } from '../contexts/CRMContext';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { differenceInHours } from 'date-fns';
import { toast } from 'sonner';

export type SupportFilter = 'all' | 'mine';
export type SupportSort = 'recent' | 'sla';

export function useSupport() {
  const { user } = useAuth();
  const crm = useCRM();
  const { 
    supportRequests: rawSupportRequests = [], 
    effectiveOrgId = '', 
    teamProfiles: rawTeamProfiles = [] 
  } = crm || {};
  const { confirm } = useDialog();

  const [supportFilter, setSupportFilter] = useState<SupportFilter>('all');
  const [sortBy, setSortBy] = useState<SupportSort>('sla');


  const teamProfiles = useMemo(() => 
    Array.isArray(rawTeamProfiles) ? rawTeamProfiles.filter(Boolean) : [], 
  [rawTeamProfiles]);

  const supportRequests = useMemo(() => 
    Array.isArray(rawSupportRequests) ? rawSupportRequests.filter(Boolean) : [],
  [rawSupportRequests]);

  // SLA Helper Logic (Extracted from View)
  const getSlaStatus = (createdAt: any, priority: string = 'baixa') => {
    if (!createdAt) return null;
    const createdDate = typeof createdAt.toDate === 'function' ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const hoursElapsed = differenceInHours(now, createdDate);
    
    let slaLimit = 24;
    if (priority === 'alta') slaLimit = 4;
    else if (priority === 'media') slaLimit = 12;

    const remaining = slaLimit - hoursElapsed;
    const isOverdue = remaining <= 0;

    return {
      remaining,
      isOverdue,
      text: isOverdue ? 'SLA Estourado' : `${Math.round(remaining)}h restantes`
    };
  };

  // Filtered and Sorted Requests
  const filteredRequests = useMemo(() => {
    return [...supportRequests]
      .filter(req => supportFilter === 'all' || req.assignedTo === user?.uid)
      .sort((a, b) => {
        if (sortBy === 'recent') return 0;
        const slaA = getSlaStatus(a?.createdAt, a?.priority)?.remaining ?? 999;
        const slaB = getSlaStatus(b?.createdAt, b?.priority)?.remaining ?? 999;
        
        if (a?.status === 'concluido' && b?.status !== 'concluido') return 1;
        if (a?.status !== 'concluido' && b?.status === 'concluido') return -1;
        
        return slaA - slaB;
      });
  }, [supportRequests, supportFilter, sortBy, user?.uid]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    const csatRequests = supportRequests.filter(r => r.csatScore);
    const avgCsat = csatRequests.length > 0 
      ? (csatRequests.reduce((acc, r) => acc + (Number(r.csatScore) || 0), 0) / csatRequests.length).toFixed(1)
      : null;

    const openRequests = supportRequests.filter(r => r.status !== 'concluido');
    const slaMetrics = { atrasados: 0, vencendoAgora: 0, emAlerta: 0, noPrazo: 0 };

    openRequests.forEach(req => {
      const sla = getSlaStatus(req.createdAt, req.priority);
      if (!sla) return;
      if (sla.isOverdue) slaMetrics.atrasados++;
      else if (sla.remaining < 2) slaMetrics.vencendoAgora++;
      else if (sla.remaining < 6) slaMetrics.emAlerta++;
      else slaMetrics.noPrazo++;
    });

    return { avgCsat, slaMetrics };
  }, [supportRequests]);

  const updateRequest = async (id: string, data: any) => {
    try {
      await supportService.updateRequest(effectiveOrgId, id, data);
      toast.success('Chamado atualizado!');
    } catch (e) {
      toast.error('Erro ao atualizar chamado.');
    }
  };

  const submitReply = async (id: string, message: string, currentStatus: string) => {
    try {
      await supportService.sendReply(effectiveOrgId, id, message, currentStatus);
      toast.success('Resposta enviada!');
    } catch (e) {
      toast.error('Erro ao enviar resposta.');
    }
  };

  const removeRequest = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir Chamado',
      message: 'Tem certeza que deseja excluir este chamado?',
      confirmText: 'Sim, excluir',
      variant: 'danger'
    });
    if (!ok) return;
    try {
      await supportService.deleteRequest(effectiveOrgId, id);
      toast.success('Chamado excluído!');
    } catch (e) {
      toast.error('Erro ao excluir chamado.');
    }
  };

  return {
    requests: filteredRequests,
    metrics,
    teamProfiles,
    supportFilter,
    setSupportFilter,
    sortBy,
    setSortBy,
    updateRequest,
    submitReply,
    removeRequest,
    getSlaStatus,
    effectiveOrgId
  };
}
