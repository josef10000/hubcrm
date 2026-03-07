import express from "express";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Asaas API Key from environment variable or fallback to the provided one for testing
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojk1YjA2OWFjLTNiZDMtNDhiNi1hYWZlLWIwZjY0Mjk5ZDBiYjo6JGFhY2hfOTJlNzdkMTctYmFmYS00YjgwLTg5ZTctMGY0NGY5NGI3MTQx";
const ASAAS_API_URL = "https://api.asaas.com/v3";

// Helper to make Asaas requests
const asaasRequest = async (endpoint: string, method: string, body?: any) => {
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
    throw new Error(`Asaas API Error: ${response.statusText}`);
  }

  return response.json();
};

// Create Customer
app.post("/api/asaas/customers", async (req, res) => {
  try {
    const { name, cpfCnpj, email, phone } = req.body;
    const data = await asaasRequest("/customers", "POST", {
      name,
      cpfCnpj,
      email,
      phone
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Payment
app.post("/api/asaas/payments", async (req, res) => {
  try {
    const { customer, value, description, dueDate } = req.body;
    const data = await asaasRequest("/payments", "POST", {
      customer,
      billingType: "PIX",
      value,
      dueDate,
      description
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook to receive payment updates from Asaas
app.post("/api/asaas/webhook", async (req, res) => {
  try {
    const { event, payment } = req.body;
    console.log("Asaas Webhook Received:", event, payment?.id);
    
    // In a real scenario, you would update Firebase here using firebase-admin.
    // Since we are using client-side Firebase in this project, we might need to 
    // handle the update differently or set up firebase-admin.
    // For now, we just acknowledge the webhook.
    
    res.status(200).send("OK");
  } catch (error: any) {
    console.error("Webhook Error:", error);
    res.status(500).send("Error");
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
