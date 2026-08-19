import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCRM } from '@crm/contexts/CRMContext';
import { ICP } from '@/types';
import { toast } from 'sonner';

export function useICPs() {
  const { effectiveOrgId } = useCRM();
  const queryClient = useQueryClient();

  // Query: Buscar todos os ICPs da organização
  const icpsQuery = useQuery<ICP[]>({
    queryKey: ['icps', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const ref = collection(db, 'organizations', effectiveOrgId, 'icps');
      const q = query(ref, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ICP));
    },
    enabled: !!effectiveOrgId,
    staleTime: 1000 * 60 * 5 // 5 minutos de cache
  });

  // Mutation: Salvar ou atualizar ICP
  const saveICPMutation = useMutation({
    mutationFn: async (icpData: Partial<ICP>) => {
      if (!effectiveOrgId) throw new Error('ID da organização não encontrado');
      
      const id = icpData.id || `icp_${Date.now()}`;
      const docRef = doc(db, 'organizations', effectiveOrgId, 'icps', id);
      
      const payload: ICP = {
        id,
        name: icpData.name || 'Novo Perfil ICP',
        niche: icpData.niche || '',
        companySize: icpData.companySize || '',
        decisionMakerRole: icpData.decisionMakerRole || '',
        avgTicket: icpData.avgTicket || 0,
        painPoints: icpData.painPoints || [],
        desires: icpData.desires || [],
        objections: icpData.objections || [],
        channels: icpData.channels || [],
        pitchNotes: icpData.pitchNotes || '',
        linkedOfferIds: icpData.linkedOfferIds || [],
        active: icpData.active !== undefined ? icpData.active : true,
        createdAt: icpData.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(docRef, payload, { merge: true });
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['icps', effectiveOrgId] });
      toast.success('Perfil de Cliente Ideal (ICP) salvo com sucesso!');
    },
    onError: (err: any) => {
      console.error('[useICPs] Erro ao salvar ICP:', err);
      toast.error('Erro ao salvar ICP. Tente novamente.');
    }
  });

  // Mutation: Excluir ICP
  const deleteICPMutation = useMutation({
    mutationFn: async (icpId: string) => {
      if (!effectiveOrgId) throw new Error('ID da organização não encontrado');
      const docRef = doc(db, 'organizations', effectiveOrgId, 'icps', icpId);
      await deleteDoc(docRef);
      return icpId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['icps', effectiveOrgId] });
      toast.success('ICP removido com sucesso!');
    },
    onError: (err: any) => {
      console.error('[useICPs] Erro ao excluir ICP:', err);
      toast.error('Erro ao excluir ICP.');
    }
  });

  return {
    icps: icpsQuery.data || [],
    isLoading: icpsQuery.isLoading,
    saveICP: saveICPMutation.mutateAsync,
    deleteICP: deleteICPMutation.mutateAsync,
    isSaving: saveICPMutation.isPending
  };
}
