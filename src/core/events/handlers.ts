import { eventBus, HUB_EVENTS } from './eventBus';
import { auditService } from '@/services/auditService';
import { logger } from '@core/utils/logger';
import { toast } from 'sonner';

/**
 * Inicializa todos os ouvintes de eventos globais da aplicação.
 * Este padrão permite o desacoplamento entre módulos.
 */
export function initGlobalEventHandlers() {
  logger.info('Initializing Global Event Handlers', { domain: 'SYSTEM' });

  // --- CRM Events ---
  
  // Auditoria automática ao criar Lead
  eventBus.on(HUB_EVENTS.CRM.LEAD_CREATED, (data: any) => {
    logger.info('Lead created event received', { domain: 'CRM', context: 'EventBus', data: data.id });
    
    if (data.orgId) {
      auditService.logActivity(data.orgId, {
        userId: data.assignedTo || 'system',
        userName: data.userName || 'Sistema',
        action: 'LEAD_CREATED',
        targetId: data.id,
        targetType: 'lead',
        details: `Lead ${data.name} criado via EventBus.`
      });
    }
  });

  // Notificação visual ao converter Lead
  eventBus.on(HUB_EVENTS.CRM.LEAD_CONVERTED, (lead: any) => {
    logger.success(`Lead ${lead.name} convertido com sucesso!`, { domain: 'CRM' });
    // Aqui poderíamos disparar confetes ou outras ações de UI
  });

  // Auditoria de Clientes
  eventBus.on(HUB_EVENTS.CRM.CLIENT_CREATED, (data: any) => {
    logger.success(`Novo cliente registrado: ${data.name}`, { domain: 'CRM' });
    // Implementar auditoria se necessário
  });

  // --- Finance Events ---
  
  eventBus.on(HUB_EVENTS.FINANCE.INVOICE_PAID, (data: any) => {
    toast.success(`Pagamento recebido: R$ ${data.amount}`);
  });

  // --- System Events ---
  
  eventBus.on(HUB_EVENTS.SYSTEM.NOTIFICATION_RECEIVED, (notif: any) => {
    logger.info(`Nova notificação: ${notif.title}`, { domain: 'SYSTEM' });
  });
}
