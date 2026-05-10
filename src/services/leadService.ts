import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { Lead, LeadActivity, LeadStatus } from '@/types';
import { eventBus, HUB_EVENTS } from '@core/events/eventBus';

export const leadService = {
  /**
   * Creates a new lead with an initial activity.
   */
  createLead: async (orgId: string, payload: any, userName: string) => {
    const activity: LeadActivity = {
      id: Math.random().toString(36).substring(2),
      type: 'status_change',
      text: 'Lead criado no sistema',
      date: Date.now(),
      userName
    };

    const finalPayload = {
      ...payload,
      status: 'Novo',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activities: [activity]
    };

    const docRef = await addDoc(collection(db, 'organizations', orgId, 'leads'), finalPayload);
    
    // Emit Business Event
    // Emit Business Event
    eventBus.emit(HUB_EVENTS.CRM.LEAD_CREATED, { 
      id: docRef.id, 
      orgId,
      ...finalPayload 
    });

    return docRef;
  },

  /**
   * Updates an existing lead.
   */
  updateLead: async (orgId: string, leadId: string, data: any) => {
    return await updateDoc(doc(db, 'organizations', orgId, 'leads', leadId), {
      ...data,
      updatedAt: Date.now()
    });
  },

  /**
   * Moves a lead to a new status and logs the activity.
   */
  moveLead: async (orgId: string, lead: Lead, targetStatus: LeadStatus, userName: string) => {
    const activity: LeadActivity = {
      id: Math.random().toString(36).substring(2),
      type: 'status_change',
      text: `Mudança de status para ${targetStatus}`,
      date: Date.now(),
      userName
    };

    const updatedActivities = [...(lead.activities || []), activity];

    await updateDoc(doc(db, 'organizations', orgId, 'leads', lead.id), {
      status: targetStatus,
      updatedAt: Date.now(),
      activities: updatedActivities
    });

    // Emit Business Event for Conversion
    if (targetStatus === 'Convertido') {
      eventBus.emit(HUB_EVENTS.CRM.LEAD_CONVERTED, lead);
    }

    if (targetStatus === 'Convertido') {
      eventBus.emit(HUB_EVENTS.CRM.LEAD_CONVERTED, lead);
    }
  },

  /**
   * Adds a custom activity to a lead.
   */
  addActivity: async (orgId: string, leadId: string, activity: LeadActivity, currentActivities: LeadActivity[]) => {
    return await updateDoc(doc(db, 'organizations', orgId, 'leads', leadId), {
      activities: [...currentActivities, activity],
      updatedAt: Date.now()
    });
  },

  /**
   * Deletes a lead.
   */
  deleteLead: async (orgId: string, leadId: string) => {
    return await deleteDoc(doc(db, 'organizations', orgId, 'leads', leadId));
  },

  /**
   * Cleans up ghost leads (leads with invalid statuses).
   */
  /**
   * Fetches a lead by ID.
   */
  getLeadById: async (orgId: string, leadId: string) => {
    const snap = await getDoc(doc(db, 'organizations', orgId, 'leads', leadId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Lead;
  }
};
