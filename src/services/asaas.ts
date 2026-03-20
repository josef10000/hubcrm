/**
 * Centralized Asaas API service.
 * All calls go through /api/asaas/ server-side routes to keep the API key secure.
 * Write operations (POST) include a Firebase Auth Bearer token.
 */

import { auth } from '../lib/firebase';

const ASAAS_BASE = '/api/asaas';

/**
 * Returns headers with the current user's Firebase ID token for authenticated requests.
 * Falls back to plain JSON headers if no user is signed in (for public routes).
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }
  return { 'Content-Type': 'application/json' };
}

async function handleResponse<T = any>(res: Response): Promise<T> {
  if (!res.ok) {
    let errData: any;
    try {
      errData = await res.json();
    } catch {
      errData = { error: await res.text() };
    }
    throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Customers ───────────────────────────────────────────────

export async function createCustomer(data: {
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
  phone?: string;
}) {
  const res = await fetch(`${ASAAS_BASE}/customers`, {
    method: 'POST', headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<{ id: string }>(res);
}

// ─── Subscriptions ───────────────────────────────────────────

export async function createSubscription(data: {
  customer: string;
  billingType: string;
  cycle: string;
  value: number;
  nextDueDate: string;
  description: string;
}) {
  const res = await fetch(`${ASAAS_BASE}/subscriptions`, {
    method: 'POST', headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<{ id: string }>(res);
}

export async function updateSubscription(data: {
  subscriptionId: string;
  nextDueDate?: string;
  updatePendingPayments?: boolean;
  billingType?: string;
  cycle?: string;
  value?: number;
  description?: string;
}) {
  const res = await fetch(`${ASAAS_BASE}/update-subscription`, {
    method: 'POST', headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteSubscription(subscriptionId: string) {
  const res = await fetch(`${ASAAS_BASE}/delete-subscription`, {
    method: 'POST', headers: await getAuthHeaders(),
    body: JSON.stringify({ subscriptionId }),
  });
  return handleResponse(res);
}

// ─── Payments ────────────────────────────────────────────────

export async function createPayment(data: {
  customer: string;
  billingType: string;
  value: number;
  dueDate: string;
  description: string;
}) {
  const res = await fetch(`${ASAAS_BASE}/payments`, {
    method: 'POST', headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<{ invoiceUrl?: string; bankSlipUrl?: string }>(res);
}

export async function getPaymentsByCustomer(customerId: string) {
  const res = await fetch(`${ASAAS_BASE}/payments?customer=${customerId}`);
  return handleResponse<{ data: Array<{ id: string; status: string }> }>(res);
}

export async function deletePayment(paymentId: string) {
  const res = await fetch(`${ASAAS_BASE}/delete-payment`, {
    method: 'POST', headers: await getAuthHeaders(),
    body: JSON.stringify({ paymentId }),
  });
  return handleResponse(res);
}

export async function getPaymentStatus(paymentId: string) {
  const res = await fetch(`${ASAAS_BASE}/payment-status?id=${paymentId}`);
  return handleResponse<{ status: string; invoiceUrl?: string; bankSlipUrl?: string }>(res);
}

// ─── Payment Links ───────────────────────────────────────────

export async function createPaymentLink(data: {
  name: string;
  description: string;
  value: number;
  billingType: string;
  chargeType: string;
  maxInstallmentCount: number;
  dueDateLimitDays: number;
  customer: string;
  endDate: string;
}) {
  const res = await fetch(`${ASAAS_BASE}/payment-links`, {
    method: 'POST', headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<{ url: string }>(res);
}

// ─── Subscription Payments ───────────────────────────────────

export async function getSubscriptionPayments(subscriptionId: string) {
  const res = await fetch(`${ASAAS_BASE}/payments?subscription=${subscriptionId}`);
  return handleResponse<{ data: Array<{ id: string; status: string; invoiceUrl?: string; bankSlipUrl?: string }> }>(res);
}

// ─── Bulk: cancel all pending/overdue payments ───────────────

export async function cancelPendingPayments(customerId: string) {
  const { data: payments } = await getPaymentsByCustomer(customerId);
  const pending = payments.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE');
  await Promise.allSettled(pending.map(p => deletePayment(p.id)));
}
