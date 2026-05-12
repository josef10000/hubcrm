import { StateCreator } from 'zustand';
import { 
  collection, doc, setDoc, deleteDoc, 
  query, where, onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { UserProfile, OnboardingQuestion, Objective, FeedbackRequest } from '@/types';
import { VacationPeriod, Appointment, AvailabilityBlock } from '@/types/people';
import { CustomRole } from '@/constants/permissions';
import { CRMStoreState } from '../types';

export interface PeopleSlice {
  teamProfiles: UserProfile[];
  vacations: VacationPeriod[];
  appointments: Appointment[];
  availabilityBlocks: AvailabilityBlock[];
  orgRoles: CustomRole[];
  onboardingQuestions: OnboardingQuestion[];
  pendingVacationsCount: number;
  okrs: Objective[];
  feedbackRequests: FeedbackRequest[];
  
  handleSaveVacationRequest: (vacationData: Partial<VacationPeriod>) => Promise<void>;
  handleDeleteVacationRequest: (id: string) => Promise<void>;
  handleRequestAppointment: (appointment: Partial<Appointment>, userId: string) => Promise<void>;
  handleUpdateAppointmentStatus: (id: string, status: Appointment['status'], userId: string) => Promise<void>;
  handleSaveAvailabilityBlock: (block: Partial<AvailabilityBlock>) => Promise<void>;
  handleDeleteAvailabilityBlock: (id: string) => Promise<void>;

  // OKRs e Feedbacks
  handleSaveObjective: (objective: Partial<Objective>) => Promise<void>;
  handleDeleteObjective: (id: string) => Promise<void>;
  handleRequestFeedback: (request: Partial<FeedbackRequest>) => Promise<void>;
  handleUpdateFeedbackRequestStatus: (id: string, status: FeedbackRequest['status'], responseText?: string) => Promise<void>;
}

export const createPeopleSlice: StateCreator<
  CRMStoreState,
  [],
  [],
  PeopleSlice
> = (set, get) => ({
  teamProfiles: [],
  vacations: [],
  appointments: [],
  availabilityBlocks: [],
  orgRoles: [],
  onboardingQuestions: [],
  pendingVacationsCount: 0,
  okrs: [],
  feedbackRequests: [],

  handleSaveVacationRequest: async (vacationData) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      const id = vacationData.id || doc(collection(db, 'organizations', orgId, 'vacations')).id;
      await setDoc(doc(db, 'organizations', orgId, 'vacations', id), {
        ...vacationData,
        id,
        createdAt: vacationData.createdAt || Date.now()
      }, { merge: true });
      toast.success('Solicitação de férias enviada!');
    } catch (err) {
      console.error("[PeopleSlice] Error saving vacation:", err);
    }
  },

  handleDeleteVacationRequest: async (id) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'vacations', id));
      toast.success('Solicitação removida.');
    } catch (err) {
      console.error("[PeopleSlice] Error deleting vacation:", err);
    }
  },

  handleRequestAppointment: async (appointment, userId) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      const id = doc(collection(db, 'organizations', orgId, 'appointments')).id;
      await setDoc(doc(db, 'organizations', orgId, 'appointments', id), {
        ...appointment,
        id,
        userId,
        status: 'pending',
        createdAt: Date.now()
      });
      toast.success('Reunião solicitada!');
    } catch (err) {
      console.error("[PeopleSlice] Error requesting appointment:", err);
    }
  },

  handleUpdateAppointmentStatus: async (id, status, userId) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      await setDoc(doc(db, 'organizations', orgId, 'appointments', id), {
        status,
        updatedAt: Date.now()
      }, { merge: true });
      toast.success('Status da reunião atualizado!');
    } catch (err) {
      console.error("[PeopleSlice] Error updating appointment:", err);
    }
  },

  handleSaveAvailabilityBlock: async (block) => {
    const orgId = get().effectiveOrgId;
    const userId = get().currentUserId;
    if (!orgId || !userId) return;
    try {
      const id = block.id || doc(collection(db, 'organizations', orgId, 'availabilityBlocks')).id;
      await setDoc(doc(db, 'organizations', orgId, 'availabilityBlocks', id), {
        ...block,
        id,
        userId,
        orgId,
        createdAt: Date.now()
      }, { merge: true });
      toast.success('Disponibilidade atualizada!');
    } catch (err) {
      console.error("[PeopleSlice] Error saving block:", err);
    }
  },

  handleDeleteAvailabilityBlock: async (id) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'availabilityBlocks', id));
      toast.success('Bloqueio removido.');
    } catch (err) {
      console.error("[PeopleSlice] Error deleting block:", err);
    }
  },

  handleSaveObjective: async (objective) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      const id = objective.id || doc(collection(db, 'organizations', orgId, 'okrs')).id;
      await setDoc(doc(db, 'organizations', orgId, 'okrs', id), {
        ...objective,
        id,
        createdAt: objective.createdAt || Date.now(),
        updatedAt: Date.now()
      }, { merge: true });
      toast.success('OKR salvo com sucesso!');
    } catch (err) {
      console.error("[PeopleSlice] Error saving OKR:", err);
      toast.error('Erro ao salvar OKR');
    }
  },

  handleDeleteObjective: async (id) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'okrs', id));
      toast.success('OKR removido.');
    } catch (err) {
      console.error("[PeopleSlice] Error deleting OKR:", err);
    }
  },

  handleRequestFeedback: async (request) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      const id = request.id || doc(collection(db, 'organizations', orgId, 'feedbackRequests')).id;
      await setDoc(doc(db, 'organizations', orgId, 'feedbackRequests', id), {
        ...request,
        id,
        status: request.status || 'pending',
        createdAt: request.createdAt || Date.now()
      }, { merge: true });
      toast.success('Solicitação de feedback enviada!');
    } catch (err) {
      console.error("[PeopleSlice] Error requesting feedback:", err);
      toast.error('Erro ao enviar solicitação');
    }
  },

  handleUpdateFeedbackRequestStatus: async (id, status, responseText) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      await setDoc(doc(db, 'organizations', orgId, 'feedbackRequests', id), {
        status,
        completedAt: status === 'completed' ? Date.now() : undefined,
        ...(responseText && { responseText }) // Se for implementar a resposta diretamente no request futuramente
      }, { merge: true });
      toast.success('Status da solicitação atualizado!');
    } catch (err) {
      console.error("[PeopleSlice] Error updating feedback request:", err);
    }
  },
});
