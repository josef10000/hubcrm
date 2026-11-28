import type { VercelRequest } from '@vercel/node';
import { admin, db } from '../../_utils/firebase.js';
import { portalSignContractSchema } from '../../../shared/schemas.js';
import { PortalRequestError } from './errors.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function signPortalContract(input: unknown, request: VercelRequest) {
  const parsed = portalSignContractSchema.safeParse(input);
  if (!parsed.success) throw new PortalRequestError(400, 'Os dados da assinatura são inválidos.');

  const { orgId, clientId, token, contractId } = parsed.data;
  const clientRef = db.collection('organizations').doc(orgId).collection('clients').doc(clientId);
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwardedAddress = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
  const ipAddress = (forwardedAddress || request.socket.remoteAddress || 'indisponível').trim().slice(0, 64);
  const rawUserAgent = request.headers['user-agent'];
  const userAgent = (Array.isArray(rawUserAgent) ? rawUserAgent[0] : rawUserAgent || 'indisponível').slice(0, 512);
  const timestamp = Date.now();

  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(clientRef);
    if (!snapshot.exists) throw new PortalRequestError(404, 'Cliente não encontrado.');

    const client = snapshot.data() as Record<string, unknown> | undefined;
    if (!client || typeof client.publicToken !== 'string' || client.publicToken !== token) {
      throw new PortalRequestError(403, 'O link do portal é inválido ou expirou.');
    }

    const contracts = Array.isArray(client.contracts) ? client.contracts : [];
    const contract = contracts.find(item => isRecord(item) && item.id === contractId);
    if (!isRecord(contract)) throw new PortalRequestError(404, 'Contrato não encontrado.');
    if (contract.status === 'signed') throw new PortalRequestError(409, 'Este contrato já foi assinado.');

    const updatedContracts = contracts.map(item =>
      isRecord(item) && item.id === contractId
        ? { ...item, status: 'signed', signedAt: timestamp, signedIp: ipAddress, signedUserAgent: userAgent }
        : item
    );
    const logs = Array.isArray(client.logs) ? client.logs : [];
    const signatureLog = {
      id: `signature-${contractId}-${timestamp}`,
      text: `Contrato assinado digitalmente via Portal do Cliente sob o IP ${ipAddress}.`,
      date: timestamp
    };

    transaction.update(clientRef, {
      contracts: updatedContracts,
      logs: [...logs, signatureLog],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, contractId, signedAt: timestamp };
  });
}
