import type { VercelRequest, VercelResponse } from '@vercel/node';

// Asaas API Key from environment variable
export const ASAAS_API_URL = "https://api.asaas.com/v3";

// Custom error class to separate logged details from user-facing messages
export class AsaasApiError extends Error {
  status: number;
  userMessage: string;
  constructor(status: number, logMessage: string, userMessage?: string) {
    super(logMessage);
    this.status = status;
    this.userMessage = userMessage || 'Erro ao processar requisição no gateway de pagamentos';
    this.name = 'AsaasApiError';
  }
}

export async function asaasRequest(endpoint: string, method: string, body?: any) {
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
  if (!ASAAS_API_KEY) {
    throw new AsaasApiError(500, "ASAAS_API_KEY environment variable is not defined", "Serviço de pagamentos indisponível");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
        "User-Agent": "HubCentralCRM"
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detailedMessage = errorData.errors?.[0]?.description || response.statusText;
      console.error(`Asaas API Error [${method} ${endpoint}]:`, errorData);
      throw new AsaasApiError(response.status, detailedMessage);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Helper to safely return error responses from API handlers.
 * Uses sanitized user-facing message when available; never exposes raw internal errors.
 */
export function safeErrorResponse(res: VercelResponse, error: any, fallbackMessage = 'Erro interno do servidor') {
  console.error('API Error:', error);
  if (error instanceof AsaasApiError) {
    return res.status(error.status >= 400 && error.status < 600 ? error.status : 500).json({ error: error.userMessage });
  }
  return res.status(500).json({ error: fallbackMessage });
}

