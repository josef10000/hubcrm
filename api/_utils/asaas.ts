import type { VercelRequest, VercelResponse } from '@vercel/node';

// Asaas API Key from environment variable
export const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
export const ASAAS_API_URL = "https://api.asaas.com/v3";

export async function asaasRequest(endpoint: string, method: string, body?: any) {
  if (!ASAAS_API_KEY) {
    throw new Error("ASAAS_API_KEY environment variable is not defined");
  }

  const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY,
      "User-Agent": "HubCentralCRM"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`Asaas API Error [${method} ${endpoint}]:`, errorData);
    const errorMessage = errorData.errors?.[0]?.description || response.statusText;
    throw new Error(errorMessage);
  }

  return response.json();
}
