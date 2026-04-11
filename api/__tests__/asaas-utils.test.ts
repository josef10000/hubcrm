/**
 * ============================================================
 * TESTES UNITÁRIOS — Asaas Utils (asaasRequest & safeErrorResponse)
 * ============================================================
 * Testam: validação de API Key, construção de requisição,
 * timeout, tratamento de erros HTTP e sanitização de respostas.
 * ============================================================
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { asaasRequest, AsaasApiError, safeErrorResponse, ASAAS_API_URL } from '../_utils/asaas';

// ── Mock do fetch global ─────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Helpers ──────────────────────────────────────────────────
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
describe('Asaas Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ASAAS_API_KEY = 'test-api-key';
  });

  // ──────── asaasRequest ────────
  describe('asaasRequest', () => {
    it('deve lançar erro se ASAAS_API_KEY não estiver definida', async () => {
      delete process.env.ASAAS_API_KEY;
      await expect(asaasRequest('/customers', 'GET')).rejects.toThrow(AsaasApiError);
      await expect(asaasRequest('/customers', 'GET')).rejects.toThrow('not defined');
    });

    it('deve montar a URL correta com base no endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await asaasRequest('/customers', 'GET');

      expect(mockFetch).toHaveBeenCalledWith(
        `${ASAAS_API_URL}/customers`,
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('deve enviar os headers corretos (Content-Type, access_token, User-Agent)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await asaasRequest('/payments', 'POST', { value: 100 });

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers['Content-Type']).toBe('application/json');
      expect(callArgs.headers['access_token']).toBe('test-api-key');
      expect(callArgs.headers['User-Agent']).toBe('HubCentralCRM');
    });

    it('deve enviar body JSON para requisições POST', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'cus_1' }),
      });

      const body = { name: 'Test', email: 'test@test.com' };
      await asaasRequest('/customers', 'POST', body);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBe(JSON.stringify(body));
    });

    it('deve NÃO enviar body para requisições GET', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await asaasRequest('/customers', 'GET');

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBeUndefined();
    });

    it('deve retornar dados JSON em caso de sucesso', async () => {
      const mockData = { id: 'pay_123', value: 500 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await asaasRequest('/payments/pay_123', 'GET');
      expect(result).toEqual(mockData);
    });

    it('deve lançar AsaasApiError com detalhes em caso de resposta HTTP 4xx', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () =>
          Promise.resolve({
            errors: [{ description: 'CPF/CNPJ inválido' }],
          }),
      });

      try {
        await asaasRequest('/customers', 'POST', { cpfCnpj: 'invalid' });
        expect.unreachable('Deveria ter lançado erro');
      } catch (e: any) {
        expect(e).toBeInstanceOf(AsaasApiError);
        expect(e.status).toBe(400);
        expect(e.message).toContain('CPF/CNPJ inválido');
      }
    });

    it('deve usar statusText como fallback quando erros JSON falham', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new Error('not json')),
      });

      try {
        await asaasRequest('/payments', 'GET');
        expect.unreachable('Deveria ter lançado erro');
      } catch (e: any) {
        expect(e).toBeInstanceOf(AsaasApiError);
        expect(e.status).toBe(502);
      }
    });
  });

  // ──────── AsaasApiError ────────
  describe('AsaasApiError', () => {
    it('deve ter name, status e userMessage corretos', () => {
      const err = new AsaasApiError(422, 'Internal detail', 'Algo deu errado');
      expect(err.name).toBe('AsaasApiError');
      expect(err.status).toBe(422);
      expect(err.message).toBe('Internal detail');
      expect(err.userMessage).toBe('Algo deu errado');
    });

    it('deve usar mensagem padrão quando userMessage não for fornecida', () => {
      const err = new AsaasApiError(500, 'server error');
      expect(err.userMessage).toContain('gateway de pagamentos');
    });
  });

  // ──────── safeErrorResponse ────────
  describe('safeErrorResponse', () => {
    it('deve retornar userMessage para erros do tipo AsaasApiError', () => {
      const res = createRes();
      const err = new AsaasApiError(400, 'raw detail', 'Campo obrigatório');
      safeErrorResponse(res, err);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Campo obrigatório');
    });

    it('deve retornar mensagem genérica para erros desconhecidos', () => {
      const res = createRes();
      safeErrorResponse(res, new Error('Unknown crash'), 'Erro inesperado');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Erro inesperado');
    });

    it('deve clampear status fora do range 400-599 para 500', () => {
      const res = createRes();
      const err = new AsaasApiError(200, 'weird', 'Estranho');
      safeErrorResponse(res, err);

      expect(res.statusCode).toBe(500);
    });
  });
});
