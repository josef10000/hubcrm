import { admin, db } from '../../_utils/firebase.js';
import { generatePublicToken } from '../../_utils/tokens.js';
import { onboardingAccessSchema, onboardingSubmitSchema } from '../../../shared/schemas.js';
import { z } from 'zod';
import { PortalRequestError } from './errors.js';

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new PortalRequestError(400, 'Os dados do formulário são inválidos.');
  return result.data;
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asAnswers(value: unknown): Record<string, string> {
  const parsed = z.record(z.string(), z.string()).safeParse(value);
  return parsed.success ? parsed.data : {};
}

async function loadAuthorizedClient(orgId: string, clientId: string, token: string) {
  const clientRef = db.collection('organizations').doc(orgId).collection('clients').doc(clientId);
  const snapshot = await clientRef.get();
  if (!snapshot.exists) throw new PortalRequestError(404, 'Cliente não encontrado.');

  const client = snapshot.data();
  if (!client?.publicToken || client.publicToken !== token) {
    throw new PortalRequestError(403, 'O link do formulário é inválido ou expirou.');
  }
  return { clientRef, client };
}

export async function getOnboardingClient(input: unknown) {
  const data = parseInput(onboardingAccessSchema, input);
  const { client } = await loadAuthorizedClient(data.orgId, data.clientId, data.token);

  return {
    name: asText(client.name),
    email: asText(client.email),
    whatsapp: asText(client.whatsapp),
    cpfCnpj: asText(client.cpfCnpj),
    plan: asText(client.plan, 'Essencial'),
    billingCycle: asText(client.billingCycle, 'MONTHLY'),
    customSetupPrice: asFiniteNumber(client.customSetupPrice),
    customMonthlyPrice: asFiniteNumber(client.customMonthlyPrice),
    onboardingAnswers: asAnswers(client.onboardingAnswers)
  };
}

export async function submitOnboarding(input: unknown) {
  const data = parseInput(onboardingSubmitSchema, input);
  const { orgId, clientId, referralId, token, basicData, answers } = data;

  if (clientId) {
    const { clientRef } = await loadAuthorizedClient(orgId, clientId, token);
    await clientRef.update({
      name: basicData.name,
      email: basicData.email,
      whatsapp: basicData.whatsapp,
      cpfCnpj: basicData.cpfCnpj,
      onboardingAnswers: answers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { clientId };
  }

  if (!referralId) throw new PortalRequestError(400, 'A indicação deste formulário é inválida.');
  await loadAuthorizedClient(orgId, referralId, token);

  const clientRef = db.collection('organizations').doc(orgId).collection('clients').doc();
  const newClientId = clientRef.id;
  const now = admin.firestore.FieldValue.serverTimestamp();
  await clientRef.set({
    id: newClientId,
    name: basicData.name,
    email: basicData.email,
    whatsapp: basicData.whatsapp,
    cpfCnpj: basicData.cpfCnpj,
    plan: basicData.plan,
    billingCycle: basicData.billingCycle,
    status: 'Em Desenvolvimento',
    createdAt: now,
    updatedAt: now,
    onboardingAnswers: answers,
    referredBy: referralId,
    publicToken: generatePublicToken()
  });

  await db.collection('organizations').doc(orgId).collection('referrals').add({
    referrerId: referralId,
    referredClientId: newClientId,
    status: 'pending',
    createdAt: now
  });

  return { clientId: newClientId };
}
