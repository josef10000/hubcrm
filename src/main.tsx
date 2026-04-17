import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import './index.css';

// Inicialização da Sentinela de Erros (v3.7.0)
Sentry.init({
  dsn: "https://d80f2728be8ab2a3f779a3e53c14ae0e@o4511235661299712.ingest.de.sentry.io/4511235682140240",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Telemetria de Performance
  tracesSampleRate: 1.0,
  // Replays de Sessão para depuração visual
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Coleta de dados de diagnóstico (IP, etc)
  sendDefaultPii: true,
  environment: import.meta.env.MODE,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
