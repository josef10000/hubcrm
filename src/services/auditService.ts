import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface AuditLog {
  userId: string;
  userName: string;
  action: string;
  targetId: string;
  targetType: 'lead' | 'client' | 'contract' | 'transaction' | 'role' | 'team';
  details: string;
  metadata?: any;
}

/**
 * Registra uma atividade no log de auditoria da organização (Client-side).
 */
export const auditService = {
  logActivity: async (orgId: string, params: AuditLog) => {
    try {
      if (!orgId) return null;
      
      const logData = {
        ...params,
        timestamp: Date.now(), // Usamos timestamp local para consistência com o restante do app
        serverTimestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'organizations', orgId, 'audit_logs'), logData);
      return docRef.id;
    } catch (error) {
      console.error('[AUDIT_SERVICE] Error logging activity:', error);
      return null;
    }
  }
};
