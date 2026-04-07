import { Resend } from 'resend';

// Verifica se a chave existe (no Vercel existirá e ficará em process.env.RESEND_API_KEY)
const apiKey = process.env.RESEND_API_KEY || '';
export const resend = new Resend(apiKey);

const FROM_EMAIL = 'Hub Symples <contato@contato.hubsymples.com.br>';
const REPLY_TO_EMAIL = 'contato@hubsymples.com.br';

export async function sendBoasVindasEmail(clientEmail: string, clientName: string) {
  // TODO: Cole seu HTML gigante de Boas Vindas aqui em htmlTemplate
  let htmlTemplate = `
    <h1>Bem-vindo, {{nome_do_cliente}}</h1>
    <p>Obrigado por se juntar a nós.</p>
  `;

  // Substitui as tags usando replaceAll (para trocar todas as ocorrências)
  htmlTemplate = htmlTemplate.replaceAll('{{nome_do_cliente}}', clientName);

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: 'Bem-vindo ao Hub Symples!',
      html: htmlTemplate,
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
  // TODO: Cole seu HTML gigante de Fatura Emitida aqui em htmlTemplate
  let htmlTemplate = `
    <h1>Fatura Emitida, {{nome_do_cliente}}</h1>
    <p>Sua fatura no valor de R$ {{valor_fatura}} vence no dia {{data_vencimento}}.</p>
    <p>Descrição: {{descricao_fatura}}</p>
    <p><a href="{{link_pagamento}}">Pagar Agora</a></p>
  `;

  // Substitui as tags usando replaceAll
  htmlTemplate = htmlTemplate
    .replaceAll('{{nome_do_cliente}}', clientName)
    .replaceAll('{{valor_fatura}}', String(valor))
    .replaceAll('{{data_vencimento}}', vencimento)
    .replaceAll('{{descricao_fatura}}', descricao)
    .replaceAll('{{link_pagamento}}', linkPagamento);

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: 'Nova Fatura Emitida - Hub Symples',
      html: htmlTemplate,
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
  // TODO: Cole seu HTML gigante de Pagamento Recebido aqui em htmlTemplate
  let htmlTemplate = `
    <h1>Pagamento Confirmado, {{nome_do_cliente}}</h1>
    <p>Recebemos o pagamento da sua fatura ({{descricao_fatura}}) no valor de R$ {{valor_pago}} no dia {{data_pagamento}}.</p>
    <p>Obrigado!</p>
  `;

  // Substitui as tags usando replaceAll
  htmlTemplate = htmlTemplate
    .replaceAll('{{nome_do_cliente}}', clientName)
    .replaceAll('{{valor_pago}}', String(valor))
    .replaceAll('{{data_pagamento}}', dataPagamento)
    .replaceAll('{{descricao_fatura}}', descricao);

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: 'Pagamento Confirmado - Hub Symples',
      html: htmlTemplate,
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
  // TODO: Cole seu HTML gigante de Aviso de Vencimento aqui em htmlTemplate
  let htmlTemplate = `
    <h1>Aviso de Vencimento, {{nome_do_cliente}}</h1>
    <p>Lembramos que sua fatura ({{descricao_fatura}}) no valor de R$ {{valor_fatura}} vence dia {{data_vencimento}}.</p>
    <p><a href="{{link_pagamento}}">Pagar Agora</a></p>
  `;

  // Substitui as tags usando replaceAll
  htmlTemplate = htmlTemplate
    .replaceAll('{{nome_do_cliente}}', clientName)
    .replaceAll('{{valor_fatura}}', String(valor))
    .replaceAll('{{data_vencimento}}', vencimento)
    .replaceAll('{{descricao_fatura}}', descricao)
    .replaceAll('{{link_pagamento}}', linkPagamento);

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [clientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: 'Aviso de Vencimento - Hub Symples',
      html: htmlTemplate,
    });
    console.log('Email Fatura Vencimento enviado:', data);
    return data;
  } catch (error) {
    console.error('Erro ao enviar email Fatura Vencimento:', error);
    throw error;
  }
}
