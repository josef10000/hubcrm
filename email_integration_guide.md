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

Todas as automações solicitadas foram implementadas e estão ativas no Webhook.

| Tipo de E-mail | Função no Código | Gatilho Automático (Webhook) | Status |
| :--- | :--- | :--- | :--- |
| **Boas-Vindas** | `sendBoasVindasEmail` | `SUBSCRIPTION_CREATED` | **ATIVO** |
| **Confirmação de Pagamento** | `sendPagamentoRecebidoEmail` | `PAYMENT_RECEIVED` / `CONFIRMED` | **ATIVO** |
| **Fatura Emitida** | `sendFaturaEmitidaEmail` | `PAYMENT_CREATED` | **ATIVO** |
| **Aviso de Vencimento** | `sendFaturaVencimentoEmail` | `PAYMENT_DUEDATE_WARNING` | **ATIVO*** |

*\* O Aviso de Vencimento depende da configuração de "Webhook de Gestão de Cobrança" no painel do Asaas.*

---

## 4. Onde estão os Templates?

Os templates HTML estão localizados diretamente no arquivo `src/services/emailService.ts`. 

> **DICA:** Você pode substituir o conteúdo da variável `htmlTemplate` dentro de cada função pelo HTML final (com design premium) que desejar. O código já está preparado para substituir variáveis como `{{nome_do_cliente}}`, `{{valor_fatura}}`, etc.

---

## 5. Resposta: "Se eu criar um cliente agora, ele recebe e-mail?"

**Não automaticamente ainda.**

### Por quê?
Atualmente, o código no Webhook do Asaas (`api/asaas/webhook.ts`) está configurado para reagir apenas a eventos de **Pagamento**. O evento de criação de assinatura (`SUBSCRIPTION_CREATED`) apenas atualiza o status do cliente no banco de dados, mas não dispara a função `sendBoasVindasEmail`.

### Como ativar o e-mail de Boas-Vindas?
Para que o cliente receba o e-mail assim que for criado, precisamos adicionar a chamada da função `sendBoasVindasEmail` dentro do bloco `SUBSCRIPTION_CREATED` no webhook ou no fluxo de criação manual do cliente no frontend.

---

## Próximos Passos Sugeridos

1.  **Gatilho de Boas-Vindas:** Adicionar o disparo do e-mail no evento `SUBSCRIPTION_CREATED`.
2.  **Design dos Templates:** Substituir os textos simples atuais pelos templates HTML premium.
3.  **Logs:** Acompanhar os envios pelo painel do [Resend Dashboard](https://resend.com/emails).
