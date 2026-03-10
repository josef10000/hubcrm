import type { VercelRequest, VercelResponse } from '@vercel/node';

// Asaas API Key from environment variable or fallback to the provided one for testing
export const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmE1ODk0OGI1LWU5NDMtNGU0NS1iNTA4LWU2ZDgzMjI3ODA4ZTo6JGFhY2hfNWZkNzE0MzYtMzU1ZC00ZjI4LTg1NDEtY2M0Mzc5YWE5NTJk";
export const ASAAS_API_URL = "https://api.asaas.com/v3";

export async function asaasRequest(endpoint: string, method: string, body?: any) {
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
