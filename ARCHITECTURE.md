# 🏛️ HubCRM: Guia de Arquitetura e Padronização

Este documento define os padrões técnicos e a folha de rosto para a evolução do HubCRM. Todas as novas implementações devem seguir estas diretrizes para garantir escalabilidade, segurança e manutenibilidade.

---

## 🏗️ 1. Estrutura de Comunicação API

### Camada de Serviços (Frontend)
- **Proibido:** Uso de `fetch()` ou `axios` diretamente nos componentes.
- **Obrigatório:** 
  - Usar `apiClient.ts` para requisições REST gerais (com retry e timeout).
  - Usar `authFetch.ts` para chamadas que exigem autenticação Firebase.
  - Usar o hook `useApiQuery` para buscas de dados (GET) que necessitem de cache e gerenciamento de estado de carregamento.

### Tipagem Compartilhada (`/shared`)
- **Pasta `/shared`:** Contém tipos (`types.ts`) e constantes (`constants.ts`) usados tanto pelo Frontend (`src/`) quanto pela API (`api/`).
- **Contratos:** Sempre tipar o retorno das APIs usando `ApiResponse<T>`, `ApiSuccessResponse<T>` ou `ApiErrorResponse`.
- **Eliminação do `any`:** O uso de `any` em handlers de API ou estados do frontend deve ser evitado em favor das interfaces base em `/shared`.

---

## 🔒 2. Segurança e Integridade

### Autenticação na API
- Todo endpoint privado deve validar o token via `verifyAuth`.
- **Rate Limiting:** Implementado via Upstash Redis no middleware. Limite padrão: 30 req/min por IP.

### Validação de Entrada
- **Próximo Passo:** Implementar Zod em todos os handlers da API para validar `req.body` e `req.query` antes de qualquer interação com o Firestore.

### Auditoria
- Ações críticas (Deleção, Alteração de Permissões, Financeiro) devem registrar um log via `logActivity` no `api/_utils/audit.ts`.

---

## 🗺️ 3. Roadmap de Melhorias (Checklist de Evolução)

### Fase 1: Padronização de Dados (EM CURSO)
- [x] Criação da pasta `shared/` e migração de tipos base.
- [x] Centralização de constantes de Roles (`ROLE_IDS`).
- [ ] Implementação de DTOs (Data Transfer Objects) para evitar envio de campos sensíveis ao front.

### Fase 2: Robustez da API
- [ ] Refatoração do `asaas_webhook.ts` em handlers modulares por tipo de evento.
- [x] Adição de validação Zod nos endpoints `team_handler` e `portal_finance`.
- [ ] Criação de suite de testes de integração para os fluxos financeiros.

### Fase 3: Segurança Avançada
- [x] Implementação de **Tokens de Acesso Públicos** (signed hashes) para o Checkout e Portal Financeiro.
- [ ] Revisão de permissões de segurança do Firestore (Security Rules) para refletir a lógica de `orgId`.

### Fase 4: Experiência do Desenvolvedor (DX)
- [ ] Migração gradual de lógicas de permissão de dentro do JSX para o hook `usePermissions`.
- [ ] Centralização de logs de erro (Observabilidade) via Axiom ou similar.

---

## 🛠️ Comandos Úteis
- `npm run lint`: Validar tipos e sintaxe.
- `npm run dev`: Iniciar ambiente de desenvolvimento.

---
*Atualizado em: 12 de Maio de 2026*
