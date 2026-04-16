# 🔌 HubCRM API Documentation (v3.5.1)

Bem-vindo à documentação técnica dos endpoints serverless do HubCRM. Esta referência é destinada a desenvolvedores que buscam integrar, expandir ou depurar as funcionalidades da plataforma.

---

## 🔐 Autenticação

A maioria dos endpoints (exceto Checkouts Públicos e Webhooks) exige autenticação via **Firebase ID Token**.

**Header:**
```http
Authorization: Bearer <ID_TOKEN_AQUI>
```

> [!TIP]
> Em desenvolvimento, você pode obter o token atual via `auth.currentUser?.getIdToken()` no console do navegador.

---

## 💼 1. Módulo: Team & People (P&C)
Gerencia colaboradores, ativos, competências e comunicados internos.

**Base URL:** `/api/team_handler`

### Listar Equipe e Convites
Retorna todos os perfis da organização e convites pendentes.
- **Método**: `GET`
- **Action**: `list`
- **Permissão**: Administrador ou Gerente.

### Enviar Convite
- **Método**: `POST`
- **Action**: `invite`
- **Payload**:
```json
{
  "email": "talento@empresa.com",
  "role": "Onboarding Specialist",
  "collaboratorName": "João Silva"
}
```

### Atribuir Ativo (Patrimônio)
- **Método**: `POST`
- **Action**: `add-asset`
- **Payload**:
```json
{
  "targetUid": "UID_DO_MEMBRO",
  "asset": {
    "name": "MacBook Air M2",
    "status": "Em uso",
    "serialNumber": "XYZ123",
    "category": "Hardware"
  }
}
```

### Registrar Feedback (Mural)
- **Método**: `POST`
- **Action**: `add-feedback`
- **Payload**:
```json
{
  "targetUid": "UID_DO_MEMBRO",
  "feedback": {
    "type": "Performance",
    "content": "Excelente entrega no projeto X, superando as expectativas!"
  }
}
```

---

## 💳 2. Módulo: Financeiro (Asaas)
Integração direta com o gateway de pagamentos Asaas.

**Base URL:** `/api/asaas_handler`

### Listar/Criar Clientes
- **Método**: `GET` / `POST`
- **Action**: `customers` / `create-customer`
- **Payload (POST)**:
```json
{
  "name": "Nome do Cliente",
  "email": "email@cliente.com",
  "cpfCnpj": "00.000.000/0001-00",
  "mobilePhone": "11999999999"
}
```

### Gerir Assinaturas
- **Método**: `GET` / `POST` / `DELETE`
- **Action**: `subscriptions` / `update-subscription` / `delete-subscription`
- **Payload (Create)**:
```json
{
  "customer": "cus_000000",
  "value": 299.90,
  "cycle": "MONTHLY",
  "billingType": "UNDEFINED"
}
```

---

## 🛍️ 3. Módulo: Checkout Público
Portal de auto-cadastro e pagamento para novos leads.

**Base URL:** `/api/public_checkout`

- **Método**: `POST`
- **Payload**:
```json
{
  "orgId": "ID_DA_SUA_ORG",
  "clientData": {
    "name": "Lead Teste",
    "email": "lead@teste.com",
    "whatsapp": "11988887777",
    "cpfCnpj": "000.000.000-00",
    "offerId": "ID_DA_OFERTA",
    "billingCycle": "MONTHLY"
  },
  "briefingAnswers": {
    "P1": "Resposta da pergunta 1",
    "P2": "Sim"
  },
  "contract": {
    "accepted": true,
    "content": "Texto do contrato aceito...",
    "signatureName": "João Silva"
  }
}
```

---

## 🪝 4. Incoming Events (Webhooks)
O HubCRM está preparado para receber eventos do Asaas.

**Endpoint:** `/api/asaas_webhook`

**Eventos Principais:**
- `PAYMENT_RECEIVED`: Dispara automação de boas-vindas e libera acesso.
- `PAYMENT_OVERDUE`: Marca cliente como inadimplente e envia alerta de cobrança.
- `PAYMENT_CONFIRMED`: Registro de liquidação de fatura.

---

## ⚡ Rate Limiting & Segurança

- **Upstash Redis**: Proteção contra ataques de força bruta. Limite padrão de 60 requisições por minuto para Checkouts Públicos.
- **Zod Validation**: Todos os payloads de entrada passam por validação de esquema antes do processamento.
- **Atomic Operations**: Mudanças persistentes (como criação de cliente + assinatura) ocorrem em Batches ou Transações para garantir que o sistema nunca fique em estado inconsistente.

---

> [!IMPORTANT]
> A API está em constante evolução. Para sugestões de novos endpoints, contate o mantenedor do projeto via GitHub Issues.
