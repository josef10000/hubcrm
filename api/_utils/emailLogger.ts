import { db } from './firebase.js';
import adminImport from 'firebase-admin';
const admin = (adminImport as any).default || adminImport;

export interface EmailLogData {
  type: 'WELCOME' | 'INVOICE' | 'OVERDUE' | 'RECEIPT';
  status: 'sent' | 'failed';
  sentAt: number;
  recipient: string;
  subject: string;
}

/**
 * Logs an email event into the client's emailHistory array in Firestore.
 */
export async function logEmailHistory(userId: string, clientId: string, logData: EmailLogData) {
  try {
    const clientRef = db.collection('users').doc(userId).collection('clients').doc(clientId);
    
    // Generate a unique ID for the log entry
    const entryId = Math.random().toString(36).substring(2, 15);
    const entry = {
      ...logData,
      id: entryId
    };

    await clientRef.update({
      emailHistory: admin.firestore.FieldValue.arrayUnion(entry)
    });

    console.log(`[EmailLogger] Logged ${logData.type} email to client ${clientId}`);
    return true;
  } catch (error) {
    console.error(`[EmailLogger] Error logging email history for client ${clientId}:`, error);
    return false;
  }
}
