/**
 * ============================================================
 * TESTES UNITÁRIOS — Asaas Webhook Handler
 * ============================================================
 * Testam: autenticação por token, idempotência, roteamento de
 * eventos, atualização de status e anti-spam de e-mails.
 *
 * O módulo webhook.ts importa `db` de '../../_utils/firebase.js'.
 * Mockamos esse módulo para interceptar runTransaction e 
 * collectionGroup corretamente.
 * ============================================================
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

// Mock do emailService
vi.mock('../../src/services/emailService.js', () => ({
  sendPagamentoRecebidoEmail: vi.fn().mockResolvedValue(true),
  sendBoasVindasSubscriptionEmail: vi.fn().mockResolvedValue(true),
  sendFaturaEmitidaEmail: vi.fn().mockResolvedValue(true),
  sendFaturaVencimentoEmail: vi.fn().mockResolvedValue(true),
}));

// Mock do emailLogger
vi.mock('../_utils/emailLogger.js', () => ({
  logEmailHistory: vi.fn().mockResolvedValue(true),
}));

// ── Firestore state ──────────────────────────────────────────
// Variables that tests can configure BEFORE calling handler
let transactionImpl: ((fn: Function) => Promise<any>) | null = null;
let collectionGroupResult: any = null;
let webhookEventsStore: Record<string, boolean> = {};

vi.mock('../_utils/firebase.js', () => {
  return {
    admin: {
      firestore: {
        FieldValue: {
          arrayUnion: vi.fn((val) => [val]),
        },
      },
    },
    db: {
      runTransaction: (fn: Function) => {
        if (transactionImpl) return transactionImpl(fn);
        // Default: simple pass-through that marks events as new
        const t = {
          get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
          set: vi.fn(),
          update: vi.fn(),
        };
        return fn(t);
      },
      collectionGroup: () => collectionGroupResult,
      collection: (name: string) => ({
        doc: (id: string) => ({
          id,
          get: vi.fn().mockResolvedValue({ exists: !!webhookEventsStore[id] }),
          set: vi.fn().mockImplementation(() => { webhookEventsStore[id] = true; }),
        }),
      }),
    },
  };
});

// ── Import do handler (depois dos mocks) ─────────────────────
import handler from '../_logic/asaas/webhook';
import {
  sendPagamentoRecebidoEmail,
} from '../../src/services/emailService';

// ── Helpers ──────────────────────────────────────────────────
function createReq(overrides: any = {}) {
  return {
    method: 'POST',
    headers: { 'asaas-access-token': 'test-token-123' },
    body: {},
    ...overrides,
  } as any;
}

function createRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status: vi.fn().mockImplementation((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn().mockImplementation((data: any) => {
      res.body = data;
      return res;
    }),
    end: vi.fn(),
  };
  return res;
}

function createMockDocRef(data: Record<string, any> = {}) {
  return {
    id: 'mock-doc-id',
    ref: {
      update: vi.fn().mockResolvedValue(true),
      parent: { parent: { id: 'org-123' } },
    },
    data: () => ({ ...data }),
    exists: true,
  };
}

function createClientQueryResult(docs: any[]) {
  return {
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          empty: docs.length === 0,
          docs,
        }),
      }),
    }),
  };
}

// ── Testes ────────────────────────────────────────────────────
describe('Asaas Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ASAAS_WEBHOOK_TOKEN = 'test-token-123';
    transactionImpl = null;
    collectionGroupResult = null;
    webhookEventsStore = {};
  });

  // ──────── Autenticação ────────
  describe('Autenticação por Token', () => {
    it('deve rejeitar requisições que NÃO sejam POST', async () => {
      const req = createReq({ method: 'GET' });
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(405);
    });

    it('deve retornar 500 se ASAAS_WEBHOOK_TOKEN não estiver configurado', async () => {
      delete process.env.ASAAS_WEBHOOK_TOKEN;
      const req = createReq();
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toContain('not configured');
    });

    it('deve retornar 401 se o token for inválido', async () => {
      const req = createReq({ headers: { 'asaas-access-token': 'wrong-token' } });
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('deve aceitar o token correto e retornar 200', async () => {
      const req = createReq({ body: { event: 'UNKNOWN_EVENT', id: 'evt-1' } });
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('deve limpar aspas e espaços ao comparar tokens', async () => {
      process.env.ASAAS_WEBHOOK_TOKEN = '"test-token-123"';
      const req = createReq({
        headers: { 'asaas-access-token': ' test-token-123 ' },
        body: { event: 'TEST', id: 'e1' },
      });
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
    });
  });

  // ──────── Idempotência ────────
  describe('Idempotência (Anti-Duplicidade)', () => {
    it('deve ignorar um webhook já processado anteriormente', async () => {
      // Pre-populate the event as already processed
      transactionImpl = async (fn: Function) => {
        const t = {
          get: vi.fn().mockResolvedValue({ exists: true }),
          set: vi.fn(),
        };
        return fn(t);
      };

      const req = createReq({
        body: { event: 'PAYMENT_RECEIVED', id: 'evt-duplicate' },
      });
      const res = createRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.duplicate).toBe(true);
    });

    it('deve processar um event ID novo', async () => {
      const docRef = createMockDocRef({ email: 'test@example.com' });
      const req = createReq({
        body: { event: 'CUSTOMER_CREATED', id: 'evt-new', customer: { id: 'cus-1' } },
      });
      const res = createRes();

      // Return the client on first lookup — avoids retry delay timeout
      collectionGroupResult = createClientQueryResult([docRef]);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.duplicate).toBeUndefined();
    });
  });

  // ──────── Eventos de Pagamento ────────
  describe('Eventos de Pagamento (PAYMENT_*)', () => {

    function setupPaymentTest(clientData: Record<string, any> = {}) {
      const docRef = createMockDocRef({
        email: 'test@client.com',
        name: 'Test Client',
        sentEvents: [],
        ...clientData,
      });

      collectionGroupResult = createClientQueryResult([docRef]);

      // Transaction handler: 
      // call 1 = global idempotency (new event)
      // call 2+ = per-payment anti-spam (new)
      let callCount = 0;
      transactionImpl = async (fn: Function) => {
        callCount++;
        const t = {
          get: vi.fn().mockResolvedValue({
            exists: callCount > 1,
            data: () => ({ sentEvents: [], ...clientData }),
          }),
          set: vi.fn(),
          update: vi.fn(),
        };
        return fn(t);
      };

      return docRef;
    }

    it('deve atualizar status para RECEIVED/Ativo em PAYMENT_RECEIVED', async () => {
      const docRef = setupPaymentTest();
      const req = createReq({
        body: {
          event: 'PAYMENT_RECEIVED',
          id: 'evt-pr-1',
          payment: { customer: 'cus-1', id: 'pay-1', value: 897 },
        },
      });
      const res = createRes();
      await handler(req, res);

      expect(docRef.ref.update).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatus: 'RECEIVED', status: 'Ativo' })
      );
      expect(res.statusCode).toBe(200);
    });

    it('deve atualizar status para OVERDUE/Inadimplente em PAYMENT_OVERDUE', async () => {
      const docRef = setupPaymentTest();
      const req = createReq({
        body: {
          event: 'PAYMENT_OVERDUE',
          id: 'evt-po-1',
          payment: { customer: 'cus-1', id: 'pay-2', value: 897 },
        },
      });
      const res = createRes();
      await handler(req, res);

      expect(docRef.ref.update).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatus: 'OVERDUE', status: 'Inadimplente' })
      );
    });

    it('deve chamar e-mail de pagamento recebido', async () => {
      setupPaymentTest();
      const req = createReq({
        body: {
          event: 'PAYMENT_RECEIVED',
          id: 'evt-email-1',
          payment: { customer: 'cus-1', id: 'pay-3', value: 500, paymentDate: '2026-04-11' },
        },
      });
      const res = createRes();
      await handler(req, res);

      expect(sendPagamentoRecebidoEmail).toHaveBeenCalled();
    });
  });

  // ──────── Eventos de Assinatura ────────
  describe('Eventos de Assinatura (SUBSCRIPTION_*)', () => {
    it('deve definir status como Cancelado em SUBSCRIPTION_DELETED', async () => {
      const docRef = createMockDocRef({ email: 'sub@test.com' });

      collectionGroupResult = createClientQueryResult([docRef]);

      const req = createReq({
        body: {
          event: 'SUBSCRIPTION_DELETED',
          id: 'evt-sd-1',
          subscription: { customer: 'cus-sub' },
        },
      });
      const res = createRes();
      await handler(req, res);

      expect(docRef.ref.update).toHaveBeenCalledWith({ status: 'Cancelado' });
    });
  });
});
