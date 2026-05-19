# Plano de Migração Arquitetural: Zustand ➡️ TanStack Query (React Query)

Este documento detalha o plano de ação para a separação definitiva de **Server State** (dados do Firebase) e **Client State** (UI) na arquitetura do HubCRM, atendendo à mais moderna convenção do ecossistema React.

## User Review Required

> [!WARNING]
> **Risco Arquitetural Alto:** Esta é uma refatoração massiva que tocará no "coração" da aplicação. O Zustand atualmente guarda e reativa tudo (Clientes, Chat, Nexus, Financeiro). A substituição deve ser feita com precisão cirúrgica para não quebrar a reatividade em tempo real.

## Open Questions

> [!IMPORTANT]
> 1. **Escopo da Primeira Entrega:** Gostaria de iniciar a refatoração completa pelo módulo **Financeiro (Transações e Orçamentos)** e **Clientes**, deixando o Chat e o Nexus para a Fase 2 (para minimizar o tempo de downtime no seu desenvolvimento)? Ou prefere que eu ataque todos de uma vez?
> 2. **Real-Time:** O React Query nativamente faz `fetch` (puxa dados). Para manter o real-time (`onSnapshot`), criaremos *Custom Hooks* que escutam o Firebase e atualizam o cache do React Query magicamente por baixo dos panos. Você concorda com essa abordagem?

## Proposed Changes

A refatoração será dividida em fases lógicas e incrementais.

---

### Fase 1: Fundação e Setup Inicial

#### [NEW] `package.json`
- Adicionar dependências: `@tanstack/react-query` e `@tanstack/react-query-devtools`.

#### [MODIFY] `src/App.tsx` (ou arquivo raiz de Providers)
- Envolver a aplicação com o `<QueryClientProvider>`.
- Configurar o `QueryClient` com tempos agressivos de `staleTime` (ex: 5 minutos) para evitar reads desnecessários no Firestore.

#### [NEW] `src/lib/react-query.ts`
- Criar a instância global do `queryClient` e exportá-la para acesso externo.

---

### Fase 2: A Ponte (Hooks de Integração Firebase ⚡ React Query)

Como usamos `onSnapshot`, não podemos simplesmente usar um `fetch` estático. Precisamos criar hooks que usem a magia do cache do React Query em conjunto com a reatividade do Firebase.

#### [NEW] `src/hooks/useFirestoreRealtime.ts`
- Um hook genérico que recebe uma `query` do Firestore, abre a inscrição (`onSnapshot`) e joga os dados direto no cache usando `queryClient.setQueryData(queryKey, data)`. 
- Isso nos dará 100% dos benefícios do React Query (loading unificado, dedup) + 100% da velocidade em tempo real do Firebase.

---

### Fase 3: Refatoração do Domínio (Ex: Financeiro & Clientes)

Nesta fase, removeremos os dados do servidor do Zustand e criaremos os hooks limpos.

#### [NEW] `src/hooks/queries/useFinance.ts`
- `useTransactions()`
- `useBudgets()`

#### [NEW] `src/hooks/queries/useClients.ts`
- `useClientsList()`
- `useLeads()`

#### [MODIFY] `src/store/slices/financeSlice.ts` e `crmSlice.ts`
- [DELETE] Arrays como `transactions: []`, `clients: []`.
- [DELETE] Funções `subscribeToFinance`, `createListener`.
- Manter apenas estados puros de UI (ex: `newTransaction`, `selectedClientId`).

---

### Fase 4: Atualização dos Componentes Visuais

Substituir o consumo antigo nos componentes pela nova API elegante.

#### [MODIFY] `src/domains/crm/components/ClientsGrid.tsx` (Exemplo)
- De: `const clients = useCRMStore(s => s.clients);`
- Para: `const { data: clients, isLoading } = useClients();`

---

## Verification Plan

### Automated Tests
- Nenhuma quebra de build Typescript nas interfaces removidas.

### Manual Verification
1. O painel financeiro carrega os dados corretamente (e faz o cache imediato ao trocar de tela).
2. Adicionar uma nova transação reflete imediatamente na tela (teste de reatividade real-time no React Query).
3. A lista de clientes e o CRM continuam atualizando em tempo real caso outro usuário no banco altere um status.
4. O DevTools do React Query exibe perfeitamente a árvore de cache (útil para auditoria).

> [!TIP]
> A tag `pre-react-query-migration` já foi salva com sucesso no GitHub. Se algo der errado, podemos reverter instantaneamente. Aguardo sua aprovação na(s) pergunta(s) acima para iniciar os trabalhos.
