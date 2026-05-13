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
- Requer `orgId` e `publicToken`.
- Gera automaticamente o cliente no Asaas e Firestore.

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

---
*Hub Central © 2026 — Engenharia de Software Enterprise.*
