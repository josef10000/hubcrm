import { db } from './firebase.js';

export interface AuditLogParams {
  orgId: string;
  userId: string;
  userName: string;
  action: string;
  targetId: string;
  targetType: 'lead' | 'client' | 'contract' | 'transaction' | 'role' | 'team';
  details: string;
  metadata?: any;
}

/**
 * Registra uma atividade no log de auditoria da organização.
 */
export async function logActivity(params: AuditLogParams) {
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
