# 💳 Integração Asaas - Documentação Técnica

Esta documentação detalha como a integração com o gateway de pagamentos **Asaas** funciona no HubCRM, cobrindo a arquitetura, fluxos de dados, segurança e resolução de problemas comuns.

---

## 1. Visão Geral
O HubCRM utiliza o Asaas para gerenciar o faturamento de clientes, permitindo a criação de assinaturas recorrentes, cobranças únicas e links de pagamento parcelados (Combos). A integração é bidirecional: o CRM envia comandos de criação e o Asaas notifica o CRM sobre mudanças de status via Webhooks.

## 2. Configuração
Para a integração funcionar, as seguintes variáveis de ambiente devem estar configuradas no Vercel/Ambiente Local:
- `ASAAS_API_KEY`: A chave de API gerada no painel do Asaas (Configurações > Integrações).
- `FIREBASE_SERVICE_ACCOUNT`: Necessária para que os handlers da API possam validar dados no Firestore.

---

## 3. Arquitetura do Backend (Vercel Functions)

A estrutura está organizada para ser modular e segura:

### 3.1 Roteador Principal (`api/asaas_handler.ts`)
Todas as chamadas administrativas (feitas pelo staff no Dashboard) passam por este handler. Ele utiliza o parâmetro `action` na query string para rotear a requisição para a lógica correta.
- **Exemplo de chamada**: `POST /api/asaas?action=subscriptions`

### 3.2 Lógica de Negócio (`api/_logic/asaas/`)
Cada funcionalidade do Asaas tem seu próprio arquivo de lógica:
- `customers.ts`: Criação e busca de clientes.
- `subscriptions.ts`: Gestão de assinaturas (Recorrência).
- `payments.ts`: Cobranças avulsas/únicas.
- `payment-links.ts`: Geração de links de checkout (usado em Combos).

### 3.3 Utilitários (`api/_utils/`)
- `asaas.ts`: Contém a função `asaasRequest`, que padroniza o cabeçalho `access_token` e trata erros da API do Asaas.
- `authMiddleware.ts`: Contém o `verifyAuth`, que bloqueia acessos não autorizados exigindo um token do Firebase.

---

## 4. Segurança e Acesso ao Portal

### 4.1 Acesso Administrativo
Protegido por Firebase Auth. Apenas membros da equipe logados podem criar ou deletar faturamentos.

### 4.2 Acesso Público Seguro (`api/portal_finance.ts`)
O Portal do Cliente (acessado via Magic Link) não possui sessão do Firebase. Para que o cliente veja suas faturas sem erro **401**, criamos este endpoint dedicado.
- **Segurança**: Ele exige `orgId`, `clientId` e `asaasCustomerId`. Antes de devolver qualquer dado, o servidor consulta o Firestore para confirmar se aquele cliente realmente pertence àquela organização e se o ID do Asaas confere.

---

## 5. Fluxos Críticos e "Pulos do Gato"

### 5.1 O Problema da URL em Assinaturas
Ao criar uma assinatura (`subscriptions`), o Asaas **não retorna** a URL de pagamento no objeto da assinatura. A URL fica na "cobrança" (payment) que a assinatura gera automaticamente.
- **Solução no CRM**: No `crmSlice.ts`, após criar a assinatura, o sistema aguarda 2 segundos (delay) e faz uma busca no histórico de pagamentos do cliente para capturar o link da primeira fatura e salvá-lo no Firestore.

### 5.2 Race Conditions (Corrida de Dados)
Para evitar que o Portal do Cliente tente acessar dados de um cliente que ainda não foi salvo no banco (Erro 404), o CRM executa um **pré-salvamento** no Firestore assim que obtém o `asaasCustomerId`, antes mesmo de gerar as faturas.

### 5.3 Combos e Pagamentos Únicos
Para Combos que envolvem Setup + Plano Anual, utilizamos **Links de Pagamento** (`payment-links`). Isso permite que o cliente escolha o número de parcelas no momento do checkout, facilitando a venda de pacotes de alto valor.

---

## 6. Sincronização e Webhooks (`api/asaas_webhook.ts`)
O Asaas envia notificações (POST) para este endpoint quando:
- Um pagamento é recebido (`PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED`).
- Um pagamento vence (`PAYMENT_OVERDUE`).
O Webhook identifica o cliente pelo `asaasCustomerId` e atualiza o `paymentStatus` e o `status` (Ativo/Inadimplente) no Firestore em tempo real.

---

## 7. Troubleshooting (Resolução de Problemas)

| Erro | Causa Comum | Solução |
| :--- | :--- | :--- |
| **401 Unauthorized** | Falta de token no cabeçalho ou uso de `fetch` em vez de `authFetch`. | No Portal do Cliente, use a rota `portal_finance`. No Dashboard, use `authFetch`. |
| **405 Method Not Allowed** | Tentativa de `GET` em uma rota configurada apenas para `POST`. | Verifique o handler em `api/_logic/asaas/` e habilite o suporte ao método necessário. |
| **URL undefined** | Tentativa de pegar o link direto da assinatura. | Verifique o `crmSlice.ts` e certifique-se de que a busca pelo histórico de pagamentos está ocorrendo após a criação. |
| **404 Not Found (Portal)** | Tentativa de acesso antes do cliente ser persistido. | Verifique se o "Pre-save" no Firestore está ocorrendo antes das chamadas de API. |

---

*Documentação mantida pela equipe de Engenharia do HubCRM.*
