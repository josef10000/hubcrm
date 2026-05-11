import { StateCreator } from 'zustand';
import { 
  collection, doc, setDoc, deleteDoc, 
  query, where, onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { UserProfile, OnboardingQuestion } from '@/types';
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
  
  handleSaveVacationRequest: (vacationData: Partial<VacationPeriod>) => Promise<void>;
  handleDeleteVacationRequest: (id: string) => Promise<void>;
  handleRequestAppointment: (appointment: Partial<Appointment>, userId: string) => Promise<void>;
  handleUpdateAppointmentStatus: (id: string, status: Appointment['status'], userId: string) => Promise<void>;
  handleSaveAvailabilityBlock: (block: Partial<AvailabilityBlock>) => Promise<void>;
  handleDeleteAvailabilityBlock: (id: string) => Promise<void>;
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
});
