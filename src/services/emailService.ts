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
  BOAS_VINDAS: 're_placeholder_welcome', 
  FATURA_EMITIDA: 're_placeholder_invoice_issued',
  PAGAMENTO_RECEBIDO: 're_placeholder_payment_received',
  AVISO_VENCIMENTO: 're_placeholder_due_warning'
};

export async function sendBoasVindasEmail(clientEmail: string, clientName: string) {
  try {
    // Se o template ID for o placeholder, avisa no log
    if (TEMPLATE_IDS.BOAS_VINDAS.includes('placeholder')) {
      console.warn('AVISO: Template ID de Boas-Vindas não configurado. O e-mail não será enviado corretamente.');
    }

    // @ts-ignore - A propriedade 'template' pode não estar no tipo se o SDK estiver desatualizado localmente, mas a API aceita.
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: 'Bem-vindo ao Hub Symples!',
      template: {
        id: TEMPLATE_IDS.BOAS_VINDAS,
        variables: {
          nome_do_cliente: clientName,
        },
      },
    });
    console.log('Email Boas Vindas enviado:', data);
    return data;
  } catch (error) {
    console.error('Erro ao enviar email Boas Vindas:', error);
    throw error;
  }
}

export async function sendFaturaEmitidaEmail(
  clientEmail: string, 
  clientName: string, 
  valor: string | number, 
  vencimento: string, 
  linkPagamento: string, 
  descricao: string
) {
  try {
    if (TEMPLATE_IDS.FATURA_EMITIDA.includes('placeholder')) {
      console.warn('AVISO: Template ID de Fatura Emitida não configurado.');
    }

    // @ts-ignore
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: 'Nova Fatura Emitida - Hub Symples',
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
    console.log('Email Fatura Emitida enviado:', data);
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
  descricao: string
) {
  try {
    if (TEMPLATE_IDS.PAGAMENTO_RECEBIDO.includes('placeholder')) {
      console.warn('AVISO: Template ID de Pagamento Recebido não configurado.');
    }

    // @ts-ignore
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: 'Pagamento Confirmado - Hub Symples',
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
    console.log('Email Pagamento Confirmado enviado:', data);
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
  descricao: string
) {
  try {
    if (TEMPLATE_IDS.AVISO_VENCIMENTO.includes('placeholder')) {
      console.warn('AVISO: Template ID de Aviso de Vencimento não configurado.');
    }

    // @ts-ignore
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: 'Aviso de Vencimento - Hub Symples',
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
    console.log('Email Fatura Vencimento enviado:', data);
    return data;
  } catch (error) {
    console.error('Erro ao enviar email Fatura Vencimento:', error);
    throw error;
  }
}

