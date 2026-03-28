import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file explicitly
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API routes handling (simulating Vercel serverless functions)
  app.all('/api/*', async (req, res) => {
    const apiPath = req.path;
    
    // Try to find the handler file
    // 1. Exact match: /api/asaas/customers -> api/asaas/customers.ts
    // 2. Dynamic route: /api/asaas/subscriptions/123 -> api/asaas/subscriptions/[id].ts
    
    let handlerPath = path.join(process.cwd(), apiPath + '.ts');
    
    // Check for dynamic routes like [id].ts
    if (!fs.existsSync(handlerPath)) {
      const parts = apiPath.split('/');
      if (parts.length > 1) {
        const lastPart = parts.pop();
        const parentPath = parts.join('/');
        const dynamicHandlerPath = path.join(process.cwd(), parentPath, '[id].ts');
        if (fs.existsSync(dynamicHandlerPath)) {
          handlerPath = dynamicHandlerPath;
          // Add the ID to req.query as Vercel does
          req.query.id = lastPart;
        }
      }
    }

    if (fs.existsSync(handlerPath)) {
      try {
        // Use tsx to import the handler
        const module = await import(handlerPath);
        const handler = module.default;
        if (typeof handler === 'function') {
          return await handler(req, res);
        } else {
          return res.status(500).json({ error: 'Handler is not a function' });
        }
      } catch (error: any) {
        console.error(`Error in API handler ${apiPath}:`, error);
        return res.status(500).json({ error: error.message });
      }
    } else {
      return res.status(404).json({ error: `API route ${apiPath} not found` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
