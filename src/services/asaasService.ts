import { authFetch } from '@/lib/authFetch';
import { toast } from 'sonner';

/**
 * 💳 Asaas Service
 * Centraliza a orquestração com a API do Asaas para evitar duplicação de lógica.
 */
export const asaasService = {
  /**
   * Cria ou busca um cliente no Asaas.
   */
  async getOrCreateCustomer(data: {
    id?: string;
    name: string;
    email: string;
    cpfCnpj?: string;
    whatsapp?: string;
    notificationsEnabled?: boolean;
  }) {
    const phoneClean = data.whatsapp ? data.whatsapp.replace(/\D/g, '') : '';
    const isMobile = phoneClean.length === 11;
    const isLandline = phoneClean.length === 10;

    const res = await authFetch('/api/asaas/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: data.id,
        name: data.name, 
        cpfCnpj: data.cpfCnpj ? data.cpfCnpj.replace(/\D/g, '') : '', 
        email: data.email, 
        mobilePhone: isMobile ? phoneClean : undefined, 
        phone: isLandline ? phoneClean : undefined,
        asaasNotificationsEnabled: data.notificationsEnabled ?? false
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar cliente no Asaas');
    }

    return await res.json();
  },

  /**
   * Cria uma assinatura recorrente.
   */
  async createSubscription(data: {
    customer: string;
    billingType: string;
    value: number;
    nextDueDate: string;
    cycle: 'MONTHLY' | 'YEARLY';
    description: string;
  }) {
    const res = await authFetch('/api/asaas/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar assinatura no Asaas');
    }

    return await res.json();
  },

  /**
   * Cria um pagamento único (cobrança avulsa).
   */
  async createPayment(data: {
    customer: string;
    billingType: string;
    value: number;
    dueDate: string;
    description: string;
  }) {
    const res = await authFetch('/api/asaas/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar pagamento no Asaas');
    }

    return await res.json();
  },

  /**
   * Cria um link de pagamento (útil para Combos ou pagamentos parcelados flexíveis).
   */
  async createPaymentLink(data: {
    name: string;
    description: string;
    value: number;
    billingType: string;
    chargeType: 'DETACHED' | 'INSTALLMENT';
    maxInstallments?: number;
    customer?: string;
    dueDateLimitDays?: number;
    endDate?: string;
  }) {
    const res = await authFetch('/api/asaas/payment-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar link de pagamento no Asaas');
    }

    return await res.json();
  },

  /**
   * Cancela uma assinatura.
   */
  async deleteSubscription(subscriptionId: string) {
    const res = await authFetch('/api/asaas/delete-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId }),
    });

    return res.ok;
  },

  /**
   * Atualiza configurações de notificação do cliente.
   */
  async updateCustomerNotifications(asaasCustomerId: string, enabled: boolean) {
    const res = await authFetch('/api/asaas/update-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        asaasCustomerId, 
        notificationDisabled: !enabled 
      }),
    });

    return res.ok;
  }
};
