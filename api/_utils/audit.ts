import { db } from './firebase.js';
import type { AuditLogEntry } from '../../shared/types.js';

/**
 * Registra uma atividade no log de auditoria da organização.
 */
export async function logActivity(params: AuditLogEntry) {
  try {
    const logRef = db.collection('organizations')
      .doc(params.orgId)
      .collection('audit_logs')
      .doc();

    await logRef.set({
      id: logRef.id,
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      targetId: params.targetId,
      targetType: params.targetType,
      details: params.details,
      metadata: params.metadata || {},
      timestamp: Date.now()
    });
    
    console.log(`[AUDIT] Action: ${params.action} | Target: ${params.targetType}/${params.targetId} | User: ${params.userName}`);
    return logRef.id;
  } catch (error) {
    console.error('[CRITICAL] Failed to log audit trail:', error);
    return null;
  }
}
