import { eventBus, HUB_EVENTS } from './eventBus';
import { auditService } from '@/services/auditService';
import { logger } from '@core/utils/logger';
import { toast } from 'sonner';
import { leadService } from '@/services/leadService';
import { clientService } from '@/domains/crm/services/clientService';

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

  // --- Commercial Events ---

  eventBus.on('PROPOSAL_APPROVED', async (data: any) => {
    const { proposalId, leadId, totalAmount, orgId } = data;
    logger.info('Proposal approved! Starting automatic conversion check...', { domain: 'COMMERCIAL', data: proposalId });

    try {
      // 1. Verificar se o Lead existe (pode ser que já seja um cliente)
      const lead = await leadService.getLeadById(orgId, leadId);
      
      if (!lead) {
        logger.info('Lead not found. Checking if it is already a client...', { domain: 'COMMERCIAL' });
        // Se não for lead, provavelmente já é cliente e a proposta foi gerada direto para ele
        return;
      }

      // 2. Converter Lead para Cliente
      await clientService.createFromLead(orgId, lead, totalAmount);

      // 3. Mover Lead no Funil
      await leadService.moveLead(orgId, lead, 'Convertido', 'Sistema (Proposta Web)');

      toast.success('Proposta aprovada! Cliente criado com sucesso.');
      logger.success('Lead converted to client automatically via web proposal', { domain: 'COMMERCIAL' });
    } catch (error: any) {
      // Silenciar erros de permissão para o cliente final (que não tem permissão de escrita no CRM)
      if (error?.message?.includes('permission-denied') || error?.code === 'permission-denied') {
        logger.warn('Conversion skipped: Public user has no permission to write to CRM.', { domain: 'COMMERCIAL' });
        return;
      }
      
      logger.error('Error in automatic conversion process', { domain: 'COMMERCIAL', data: error });
      toast.error('Erro ao processar conversão automática.');
    }
  });
}
