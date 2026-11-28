# 🔌 HubCRM API Reference (v8.4.0)

Documentação técnica dos endpoints serverless do HubCRM.

## 🔐 Autenticação
A maioria dos endpoints exige um Firebase ID Token no header.
```http
Authorization: Bearer <ID_TOKEN>
```

---

## 👥 Team & People (`/api/team_handler`)
Gerencia a estrutura da equipe e permissões.
- `GET ?action=list`: Lista membros e convites.
- `POST ?action=invite`: Envia convite por e-mail.
- `POST ?action=update-role`: Atualiza cargo de um membro.
- `POST ?action=remove`: Remove membro e seus dados.

## 💳 Financeiro & Asaas (`/api/asaas_handler`)
Integração com gateway de pagamentos.
- `GET ?action=customers`: Lista clientes no Asaas.
- `POST ?action=create-customer`: Registra cliente.
- `POST ?action=subscriptions`: Gerencia assinaturas recorrentes.
- `POST ?action=payment-links`: Gera links de checkout parcelados.

## 🛍️ Checkout Público (`/api/public_checkout`)
Endpoint aberto (com rate limit) para auto-cadastro de leads.
- Requer `orgId` e a oferta em `clientData.offerId`. Gera o cliente no Asaas e no Firestore.
- Cartão: envie um `attemptId` UUID v4 estável para a mesma compra. Após erro inconclusivo, reenvie a tentativa com os mesmos dados da compra, sem os dados do cartão, para verificar o pagamento original. Uma recusa explícita (`CARD_REJECTED`) permite corrigir os dados e reenviar para a mesma cobrança.
- Se a tentativa continuar em `CARD_REVIEW` sem confirmação, concilie no Asaas pela referência externa `hubcheckout-<attemptId>` antes de cobrar novamente. A API não cria outra cobrança quando a primeira resposta é inconclusiva. O registro de tentativa só é acessado pelo servidor e não armazena dados de cartão.

## 💰 Portal do Cliente (`/api/portal_finance`)
Endpoint seguro para exibição de faturas sem necessidade de login Firebase.
- Valida acesso via hashes de segurança (`orgId`, `clientId`, `asaasCustomerId`).

---

## 🪝 Webhooks (`/api/asaas_webhook`)
O sistema processa automaticamente eventos do Asaas:
- `PAYMENT_CREATED`: Sincroniza `invoiceUrl`.
- `PAYMENT_RECEIVED`: Atualiza `paymentStatus` e calcula `nextDueDate`.
- `PAYMENT_OVERDUE`: Marca inadimplência automática.

## ⚡ Infraestrutura & Resiliência
- **Rate Limit:** 60 req/min via Upstash Redis.
- **Validation:** Todos os inputs são validados via **Zod schemas**.
- **Logging:** Erros e atividades críticas são reportados ao **Axiom**.

## 🛡️ Site Shield (`/api/site-shield` & `/api/site-status`)
Mecanismo de bloqueio automático para sites de clientes suspensos ou inadimplentes por mais de 10 dias.
- `GET /api/site-shield`: Retorna o script JS universal de verificação. Ele normaliza o hostname em execução e faz uma consulta rápida à API do CRM.
- `GET /api/site-status?domain=<domain>`: Endpoint público (CORS-enabled) que valida as condições contábeis de um cliente.
  - Verifica o status do cliente no Firestore.
  - Se inadimplente ou vencido por mais de 10 dias, retorna `{ suspended: true, message: 'Assinatura com pendências financeiras pendentes.' }`.
  - Se cancelado, retorna `{ suspended: true, message: 'Esta assinatura foi cancelada.' }`.
  - Caso contrário, retorna `{ suspended: false }`.

---
*Hub Central © 2026 — Engenharia de Software Enterprise.*
