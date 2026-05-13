/**
 * src/lib/logger.ts
 * Utilitário centralizado para observabilidade e logs.
 * Envia logs estruturados para o console em dev, e para o Axiom em produção (se configurado).
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

class LoggerService {
  private readonly axiomToken: string | undefined;
  private readonly axiomDataset: string | undefined;
  private readonly isDev: boolean;

  constructor() {
    // Tenta pegar do Vite (import.meta.env)
    this.axiomToken = import.meta.env?.VITE_AXIOM_TOKEN;
    this.axiomDataset = import.meta.env?.VITE_AXIOM_DATASET;
    this.isDev = import.meta.env?.DEV ?? true;
  }

  private async sendToAxiom(payload: LogPayload) {
    if (!this.axiomToken || !this.axiomDataset) return; // Axiom não configurado

    try {
      await fetch(`https://api.axiom.co/v1/datasets/${this.axiomDataset}/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.axiomToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([payload]),
      });
    } catch (err) {
      // Falha silenciosa para não quebrar a aplicação caso o Axiom caia
      console.error('[LoggerService] Failed to send log to Axiom', err);
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const payload: LogPayload = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    // Console output
    if (this.isDev || level === 'error') {
      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.info;
      consoleMethod(`[${level.toUpperCase()}] ${message}`, context ? context : '');
    }

    // Remote output (Axiom) - Apenas envia em produção ou se o token estiver forçado
    if (!this.isDev || this.axiomToken) {
      this.sendToAxiom(payload);
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: unknown, context?: Record<string, any>) {
    const errorContext = {
      ...context,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    this.log('error', message, errorContext);
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }
}

export const Logger = new LoggerService();
