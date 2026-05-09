type LogLevel = 'info' | 'warn' | 'error' | 'success';

interface LogOptions {
  domain?: string;
  context?: string;
  data?: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, options?: LogOptions) {
    const timestamp = new Date().toISOString();
    const domainPrefix = options?.domain ? `[${options.domain.toUpperCase()}]` : '[SYSTEM]';
    const contextPrefix = options?.context ? `(${options.context})` : '';
    return `${timestamp} ${level.toUpperCase()} ${domainPrefix}${contextPrefix}: ${message}`;
  }

  info(message: string, options?: LogOptions) {
    console.log(this.formatMessage('info', message, options), options?.data || '');
  }

  warn(message: string, options?: LogOptions) {
    console.warn(this.formatMessage('warn', message, options), options?.data || '');
  }

  error(message: string, options?: LogOptions) {
    console.error(this.formatMessage('error', message, options), options?.data || '');
    // Aqui poderíamos integrar com Sentry ou similar no futuro
  }

  success(message: string, options?: LogOptions) {
    console.log(`%c${this.formatMessage('success', message, options)}`, 'color: #10b981', options?.data || '');
  }
}

export const logger = new Logger();
