import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testes unitários para o Webhook do Asaas
 * Testa: autenticação por token, idempotência, roteamento de eventos
 * 
 * Como o webhook usa firebase-admin (não o SDK client), 
 * mockamos todo o módulo de DB e testamos a lógica do handler.
 */

// ===== MOCKS =====

// Mock dos handlers
const mockHandlePaymentReceived = vi.fn();
const mockHandlePaymentOverdue = vi.fn();
const mockHandlePaymentCreated = vi.fn();

// Mock do Firestore (firebase-admin)
const mockDocRef = {
  update: vi.fn().mockResolvedValue(undefined),
};

const mockDocSnapshot = {
  exists: false,
  data: () => ({ asaasCustomerId: 'cus_123', name: 'Test Client' }),
  ref: mockDocRef,
};

const mockSnapshotResult = {
  empty: true,
  docs: [] as typeof mockDocSnapshot[],
};

const mockDb = {
  collection: vi.fn().mockReturnThis(),
  collectionGroup: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue(mockSnapshotResult),
      }),
    }),
  }),
  runTransaction: vi.fn(),
};

// Mock modules
vi.mock('../../_utils/firebase.js', () => ({
  db: mockDb,
}));

vi.mock('./handlers/payment_received.js', () => ({
  handlePaymentReceived: mockHandlePaymentReceived,
}));

vi.mock('./handlers/payment_overdue.js', () => ({
  handlePaymentOverdue: mockHandlePaymentOverdue,
}));

vi.mock('./handlers/payment_created.js', () => ({
  handlePaymentCreated: mockHandlePaymentCreated,
}));

// ===== HELPERS =====

const createMockReq = (method: string, headers: Record<string, string>, body: any) => ({
  method,
  headers,
  body,
});

const createMockRes = () => {
  const res: any = { statusCode: 0, responseData: null };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: any) => { res.responseData = data; return res; };
  return res;
};

// ===== TESTES =====

describe('Asaas Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', 'test-secret-token');
    
    // Reset mock defaults
    mockSnapshotResult.empty = true;
    mockSnapshotResult.docs = [];
    mockDb.runTransaction.mockResolvedValue(false); // Not processed yet
  });

  it('deve retornar 405 para método GET', async () => {
    // Importação dinâmica para que os mocks se apliquem
    const { default: handler } = await import('../../api/_logic/asaas/webhook');
    
    const req = createMockReq('GET', {}, {});
    const res = createMockRes();
    
    await handler(req as any, res as any);
    
    expect(res.statusCode).toBe(405);
    expect(res.responseData).toEqual({ error: 'Method Not Allowed' });
  });

  it('deve retornar 401 para token inválido', async () => {
    const { default: handler } = await import('../../api/_logic/asaas/webhook');
    
    const req = createMockReq('POST', { 'asaas-access-token': 'wrong-token' }, {
      event: 'PAYMENT_RECEIVED',
      payment: { customer: 'cus_123' },
    });
    const res = createMockRes();
    
    await handler(req as any, res as any);
    
    expect(res.statusCode).toBe(401);
    expect(res.responseData).toEqual({ error: 'Unauthorized' });
  });

  it('deve retornar 500 quando ASAAS_WEBHOOK_TOKEN não está configurado', async () => {
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', '');
    
    const { default: handler } = await import('../../api/_logic/asaas/webhook');
    
    const req = createMockReq('POST', { 'asaas-access-token': 'any' }, {});
    const res = createMockRes();
    
    await handler(req as any, res as any);
    
    expect(res.statusCode).toBe(500);
  });

  it('deve retornar 200 com info quando não há contexto de cliente', async () => {
    const { default: handler } = await import('../../api/_logic/asaas/webhook');
    
    const req = createMockReq('POST', { 'asaas-access-token': 'test-secret-token' }, {
      event: 'PAYMENT_RECEIVED',
      id: 'evt_001',
      // Sem payment.customer
    });
    const res = createMockRes();
    
    await handler(req as any, res as any);
    
    expect(res.statusCode).toBe(200);
    expect(res.responseData).toHaveProperty('info', 'No customer context');
  });

  it('deve retornar 200 com duplicate=true para evento já processado', async () => {
    mockDb.runTransaction.mockResolvedValue(true); // Already processed
    
    const { default: handler } = await import('../../api/_logic/asaas/webhook');
    
    const req = createMockReq('POST', { 'asaas-access-token': 'test-secret-token' }, {
      event: 'PAYMENT_RECEIVED',
      id: 'evt_duplicate',
      payment: { customer: 'cus_123' },
    });
    const res = createMockRes();
    
    await handler(req as any, res as any);
    
    expect(res.statusCode).toBe(200);
    expect(res.responseData).toHaveProperty('duplicate', true);
  });

  it('deve retornar 200 quando cliente não é encontrado no Firestore', async () => {
    mockSnapshotResult.empty = true;
    mockSnapshotResult.docs = [];
    
    const { default: handler } = await import('../../api/_logic/asaas/webhook');
    
    const req = createMockReq('POST', { 'asaas-access-token': 'test-secret-token' }, {
      event: 'PAYMENT_RECEIVED',
      id: 'evt_002',
      payment: { customer: 'cus_unknown' },
    });
    const res = createMockRes();
    
    await handler(req as any, res as any);
    
    expect(res.statusCode).toBe(200);
    expect(res.responseData).toEqual({ received: true });
  });
});
