# Guia de Integração: Serviço de E-mail (Resend)

Este documento explica como funciona a nova integração de e-mail no HubCRM, utilizando o SDK do **Resend**.

## 1. Arquitetura Geral

A integração é composta por dois pilares principais:

1.  **`src/services/emailService.ts`**: Centraliza a lógica de envio. Contém os templates HTML e as funções que chamam a API do Resend.
2.  **`api/asaas/webhook.ts`**: Atua como o "gatilho" (trigger). Quando o Asaas envia um evento (ex: pagamento confirmado), esta API intercepta o evento e dispara a função correspondente no `emailService`.

---

## 2. Configuração de DNS e Remetente

Para garantir a melhor entregabilidade e evitar conflitos de DNS:

- **Remetente (From):** `Hub Symples <contato@contato.hubsymples.com.br>`
    - Utilizamos o subdomínio `contato.hubsymples.com.br` que foi validado no Resend.
- **Resposta (Reply-To):** `contato@hubsymples.com.br`
    - Caso o cliente responda ao e-mail automático, a mensagem irá para a sua caixa principal oficial.

---

## 3. Status das Automações

| Tipo de E-mail | Função no Código | Gatilho Automático (Webhook) | Status |
| :--- | :--- | :--- | :--- |
| **Boas-Vindas** | `sendBoasVindasEmail` | `CUSTOMER_CREATED` | **ATIVO** |
| **Confirmação de Pagamento** | `sendPagamentoRecebidoEmail` | `PAYMENT_RECEIVED` / `CONFIRMED` | **ATIVO** |
| **Fatura Emitida** | `sendFaturaEmitidaEmail` | `PAYMENT_CREATED` | **ATIVO** |
| **Aviso de Vencimento** | `sendFaturaVencimentoEmail` | `PAYMENT_DUEDATE_WARNING` | **ATIVO*** |


---

## 4. Configuração de Templates (Dashboard Resend)

O sistema está configurado para usar os **Templates do Resend**. Isso permite que você edite o visual dos e-mails diretamente no painel do Resend sem precisar mexer no código.

**Status dos Templates:**

- IDs reais vinculados no código: `boas-vindas`, `nova-fatura-disponvel`, `pagamento-recebido` e `fatura-vencimento`.

### Variáveis Utilizadas:

Seus templates no Resend devem conter estas variáveis entre chaves duplas ou triplas (conforme sua configuração no Resend) para que os dados sejam preenchidos:

- `nome_do_cliente`
- `valor_fatura` / `valor_pago`
- `data_vencimento` / `data_pagamento`
- `descricao_fatura`
- `link_pagamento`

---

---

## 5. Resposta: "Por que não recebi o e-mail de criação?"

**Correção Realizada:**
Anteriormente, o gatilho estava configurado para a criação da *assinatura*. Agora, mudei para o evento **`CUSTOMER_CREATED`**. 

**O que isso muda?**
Assim que o cliente é registrado no Asaas (geralmente o primeiro passo no CRM), o e-mail de Boas-vindas é disparado imediatamente, garantindo que o cliente receba a mensagem mesmo que ocorra algum atraso na geração da cobrança ou assinatura.

---

## Próximos Passos Sugeridos

1.  **Gatilho de Boas-Vindas:** Adicionar o disparo do e-mail no evento `SUBSCRIPTION_CREATED`.
2.  **Design dos Templates:** Substituir os textos simples atuais pelos templates HTML premium.
3.  **Logs:** Acompanhar os envios pelo painel do [Resend Dashboard](https://resend.com/emails).
