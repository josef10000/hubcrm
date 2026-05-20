import { Resend } from 'resend';

// Verifica se a chave existe (no Vercel existirá e ficará em process.env.RESEND_API_KEY)
const apiKey = process.env.RESEND_API_KEY || (process.env.NODE_ENV === 'test' ? 're_test_123' : '');
export const resend = new Resend(apiKey);

const FROM_EMAIL = 'Hub Symples <contato@contato.hubsymples.com.br>';
const REPLY_TO_EMAIL = 'contato@hubsymples.com.br';

/**
 * IDS DOS TEMPLATES NO RESEND
 * TODO: Substitua os IDs abaixo pelos IDs reais obtidos no painel do Resend (Ex: tpl_V6X2...)
import { Resend } from 'resend';

// Verifica se a chave existe (no Vercel existirá e ficará em process.env.RESEND_API_KEY)
const apiKey = process.env.RESEND_API_KEY || '';
export const resend = new Resend(apiKey);

const FROM_EMAIL = 'Hub Symples <contato@contato.hubsymples.com.br>';
const REPLY_TO_EMAIL = 'contato@hubsymples.com.br';

/**
 * IDS DOS TEMPLATES NO RESEND
 * TODO: Substitua os IDs abaixo pelos IDs reais obtidos no painel do Resend (Ex: tpl_V6X2...)
 */
const TEMPLATE_IDS = {
  BOAS_VINDAS_SUBSCRIPTION: 'first-invoice-payment', 
  BOAS_VINDAS_LINK: 'invoice-payment',
  FATURA_EMITIDA: 'nova-fatura-disponvel',
  PAGAMENTO_RECEBIDO: 'pagamento-recebido',
  AVISO_VENCIMENTO: 'fatura-vencimento',
  CONVITE_EQUIPE: 'team-settings',
  BROADCAST_SIMPLE: 'internal-announcement',
  BROADCAST_ACTION: 'internal-communication',
  ANIVERSARIO: 'birthday-greeting'
};

/**
 * Envia o novo e-mail unificado de Boas-vindas + Primeira Fatura (Assinatura)
 */
export async function sendBoasVindasSubscriptionEmail(
  clientEmail: string, 
  clientName: string, 
  valor: string | number, 
  vencimento: string, 
  linkPagamento: string,
  customSubject?: string
) {
  try {
    const subject = customSubject || `Bem-vindo ao Hub Symples - Seu plano está pronto!`;

    // @ts-ignore
    const data = await (resend.emails.send as any)({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: subject,
      template: {
        id: TEMPLATE_IDS.BOAS_VINDAS_SUBSCRIPTION,
        variables: {
          nome_do_cliente: clientName,
          valor: String(valor),
          vencimento: vencimento,
          link_pagamento: linkPagamento
        },
      },
    });
    console.log(`Email Boas Vindas (Assinatura) enviado! ID: ${(data as any).id || (data as any).data?.id}`);
    return data;
  } catch (error) {
    console.error('Erro ao enviar email Boas Vindas Subscription:', error);
    throw error;
  }
}

/**
 * Envia o novo e-mail unificado de Boas-vindas + Link de Pagamento Avulso
 */
export async function sendBoasVindasLinkEmail(
  clientEmail: string, 
  clientName: string, 
  valor: string | number, 
  vencimento: string, 
  linkPagamento: string,
  customSubject?: string
) {
  try {
    const subject = customSubject || `Sua Fatura - Hub Symples`;

    // @ts-ignore
    const data = await (resend.emails.send as any)({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: subject,
      template: {
        id: TEMPLATE_IDS.BOAS_VINDAS_LINK,
        variables: {
          nome_do_cliente: clientName,
          valor: String(valor),
          vencimento: vencimento,
          link_pagamento: linkPagamento
        },
      },
    });
    console.log(`Email Boas Vindas (Link) enviado! ID: ${(data as any).id || (data as any).data?.id}`);
    return data;
  } catch (error) {
    console.error('Erro ao enviar email Boas Vindas Link:', error);
    throw error;
  }
}

export async function sendFaturaEmitidaEmail(
  clientEmail: string, 
  clientName: string, 
  valor: string | number, 
  vencimento: string, 
  linkPagamento: string, 
  descricao: string,
  customSubject?: string
) {
  try {
    if (TEMPLATE_IDS.FATURA_EMITIDA.includes('placeholder')) {
      console.warn('AVISO: Template ID de Fatura Emitida não configurado.');
    }

    const subject = customSubject || 'Nova Fatura Emitida - Hub Symples';

    // @ts-ignore
    const data = await (resend.emails.send as any)({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: subject,
      template: {
        id: TEMPLATE_IDS.FATURA_EMITIDA,
        variables: {
          nome_do_cliente: clientName,
          valor_fatura: String(valor),
          data_vencimento: vencimento,
          descricao_fatura: descricao,
          link_pagamento: linkPagamento
        },
      },
    });
    console.log(`Email Fatura Emitida enviado com sucesso! Assunto: ${subject}, ID: ${(data as any).id || (data as any).data?.id}`);
    return data;
  } catch (error) {
    console.error('Erro ao enviar email Fatura Emitida:', error);
    throw error;
  }
}

export async function sendPagamentoRecebidoEmail(
  clientEmail: string, 
  clientName: string, 
  valor: string | number, 
  dataPagamento: string, 
  descricao: string,
  customSubject?: string
) {
  try {
    if (TEMPLATE_IDS.PAGAMENTO_RECEBIDO.includes('placeholder')) {
      console.warn('AVISO: Template ID de Pagamento Recebido não configurado.');
    }

    const subject = customSubject || 'Pagamento Confirmado - Hub Symples';

    // @ts-ignore
    const data = await (resend.emails.send as any)({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: subject,
      template: {
        id: TEMPLATE_IDS.PAGAMENTO_RECEBIDO,
        variables: {
          nome_do_cliente: clientName,
          valor_pago: String(valor),
          data_pagamento: dataPagamento,
          descricao_fatura: descricao
        },
      },
    });
    console.log(`Email Pagamento Confirmado enviado com sucesso! Assunto: ${subject}, ID: ${(data as any).id || (data as any).data?.id}`);
    return data;
  } catch (error) {
    console.error('Erro ao enviar email Pagamento Recebido:', error);
    throw error;
  }
}

export async function sendFaturaVencimentoEmail(
  clientEmail: string, 
  clientName: string, 
  valor: string | number, 
  vencimento: string, 
  linkPagamento: string, 
  descricao: string,
  customSubject?: string
) {
  try {
    if (TEMPLATE_IDS.AVISO_VENCIMENTO.includes('placeholder')) {
      console.warn('AVISO: Template ID de Aviso de Vencimento não configurado.');
    }

    const subject = customSubject || 'Aviso de Vencimento - Hub Symples';

    // @ts-ignore
    const data = await (resend.emails.send as any)({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: subject,
      template: {
        id: TEMPLATE_IDS.AVISO_VENCIMENTO,
        variables: {
          nome_do_cliente: clientName,
          valor_fatura: String(valor),
          data_vencimento: vencimento,
          descricao_fatura: descricao,
          link_pagamento: linkPagamento
        },
      },
    });
    console.log(`Email Fatura Vencimento enviado com sucesso! Assunto: ${subject}, ID: ${(data as any).id || (data as any).data?.id}`);
    return data;
  } catch (error) {
    console.error('Erro ao enviar email Fatura Vencimento:', error);
    throw error;
  }
}

export async function sendTeamInviteEmail(
  email: string,
  collaboratorName: string,
  role: string,
  inviteLink: string,
  customSubject?: string
) {
  try {
    const subject = customSubject || `Você foi convidado para o Hub Central`;

    // @ts-ignore
    const data = await (resend.emails.send as any)({
      from: FROM_EMAIL,
      to: [email],
      reply_to: REPLY_TO_EMAIL,
      subject: subject,
      template: {
        id: TEMPLATE_IDS.CONVITE_EQUIPE,
        variables: {
          nome_do_colaborador: collaboratorName,
          cargo: role,
          link_acesso: inviteLink
        },
      },
    });
    console.log(`Email de Convite enviado! ID: ${(data as any).id || (data as any).data?.id}`);
    return data;
  } catch (error) {
    console.error('Erro ao enviar email de convite:', error);
    throw error;
  }
}

export async function sendTeamBroadcastEmail(
  recipients: {email: string; name: string}[],
  payload: { hasButton: boolean; buttonUrl?: string }
) {
  try {
    const templateId = payload.hasButton ? TEMPLATE_IDS.BROADCAST_ACTION : TEMPLATE_IDS.BROADCAST_SIMPLE;
    
    // We send emails in batches of up to 100 to avoid rate limits and memory issues,
    // sending them individually via Promise.all so each gets their personalized names.
    const batchSize = 100;
    const allResults = [];
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const chunk = recipients.slice(i, i + batchSize);
      
      const promises = chunk.map(recipient => {
        const variables: any = {
          nome_do_colaborador: recipient.name,
        };
        
        if (payload.hasButton) {
          variables.link_informacao = payload.buttonUrl;
        }

        // @ts-ignore
        return (resend.emails.send as any)({
          from: FROM_EMAIL,
          to: recipient.email,
          reply_to: REPLY_TO_EMAIL,
          subject: 'Comunicado Interno', // Será ignorado se o template do Resend tiver o assunto pré-configurado
          template: {
            id: templateId,
            variables: variables,
          },
        });
      });

      const chunkResults = await Promise.all(promises);
      allResults.push(...chunkResults);
    }
    
    console.log(`Emails de Broadcast disparados! Qtd: ${recipients.length}`);
    return allResults;
  } catch (error) {
    console.error('Erro ao disparar broadcast:', error);
    throw error;
  }
}

/**
 * Envia e-mail de parabéns pelo aniversário do colaborador
 */
export async function sendBirthdayGreetingEmail(
  email: string,
  name: string,
  customSubject?: string
) {
  try {
    const subject = customSubject || `Parabéns pelo seu dia, ${name}! 🎉`;

    // @ts-ignore
    const data = await (resend.emails.send as any)({
      from: FROM_EMAIL,
      to: [email],
      reply_to: REPLY_TO_EMAIL,
      subject: subject,
      template: {
        id: TEMPLATE_IDS.ANIVERSARIO,
        variables: {
          nome_do_colaborador: name
        },
      },
    });
    console.log(`Email de Aniversário enviado para ${name}! ID: ${(data as any).id || (data as any).data?.id}`);
    return data;
  } catch (error) {
    console.error('Erro ao enviar email de aniversário:', error);
    throw error;
  }
}
