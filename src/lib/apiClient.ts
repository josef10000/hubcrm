import { toast } from 'sonner';
import { logger } from '@core/utils/logger';

/**
 * API Client — Wrapper padronizado para chamadas REST
 * 
 * Fornece:
 * - Error handling consistente com feedback visual
 * - Timeout automático (15s)
 * - Tipagem genérica
 * - Logging centralizado
 * - Retry automático em falhas de rede (1 tentativa)
 */

interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  /** Timeout em milissegundos (padrão: 15000) */
  timeout?: number;
  /** Se true, exibe toast de erro automaticamente (padrão: true) */
  showErrorToast?: boolean;
  /** Número de retries em caso de falha de rede (padrão: 1) */
  retries?: number;
  /** Body da requisição — será convertido para JSON automaticamente */
  body?: any;
  /** Se true, não adiciona Content-Type: application/json (útil para FormData) */
  rawBody?: boolean;
}

class ApiClientError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

async function request<T = any>(
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const {
    timeout = 15000,
    showErrorToast = true,
    retries = 1,
    body,
    rawBody = false,
    ...fetchOptions
  } = options;

  // Preparar headers
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (!rawBody && body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Preparar body
  const processedBody = rawBody || body instanceof FormData
    ? body
    : body ? JSON.stringify(body) : undefined;

  // Função interna de fetch com timeout
  const doFetch = async (): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        body: processedBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Tentar parsear JSON
      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMessage = typeof data === 'object' 
          ? data.error || data.message || `Erro ${response.status}`
          : `Erro ${response.status}`;
        
        throw new ApiClientError(errorMessage, response.status, data);
      }

      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new ApiClientError('Requisição excedeu o tempo limite', 408);
      }
      
      throw error;
    }
  };

  // Executar com retry
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await doFetch();
    } catch (error: any) {
      lastError = error;
      
      // Só faz retry em erro de rede, não em erros HTTP
      const isNetworkError = !(error instanceof ApiClientError);
      if (!isNetworkError || attempt === retries) {
        break;
      }
      
      // Backoff: 500ms antes do retry
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      logger.warn(`Retry ${attempt + 1}/${retries} para ${url}`, { domain: 'API' });
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  const errorMsg = lastError?.message || 'Erro desconhecido na requisição';
  
  if (showErrorToast) {
    toast.error(errorMsg);
  }

  logger.error(`API Error: ${errorMsg}`, { 
    domain: 'API', 
    context: url,
    data: { status: lastError?.status, retries } 
  });

  throw lastError;
}

/**
 * API Client com métodos convenientes.
 * 
 * @example
 * // GET simples
 * const data = await apiClient.get<PaymentData[]>('/api/portal_finance?orgId=abc');
 * 
 * // POST com body
 * const result = await apiClient.post('/api/team_handler?action=broadcast', {
 *   uids: ['uid1', 'uid2'],
 *   hasButton: true
 * });
 * 
 * // GET externo sem toast de erro
 * const books = await apiClient.get('https://googleapis.com/books/v1/volumes?q=react', {
 *   showErrorToast: false
 * });
 */
export const apiClient = {
  get: <T = any>(url: string, options?: ApiClientOptions) =>
    request<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, body?: any, options?: ApiClientOptions) =>
    request<T>(url, { ...options, method: 'POST', body }),

  put: <T = any>(url: string, body?: any, options?: ApiClientOptions) =>
    request<T>(url, { ...options, method: 'PUT', body }),

  patch: <T = any>(url: string, body?: any, options?: ApiClientOptions) =>
    request<T>(url, { ...options, method: 'PATCH', body }),

  delete: <T = any>(url: string, options?: ApiClientOptions) =>
    request<T>(url, { ...options, method: 'DELETE' }),
};

export { ApiClientError };
