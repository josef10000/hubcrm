type Handler<T = any> = (data: T) => void;

class EventBus {
  private handlers: Map<string, Set<Handler>> = new Map();

  /**
   * Se inscreve em um evento.
   * Retorna uma função para cancelar a inscrição.
   */
  on<T = any>(event: string, handler: Handler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => {
      const eventHandlers = this.handlers.get(event);
      if (eventHandlers) {
        eventHandlers.delete(handler);
      }
    };
  }

  /**
   * Emite um evento com dados opcionais.
   */
  emit<T = any>(event: string, data?: T): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[EventBus] Error in handler for event "${event}":`, error);
        }
      });
    }
  }

  /**
   * Remove todos os handlers de um evento ou de todos os eventos.
   */
  clear(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

// Exporta uma instância única (Singleton) para toda a aplicação
export const eventBus = new EventBus();

// Definição de nomes de eventos constantes para evitar typos
export const HUB_EVENTS = {
  CRM: {
    CLIENT_CREATED: 'crm:client_created',
    CLIENT_UPDATED: 'crm:client_updated',
    LEAD_CREATED: 'crm:lead_created',
    LEAD_CONVERTED: 'crm:lead_converted',
  },
  FINANCE: {
    INVOICE_PAID: 'finance:invoice_paid',
    EXPENSE_CREATED: 'finance:expense_created',
  },
  SYSTEM: {
    AUTH_STATE_CHANGED: 'system:auth_state_changed',
    NOTIFICATION_RECEIVED: 'system:notification_received',
  }
} as const;
