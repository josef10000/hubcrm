# 🏗️ Hub Central: System & API Architecture

Este documento serve como referência oficial para a arquitetura de integrações, modelos de banco de dados e APIs do ecossistema **Hub Central**. Se o sistema apresentar instabilidades em pagamentos, sincronização de webhooks ou falhas de cron jobs, este é o guia definitivo de _troubleshooting_.

---

## 1. Visão Geral da Infraestrutura

O Hub Central utiliza uma arquitetura **Serverless Event-Driven**:

1. **Frontend / Cliente**: Construído em React (Vite) hospedado na Vercel. O estado é gerenciado globalmente pelo Zustand, com sincronização pessimista/otimista usando listeners nativos do Firebase SDK.
2. **Backend (APIs Internas)**: Implementadas usando Vercel Serverless Functions (`/api/*`). Estas funções não mantêm estado e escalam automaticamente sob demanda.
3. **Database**: Firebase Firestore (NoSQL Realtime DB).
4. **Integrações Externas**: Asaas (Gateway de Pagamentos) e Resend (Disparo de E-mails).

A regra de ouro arquitetural é: **O Firebase é a Fonte Única de Verdade (Single Source of Truth).** Qualquer mudança no Asaas ou no Hub precisa ser refletida primeiro no Firestore para que a UI reaja aos listeners em tempo real.

---

## 2. Modelos de Dados Principais (Firestore)

A modelagem NoSQL do sistema favorece leituras rápidas, desnormalizando dados quando necessário.

*   `organizations/{orgId}`: O sistema é Multi-Tenant. Todos os dados críticos ficam em subcoleções da organização raiz, isolando as informações via Firestore Security Rules.
*   `organizations/{orgId}/users`: Tabela de usuários. Contém perfil, controle de permissões (RBAC) e estado global dentro da organização.
*   `organizations/{orgId}/clients`: O core comercial do Hub. Armazena os dados cadastrais, plano (`plan`), valor do plano (`planPrice`), ciclo de cobrança (`billingCycle`), e identificadores do Asaas (`asaasCustomerId`, `asaasSubscriptionId`).
*   `organizations/{orgId}/transactions`: Tabela de transações atômicas (Receitas e Despesas). Possui a chave de agrupamento `TransactionGroup` que alimenta automaticamente o DRE dinâmico.
*   `organizations/{orgId}/cashflow_projections`: Tabela consolidada (Snapshot) preenchida mensalmente pelo Cron Job financeiro, agregando dados das transações e dos planos para gerar o dashboard de BI.
*   `organizations/{orgId}/webhook_events`: Tabela de auditoria pura. Todo payload recebido do Asaas é salvo aqui por segurança antes de ser processado pela engine.

---

## 3. Endpoints da API Interna (Serverless)

Os endpoints ficam no diretório raiz `api/` (padrão Vercel Edge/Serverless) e usam a subpasta `api/_logic/` para a separação dos handlers pesados.

### 💰 Integração Asaas
-   **`/api/asaas_handler.ts`**: Roteador master. É o ponto de entrada para todas as chamadas síncronas que o Front-End faz para gerenciar o Asaas (criar cliente, gerar cobrança avulsa, fazer downgrade de assinatura). Ele importa scripts isolados de `_logic/asaas/*.ts`.
-   **`/api/asaas_webhook.ts`**: **O Endpoint Mais Crítico do Sistema.** Recebe notificações assíncronas do Asaas quando uma fatura é paga, atrasada ou uma assinatura é cancelada.
    -   *Como funciona*: Quando recebe um `PAYMENT_RECEIVED`, ele busca o cliente correspondente no Firestore usando o ID da assinatura ou do cliente. Cria uma transação (`INCOME`) na collection `transactions` para alimentar o DRE. Também atualiza o status do cliente (ex: de 'Inadimplente' para 'Ativo') e despacha e-mails automáticos via Resend.

### ⚙️ Tarefas Agendadas (CRON Jobs)
A Vercel executa estes endpoints através de gatilhos agendados (no arquivo `vercel.json` ou ativados via cron-job.org externo).

-   **`/api/cron/finance-engine.ts`**: O "Cérebro" do BI. Executado periodicamente. Ele varre as transações financeiras, calcula as receitas recorrentes (MRR) de clientes ativos, aplica as categorizações DRE e salva o resultado final consolidado na collection `cashflow_projections` para que o Dashboard Financeiro carregue instantaneamente sem processamento no browser.
-   **`/api/daily_cron.ts`**: Cuida de tarefas operacionais diárias: envio de lembretes de renovação, verificação de clientes inadimplentes e alertas gerenciais para a diretoria.

*Nota de Segurança*: Todos os crons requerem que a query param `?secret=SEU_SECRET` (configurada na variável de ambiente) seja igual ao token para evitar invocações públicas.

### 🤝 Automação Comercial e Operacional
-   **`/api/proposal_approve.ts`**: Responsável pela esteira One-Click de Propostas. Quando o Lead clica em "Aceitar Proposta", esta API:
    1. Cria o cliente no Asaas.
    2. Transforma o `Lead` em `Client` no Firestore.
    3. Gera o Link de Pagamento da Assinatura no Asaas.
    4. Atualiza o Kanban comercial.
-   **`/api/public_checkout.ts`**: Proxy seguro para geração de checkouts transparentes do Asaas sem expor a API Key do gateway no Frontend.

---

## 4. Guia de Troubleshooting & Debugging

Se o sistema quebrar, siga este fluxograma para identificar o problema:

### Cenário 1: Pagamentos não refletem no HubCRM (Cliente continua 'Pendente' ou 'Inadimplente')
**Causa mais provável**: O Asaas Webhook parou de se comunicar com o `/api/asaas_webhook.ts`.
1.  Vá no Painel do Asaas > Integrações > Webhooks e veja se a fila está com erro (HTTP 500).
2.  Abra o painel de Logs da Vercel (`hubcrm > Logs`) e filtre pela rota `asaas_webhook`.
3.  Verifique se o payload enviado contém os campos esperados e se a API Key do Asaas (`ASAAS_API_KEY`) e do Firebase Admin (`FIREBASE_SERVICE_ACCOUNT`) estão corretas nas Environment Variables da Vercel.
4.  Consulte o Firestore: Em `webhook_events`, veja se o evento chegou cru. Se chegou, a falha está no processamento interno do `webhook.ts`.

### Cenário 2: O DRE Gerencial está em branco ou desatualizado
**Causa mais provável**: O `finance-engine` CRON Job não rodou.
1.  Vá ao portal do `cron-job.org` (ou painel da Vercel Cron) e veja o histórico de execução de `/api/cron/finance-engine?secret=XXX`.
2.  Se deu erro de *Unauthorized* (401), verifique se a variável `FINANCE_CRON_SECRET` da Vercel bate com a URL do Cron.
3.  Se rodou com *Success* (200), verifique no Firebase Firestore se a coleção `cashflow_projections` recebeu o documento do mês vigente.

### Cenário 3: Usuários não conseguem salvar novas propostas ou clientes
**Causa mais provável**: Regras de Segurança do Firestore (Firestore Security Rules).
1.  Vá no console do Firebase > Firestore > Rules.
2.  Confirme se a função `hasRole()` ou o controle de `orgId` não foi bloqueado por ausência de permissões do usuário logado.

### Cenário 4: Erro 500 ao tentar gerar uma cobrança no Frontend
**Causa mais provável**: Token do Asaas inválido, SandBox/Production trocado ou CPF/CNPJ com formato inválido.
1. O Asaas rejeita estritamente CPFs falsos (mesmo em Sandbox dependendo da validação) e retorna HTTP 400.
2. O Vercel Log mostrará a resposta bruta da API do Asaas. Corrija o input no front-end.

---

## 5. Variáveis de Ambiente Críticas (Environment Variables)

Para o ambiente rodar (dev ou prod), é estritamente necessário ter o `.env` ou configurar as variáveis na Vercel:

| Variável | Descrição / Serviço |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY`, etc. | Credenciais públicas do Firebase para o frontend |
| `FIREBASE_SERVICE_ACCOUNT` | Credencial JSON do Firebase Admin (Backend API) para by-pass nas Security Rules e gravação de logs |
| `ASAAS_API_KEY` | Token de Integração do Gateway de Pagamento |
| `ASAAS_WEBHOOK_TOKEN` | Token para validar se a requisição do Webhook veio do Asaas mesmo |
| `RESEND_API_KEY` | Serviço de E-mail Transacional |
| `FINANCE_CRON_SECRET` | Senha interna para impedir ataques DDoS/Custo no endpoint financeiro |
| `CRON_SECRET` | Senha interna para as rotinas gerais do CRM |

---
*Este documento é gerido pela Engenharia e mantido ativamente. Em caso de mudanças em schemas NoSQL, atualize-o antes de enviar o Pull Request.*
