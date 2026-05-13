# 🏛️ HubCRM: Arquitetura Enterprise (v8.4.0)

Este documento define os padrões técnicos e a fundação do ecossistema HubCRM.

## 🏗️ 1. Princípios de Design
O sistema é construído sobre três pilares fundamentais:
- **Modular DDD (Domain-Driven Design):** Desacoplamento total entre CRM, Financeiro, Wiki e Suporte.
- **Serverless First:** Toda a lógica pesada reside em Edge Functions na Vercel para latência mínima.
- **Realtime Sync:** Sincronização em tempo real via Firestore Listeners.

## 🧱 2. Camadas do Sistema

### 📱 Frontend (React 19)
- **State Management:** Zustand 5.0 com persistência seletiva e atomic selectors.
- **Comunicação:** Centralizada no `apiClient` (REST) e `authFetch` (Autenticado).
- **Segurança:** RBAC via hook `usePermissions` e `DialogContext` para fluxos assíncronos.

### ⚙️ Backend (Serverless Micro-services)
- **Handlers:** Endpoints modulares em `api/handlers` e `api/*.ts`.
- **Logic:** Lógica de negócio pura em `api/_logic` para facilitar testes e reuso.
- **Security Middleware:** Validação de JWT (Firebase Auth) e Rate Limiting (Upstash Redis).

### 📝 Camada de Contratos (Shared)
- **Single Source of Truth:** Localizada em `/shared`. Contém as interfaces (`types.ts`) e constantes globais.
- **Garantia de Integridade:** Mudanças no contrato quebram o build em ambas as pontas.

## 🔒 3. Protocolos de Segurança e RBAC
O sistema utiliza **Role-Based Access Control** (RBAC) centralizado.

### Cargos Padrão (System Roles)
| Cargo | Nível | Descrição |
| :--- | :--- | :--- |
| **Administrador** | 0 | Acesso total e irrestrito. |
| **Gerente** | 1 | Supervisão operacional (exceto Settings globais). |
| **Financeiro** | 3 | Gestão de faturamento e assinaturas. |
| **People & Culture** | 4 | Gestão de equipe e Wiki. |
| **SDR / Vendas** | 5 | Prospecção e gestão de leads. |

### Detalhamento das Permissões
- **VIEW_DASHBOARD / VIEW_REPORTS**: Visualização estratégica.
- **MANAGE_SETTINGS**: Configurações de Org e cargos.
- **MANAGE_LEADS / MANAGE_CLIENTS**: Gestão comercial.
- **MANAGE_FINANCE**: Operações financeiras (Asaas).
- **MANAGE_TEAM / MANAGE_WIKI**: Gestão interna e cultura.
- **MANAGE_SUPPORT**: Atendimento e tickets.

## 🔄 4. Ciclo de Vida de Dados
1. **Requisição:** Validada via **Zod** no Handler.
2. **Processamento:** Lógica em `_logic`, persistência via **Firebase Admin SDK**.
3. **Notificação:** Webhooks externos (Asaas) ou Event Bus interno notificam mudanças.
4. **Reflexão:** Frontend atualiza instantaneamente via `onSnapshot`.

## 🛠️ 5. Padrões de Engenharia (Code Control)
Para manter o sistema sob controle e evitar dívidas técnicas:
- **Comunicação Segura:** É proibido o uso de `fetch` ou `axios` puro nos componentes. Use `authFetch` (autenticado) ou `apiClient` (público).
- **Tipagem Estrita:** O uso de `any` é proibido. Utilize as interfaces centralizadas em `/shared`.
- **Validação de Contratos:** Toda entrada de API deve ter um esquema **Zod** correspondente para validação antes do processamento.
- **Desacoplamento:** Lógicas complexas não devem residir nos Handlers de API; devem ser movidas para `api/_logic`.
- **Observabilidade:** Erros críticos e mutações financeiras devem sempre ser registrados via `logActivity` e `Logger.error`.

---
*Hub Central © 2026 — Engenharia de Software Enterprise.*
