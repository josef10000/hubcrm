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
vi.mock('../_utils/asaas.js', () => ({
  asaasRequest: (...args: any[]) => mockAsaasRequest(...args),
  safeErrorResponse: (res: any, error: any, msg: string) =>
    res.status(500).json({ error: msg }),
}));

// Mock do Firestore
const mockDocGet = vi.fn();
const mockDocSet = vi.fn().mockResolvedValue(true);
const mockDocUpdate = vi.fn().mockResolvedValue(true);

const mockDocRef = {
  id: 'new-client-id',
  set: mockDocSet,
  update: mockDocUpdate,
};

vi.mock('../_utils/firebase.js', () => ({
  db: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockImplementation((id?: string) => {
            if (id) {
              return { get: mockDocGet };
            }
            return mockDocRef;
          }),
        }),
      }),
    }),
  },
}));

// ── Import do handler ────────────────────────────────────────
import handler from '../public_checkout';
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
    process.env.ASAAS_API_KEY = 'test-key';
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
      mockDocGet.mockResolvedValue({ exists: false });
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
          convertedVia: 'Public Checkout',
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
});
