import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks Globais ─────────────────────────────────────────────

// Mock do authMiddleware
let mockUid: string | null = 'user-123';
vi.mock('../_utils/authMiddleware.js', () => ({
  verifyAuth: vi.fn().mockImplementation(() => Promise.resolve(mockUid)),
}));

// Mock do asaasRequest via escopo global para contornar hoisting do Vitest
vi.mock('../_utils/asaas.js', () => ({
  asaasRequest: vi.fn((...args) => (globalThis as any).mockAsaasRequest(...args)),
  safeErrorResponse: vi.fn().mockImplementation((res, err) => {
    return res.status(err.status || 500).json({ error: err.message });
  }),
}));

const mockAsaasRequest = vi.fn();
(globalThis as any).mockAsaasRequest = mockAsaasRequest;

// Mock do audit
const mockLogActivity = vi.fn();
vi.mock('../_utils/audit.js', () => ({
  logActivity: mockLogActivity,
}));

// Mock do Firebase Admin SDK / Firestore
let mockProfileData: any = {
  displayName: 'Colaborador Teste',
  orgId: 'org-test',
  salary: 5000,
  pixKey: '12345678909',
  pixKeyType: 'CPF'
};

let mockAdvancesDocs: any[] = [];

const mockFirestore = {
  collection: (colName: string) => {
    if (colName === 'profiles') {
      return {
        doc: (docId: string) => ({
          get: vi.fn().mockResolvedValue({
            exists: mockProfileData !== null,
            data: () => mockProfileData
          })
        })
      };
    }
    // Para coleções encadeadas: organizations/orgId/collection
    if (colName === 'organizations') {
      return {
        doc: (orgId: string) => ({
          collection: (subColName: string) => {
            return {
              doc: () => ({
                set: vi.fn().mockResolvedValue(true)
              }),
              where: vi.fn().mockReturnThis(),
              get: vi.fn().mockResolvedValue({
                empty: mockAdvancesDocs.length === 0,
                docs: mockAdvancesDocs.map(d => ({
                  id: 'adv-id',
                  data: () => d
                }))
              })
            };
          }
        })
      };
    }
    return {};
  }
};

vi.mock('../_utils/firebase.js', () => ({
  db: mockFirestore
}));

// ── Import do handler (depois dos mocks) ─────────────────────
import requestAdvanceHandler from '../_logic/asaas/request-advance';

// ── Helpers de Requisição / Resposta ──────────────────────────
function createReq(body: any = {}, overrides: any = {}) {
  return {
    method: 'POST',
    body,
    query: {},
    ...overrides
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
  };
  return res;
}

// ── Testes ────────────────────────────────────────────────────
describe('Solicitação de Adiantamento Salarial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUid = 'user-123';
    mockProfileData = {
      displayName: 'Colaborador Teste',
      orgId: 'org-test',
      salary: 5000,
      pixKey: '12345678909',
      pixKeyType: 'CPF'
    };
    mockAdvancesDocs = [];
  });

  it('deve rejeitar métodos que não sejam POST', async () => {
    const req = createReq({}, { method: 'GET' });
    const res = createRes();

    await requestAdvanceHandler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toContain('Method Not Allowed');
  });

  it('deve rejeitar se o valor solicitado for menor ou igual a zero', async () => {
    const req = createReq({ amount: -50 });
    const res = createRes();

    await requestAdvanceHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Valor do adiantamento inválido');
  });

  it('deve retornar 404 se o perfil do colaborador não existir', async () => {
    mockProfileData = null; // perfil inexistente
    const req = createReq({ amount: 500 });
    const res = createRes();

    await requestAdvanceHandler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toContain('não encontrado');
  });

  it('deve rejeitar se o colaborador não tiver salário base configurado no perfil', async () => {
    mockProfileData.salary = 0;
    const req = createReq({ amount: 500 });
    const res = createRes();

    await requestAdvanceHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('salário base configurado');
  });

  it('deve rejeitar se o colaborador não possuir chave Pix cadastrada', async () => {
    mockProfileData.pixKey = '';
    const req = createReq({ amount: 500 });
    const res = createRes();

    await requestAdvanceHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('configure sua chave Pix');
  });

  it('deve rejeitar se o colaborador já tiver feito um adiantamento no mês', async () => {
    mockAdvancesDocs = [{ id: 'adv-1', amount: 1000, month: '2026-06' }];
    const req = createReq({ amount: 500 });
    const res = createRes();

    await requestAdvanceHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('já solicitou um adiantamento salarial');
  });

  it('deve rejeitar se o valor do adiantamento exceder o limite de 30% do salário', async () => {
    const req = createReq({ amount: 1600 }); // 30% de 5000 = 1500
    const res = createRes();

    await requestAdvanceHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('excede o seu limite máximo');
  });

  it('deve aprovar e executar adiantamento Pix se todos os critérios forem válidos', async () => {
    mockAsaasRequest.mockResolvedValue({ id: 'transfer-asaas-123' });
    const req = createReq({ amount: 1000 });
    const res = createRes();

    await requestAdvanceHandler(req, res);

    // Deve chamar a transferência do Asaas com Pix
    expect(mockAsaasRequest).toHaveBeenCalledWith(
      '/transfers', 
      'POST', 
      expect.objectContaining({
        value: 1000,
        pixAddressKey: '12345678909',
        pixAddressKeyType: 'CPF'
      })
    );

    // Deve criar o auditor
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SALARY_ADVANCE_REQUESTED',
        details: expect.stringContaining('R$ 1000.00')
      })
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.advance.status).toBe('pending_repayment');
    expect(res.body.advance.asaasTransferId).toBe('transfer-asaas-123');
  });
});
