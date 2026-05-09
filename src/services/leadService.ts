import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Lead, LeadActivity, LeadStatus } from '@/types';
import { auditService } from './auditService';

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
    
    // Log Audit
    await auditService.logActivity(orgId, {
      userId: payload.assignedTo || 'system',
      userName,
      action: 'LEAD_CREATED',
      targetId: docRef.id,
      targetType: 'lead',
      details: `Lead ${payload.name} criado.`
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

    // Auditoria para mudanças críticas (Conversão ou Perda)
    if (targetStatus === 'Convertido' || targetStatus === 'Perdido') {
      await auditService.logActivity(orgId, {
        userId: lead.assignedTo || 'system',
        userName,
        action: `LEAD_STATUS_${targetStatus.toUpperCase()}`,
        targetId: lead.id,
        targetType: 'lead',
        details: `Lead ${lead.name} marcado como ${targetStatus}.`
      });
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
    // Nota: Como deletamos, precisamos de dados básicos antes ou logar apenas o ID
    await auditService.logActivity(orgId, {
      userId: 'admin', // Idealmente passar o UID do executor
      userName: 'Administrador',
      action: 'LEAD_DELETED',
      targetId: leadId,
      targetType: 'lead',
      details: `Lead ID ${leadId} excluído permanentemente.`
    });

    return await deleteDoc(doc(db, 'organizations', orgId, 'leads', leadId));
  },

  /**
   * Cleans up ghost leads (leads with invalid statuses).
   */
  cleanupGhostLeads: async (orgId: string, ghostLeads: Lead[]) => {
    const deletePromises = ghostLeads.map(l => deleteDoc(doc(db, 'organizations', orgId, 'leads', l.id)));
    return await Promise.all(deletePromises);
  }
};
