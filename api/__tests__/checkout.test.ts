/**
 * ============================================================
 * TESTES UNITÁRIOS — Public Checkout Handler
 * ============================================================
 * Testam: validação de entrada, criação de cliente Asaas,
 * cálculo de preço (mensal/anual), registro no Firestore
 * e fluxo de e-mail pós-checkout.
 * ============================================================
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

// Mock do emailService
vi.mock('../../src/services/emailService.js', () => ({
  sendFaturaEmitidaEmail: vi.fn().mockResolvedValue(true),
}));

// Mock do Asaas utils
const mockAsaasRequest = vi.fn();
vi.mock('../_utils/asaas.js', async importOriginal => ({
  ...await importOriginal<typeof import('../_utils/asaas.js')>(),
  asaasRequest: (...args: any[]) => mockAsaasRequest(...args),
}));

// In-memory document paths and atomic transaction commits. No network clients.
const mockDocGet = vi.fn();
const mockDocSet = vi.fn().mockResolvedValue(true);
const mockDocUpdate = vi.fn().mockResolvedValue(true);
const ledger = new Map<string, any>();
let rejectNextOrderCommit = false;

type Ref = ReturnType<typeof docRef>;
function docRef(path: string) {
  return {
    id: path.split('/').at(-1),
    path,
    collection: (name: string) => collectionRef(`${path}/${name}`),
    get: () => path.includes('/offers/') ? mockDocGet() : snapshot(path),
    set: (...args: any[]) => mockDocSet(...args),
    update: async (fields: object) => {
      await mockDocUpdate(fields);
      ledger.set(path, { ...ledger.get(path), ...fields });
    },
  };
}
function collectionRef(path: string) {
  return { doc: (id = 'new-client-id'): Ref => docRef(`${path}/${id}`) };
}
function snapshot(path: string) {
  return { exists: ledger.has(path), data: () => ledger.get(path) };
}

let queue = Promise.resolve();
vi.mock('../_utils/firebase.js', () => ({
  db: {
    collection: collectionRef,
    runTransaction: async (run: (tx: any) => Promise<any>) => {
      const previous = queue;
      let unlock!: () => void;
      queue = new Promise(resolve => { unlock = resolve; });
      await previous;
      try {
        const writes = new Map<string, any>();
        const result = await run({
          get: (ref: Ref) => ref.get(),
          create: (ref: Ref, value: object) => {
            if (ledger.has(ref.path)) throw new Error('Already exists');
            writes.set(ref.path, value);
          },
          update: (ref: Ref, value: object) => writes.set(ref.path, { ...ledger.get(ref.path), ...value }),
          set: (ref: Ref, value: object, options: { merge?: boolean }) =>
            writes.set(ref.path, options?.merge ? { ...ledger.get(ref.path), ...value } : value),
        });
        if (rejectNextOrderCommit && [...writes.keys()].some(path => path.includes('/orders/'))) {
          rejectNextOrderCommit = false;
          throw new Error('Simulated unavailable order commit');
        }
        writes.forEach((value, key) => ledger.set(key, value));
        return result;
      } finally {
        unlock();
      }
    },
  },
}));

// ── Import do handler ────────────────────────────────────────
import handler from '../public_checkout';
import { AsaasApiError } from '../_utils/asaas.js';
import { sendFaturaEmitidaEmail } from '../../src/services/emailService';

// ── Helpers ──────────────────────────────────────────────────
function createReq(body: any = {}) {
  return {
    method: 'POST',
    body,
  } as any;
}

function createRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    headers: {} as Record<string, string>,
    status: vi.fn().mockImplementation((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn().mockImplementation((data: any) => {
      res.body = data;
      return res;
    }),
    setHeader: vi.fn().mockImplementation((key: string, val: string) => {
      res.headers[key] = val;
    }),
    end: vi.fn(),
  };
  return res;
}

const validOffer = {
  active: true,
  name: 'Plano Profissional',
  type: 'SUBSCRIPTION',
  price: 897,
  setupPrice: 7500,
};

const validBody = {
  orgId: 'org-123',
  clientData: {
    name: 'João Silva',
    email: 'joao@test.com',
    whatsapp: '11999998888',
    cpfCnpj: '123.456.789-09',
    offerId: 'offer-1',
    billingCycle: 'MONTHLY',
  },
  briefingAnswers: { q1: 'Resposta 1' },
};

// ── Testes ────────────────────────────────────────────────────
describe('Public Checkout Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ledger.clear();
    rejectNextOrderCommit = false;
  });

  // ──────── Validação de Entrada ────────
  describe('Validação de Entrada', () => {
    it('deve responder 200 + CORS headers em OPTIONS (preflight)', async () => {
      const req = { method: 'OPTIONS' } as any;
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('deve rejeitar métodos diferentes de POST', async () => {
      const req = { method: 'GET' } as any;
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(405);
    });

    it('deve retornar 400 se orgId estiver ausente', async () => {
      const req = createReq({ clientData: { email: 'a@b.com', offerId: 'x' } });
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('organização');
    });

    it('deve retornar 400 se clientData não tiver email', async () => {
      const req = createReq({ orgId: 'org-1', clientData: { offerId: 'x' } });
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('incompletos');
    });

    it('deve retornar 400 se clientData não tiver offerId', async () => {
      const req = createReq({ orgId: 'org-1', clientData: { email: 'a@b.com' } });
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  // ──────── Validação de Oferta ────────
  describe('Validação de Oferta', () => {
    it('deve retornar 404 se a oferta não existir no Firestore', async () => {
      mockDocGet.mockResolvedValue({ exists: false, data: () => undefined });
      const req = createReq(validBody);
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('não encontrada');
    });

    it('deve retornar 400 se a oferta estiver inativa', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ ...validOffer, active: false }),
      });
      const req = createReq(validBody);
      const res = createRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('não está mais disponível');
    });
  });

  // ──────── Fluxo de Assinatura Mensal ────────
  describe('Criação de Assinatura Mensal', () => {
    beforeEach(() => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => validOffer,
      });

      // Mock: CPF não encontrado no Asaas
      mockAsaasRequest.mockImplementation((endpoint: string, method: string) => {
        if (endpoint.includes('/customers?cpfCnpj=')) {
          return { data: [] };
        }
        if (endpoint === '/customers' && method === 'POST') {
          return { id: 'cus_123' };
        }
        if (endpoint === '/subscriptions' && method === 'POST') {
          return { id: 'sub_123', paymentLink: 'https://pay.asaas.com/sub' };
        }
        if (endpoint.includes('/payments')) {
          return { data: [{ invoiceUrl: 'https://pay.asaas.com/invoice', id: 'pay_1' }] };
        }
        return {};
      });
    });

    it('deve criar cliente no Asaas quando CPF não existir', async () => {
      const req = createReq(validBody);
      const res = createRes();
      await handler(req, res);

      // Deve ter chamado POST /customers
      expect(mockAsaasRequest).toHaveBeenCalledWith(
        '/customers',
        'POST',
        expect.objectContaining({ name: 'João Silva', email: 'joao@test.com' })
      );
    });

    it('deve criar assinatura para plano SUBSCRIPTION + MONTHLY', async () => {
      const req = createReq(validBody);
      const res = createRes();
      await handler(req, res);

      expect(mockAsaasRequest).toHaveBeenCalledWith(
        '/subscriptions',
        'POST',
        expect.objectContaining({
          customer: 'cus_123',
          value: 897,
        })
      );
    });

    it('deve salvar o cliente no Firestore com os dados corretos', async () => {
      const req = createReq(validBody);
      const res = createRes();
      await handler(req, res);

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-client-id',
          name: 'João Silva',
          email: 'joao@test.com',
          asaasCustomerId: 'cus_123',
          billingCycle: 'MONTHLY',
          onboardingCompleted: true,
          convertedVia: 'Pagamento Transparente',
        })
      );
    });

    it('deve retornar a URL de checkout', async () => {
      const req = createReq(validBody);
      const res = createRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.checkoutUrl).toBeDefined();
    });

    it('deve enviar e-mail de fatura após a criação', async () => {
      const req = createReq(validBody);
      const res = createRes();
      await handler(req, res);

      expect(sendFaturaEmitidaEmail).toHaveBeenCalledWith(
        'joao@test.com',
        'João Silva',
        expect.any(Number),
        expect.any(String),
        expect.any(String),
        expect.stringContaining('Plano Profissional'),
        expect.any(String)
      );
    });
  });

  // ──────── Fluxo Anual (Pagamento Único) ────────
  describe('Criação de Plano Anual (Pagamento Único)', () => {
    beforeEach(() => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => validOffer,
      });

      mockAsaasRequest.mockImplementation((endpoint: string, method: string) => {
        if (endpoint.includes('/customers?cpfCnpj=')) return { data: [] };
        if (endpoint === '/customers' && method === 'POST') return { id: 'cus_yr' };
        if (endpoint === '/payments' && method === 'POST') {
          return { invoiceUrl: 'https://pay.asaas.com/yearly', id: 'pay_yr' };
        }
        return {};
      });
    });

    it('deve criar pagamento único com desconto de 15% para plano anual', async () => {
      const yearlyBody = {
        ...validBody,
        clientData: { ...validBody.clientData, billingCycle: 'YEARLY' },
      };
      const req = createReq(yearlyBody);
      const res = createRes();
      await handler(req, res);

      // YEARLY: price * 12 * 0.85 = 897 * 12 * 0.85 = 9149.4
      // Total = 9149.4 + 7500 (setup) = 16649.4
      expect(mockAsaasRequest).toHaveBeenCalledWith(
        '/payments',
        'POST',
        expect.objectContaining({
          customer: 'cus_yr',
          value: expect.closeTo(16649.4, 1),
        })
      );
    });
  });

  // ──────── Registro de Contrato ────────
  describe('Registro de Contrato Digital', () => {
    beforeEach(() => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => validOffer,
      });

      mockAsaasRequest.mockImplementation((endpoint: string, method: string) => {
        if (endpoint.includes('/customers?cpfCnpj=')) return { data: [] };
        if (endpoint === '/customers' && method === 'POST') return { id: 'cus_contract' };
        if (endpoint === '/subscriptions' && method === 'POST') return { id: 'sub_c', paymentLink: '' };
        if (endpoint.includes('/payments')) return { data: [{ invoiceUrl: '', id: 'pay_c' }] };
        return {};
      });
    });

    it('deve salvar contrato assinado quando aceito no checkout', async () => {
      const bodyWithContract = {
        ...validBody,
        contract: {
          accepted: true,
          content: 'Termos e condições completos...',
          signatureName: 'João Silva',
        },
      };
      const req = createReq(bodyWithContract);
      const res = createRes();
      await handler(req, res);

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          contracts: expect.arrayContaining([
            expect.objectContaining({
              status: 'signed',
              signatureName: 'João Silva',
              content: 'Termos e condições completos...',
            }),
          ]),
        })
      );
    });

    it('deve salvar array vazio de contratos quando não aceito', async () => {
      const req = createReq(validBody);
      const res = createRes();
      await handler(req, res);

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          contracts: [],
        })
      );
    });
  });
  describe('Retomada de cartão', () => {
    const body = {
      ...validBody,
      paymentMethod: 'CREDIT_CARD',
      attemptId: '80911131-7127-4dd3-bd17-9293d67b50b4',
      attribution: { utmSource: 'teste' },
      creditCard: { number: 'SIMULATED_CARD', ccv: 'TEST_ONLY' },
    };
    const { creditCard, ...statusBody } = body;
    const orderPath = 'organizations/org-123/orders/pay_card';
    let providerStatus: string;
    let paidResponseLost: boolean;
    let rejectFirstCard: boolean;
    let creationResponseLost: boolean;

    const submit = async (payload: any = body) => {
      const res = createRes();
      await handler(createReq(payload), res);
      return res;
    };
    const creates = (path = '/payments') => mockAsaasRequest.mock.calls.filter(([url, method]) => method === 'POST' && url === path);
    const captures = () => creates('/payments/pay_card/payWithCreditCard');

    beforeEach(() => {
      providerStatus = 'PENDING';
      paidResponseLost = false;
      rejectFirstCard = false;
      creationResponseLost = false;
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ ...validOffer, type: 'SINGLE', id: 'offer-1' }),
      });
      mockAsaasRequest.mockImplementation(async (endpoint: string, method: string) => {
        if (endpoint.startsWith('/customers?')) return { data: [{ id: 'cus_card' }] };
        const payment = () => ({
          id: 'pay_card', customer: 'cus_card', invoiceUrl: 'https://example.test/card', status: providerStatus,
        });
        if (endpoint === '/payments' && method === 'POST') {
          if (creationResponseLost) throw new Error('Simulated lost creation response');
          return payment();
        }
        if (endpoint === '/payments?externalReference=hubcheckout-' + body.attemptId) return { data: [payment()] };
        if (endpoint === '/subscriptions' && method === 'POST') return { id: 'sub_card' };
        if (endpoint === '/subscriptions/sub_card/payments') return { data: [payment()] };
        if (endpoint === '/payments/pay_card') return payment();
        if (endpoint === '/payments/pay_card/payWithCreditCard') {
          if (rejectFirstCard) {
            rejectFirstCard = false;
            throw new AsaasApiError(400, 'Simulated decline');
          }
          providerStatus = 'CONFIRMED';
          if (paidResponseLost) throw new Error('Simulated timeout');
          return payment();
        }
        throw new Error('Unexpected test input: ' + endpoint);
      });
    });

    it('confirma e registra o pagamento original mesmo se a gravação do pedido precisar ser retomada', async () => {
      rejectNextOrderCommit = true;
      const first = await submit();
      expect(first.body.code).toBe('CARD_REVIEW');
      expect(ledger.has(orderPath)).toBe(false);

      // Recover from the original attempt with no card data in the request.
      const retry = await submit({ ...statusBody, attribution: { utmSource: 'outra' } });
      expect(retry.statusCode).toBe(200);
      expect(retry.body).toMatchObject({ paymentId: 'pay_card', paymentStatus: 'CONFIRMED' });
      expect(ledger.get(orderPath)).toMatchObject({
        amount: 8397, status: 'paid', offerId: 'offer-1',
        attribution: { utmSource: 'teste' }, fulfillmentStatus: 'needs_review',
      });
      expect((await submit(statusBody)).body).toEqual(retry.body);
      expect(creates()).toHaveLength(1);
      expect(captures()).toHaveLength(1);
      expect(sendFaturaEmitidaEmail).toHaveBeenCalledTimes(1);
      expect(JSON.stringify([...ledger.values()])).not.toMatch(/SIMULATED_CARD|TEST_ONLY/);
    });

    it('recupera a confirmação do provedor quando a resposta do cartão não chega', async () => {
      paidResponseLost = true;
      expect((await submit()).body.code).toBe('CARD_REVIEW');
      expect((await submit(statusBody)).body.paymentId).toBe('pay_card');
      expect(creates()).toHaveLength(1);
      expect(captures()).toHaveLength(1);
    });

    it('uma resposta de criação inconclusiva não dispara outro pagamento', async () => {
      creationResponseLost = true;
      expect((await submit()).body.code).toBe('CARD_REVIEW');
      expect((await submit(statusBody)).body.code).toBe('CARD_REVIEW');
      expect(creates()).toHaveLength(1);
      expect(captures()).toHaveLength(0);
    });

    it('duas requisições simultâneas não criam duas cobranças', async () => {
      const responses = await Promise.all([submit(), submit()]);
      expect(responses.some(response => response.statusCode === 200)).toBe(true);
      expect((await submit(statusBody)).body.paymentId).toBe('pay_card');
      expect(creates()).toHaveLength(1);
      expect(captures()).toHaveLength(1);
    });

    it('verificar um identificador desconhecido não inicia uma cobrança', async () => {
      expect((await submit(statusBody)).body.code).toBe('CARD_NOT_STARTED');
      expect(mockAsaasRequest).not.toHaveBeenCalled();
    });

    it('em caso de recusa confirmada, só aceita nova submissão explícita na cobrança original', async () => {
      rejectFirstCard = true;
      expect((await submit()).body.code).toBe('CARD_REJECTED');
      expect((await submit(statusBody)).body.code).toBe('CARD_REJECTED');
      expect(captures()).toHaveLength(1);
      expect((await submit()).body.paymentId).toBe('pay_card');
      expect(creates()).toHaveLength(1);
      expect(captures()).toHaveLength(2);
    });

    it('não reaproveita o resultado se a compra ou a identidade for alterada', async () => {
      expect((await submit()).statusCode).toBe(200);
      const changed = { ...statusBody, clientData: { ...body.clientData, email: 'outro@example.test' } };
      expect((await submit(changed)).statusCode).toBe(409);
      expect(creates()).toHaveLength(1);
    });

    it('retoma uma assinatura mensal sem criar outra', async () => {
      mockDocGet.mockResolvedValue({ exists: true, data: () => validOffer });
      rejectNextOrderCommit = true;
      expect((await submit()).body.code).toBe('CARD_REVIEW');
      expect((await submit(statusBody)).body.paymentId).toBe('pay_card');
      expect(creates('/subscriptions')).toHaveLength(1);
      expect(captures()).toHaveLength(1);
    });
  });

});
