# Plano de Otimização e Performance do HubCRM ⚡

Este plano descreve as melhorias arquiteturais e técnicas para tornar o HubCRM muito mais rápido, leve e ágil. Nossos analistas examinaram o frontend, o backend e o banco de dados (Firestore) e encontraram oportunidades críticas de melhoria de performance e redução de custos.

---

## User Review Required

> [!IMPORTANT]
> **Aprovação Necessária:**
> Este plano aborda otimizações críticas tanto no Frontend (redução do tamanho do bundle, tempo de carregamento de páginas) quanto no Backend (eliminação de gargalos N+1 em loops, criação de índices no Firestore). 
> **Pedimos a sua aprovação** para iniciar a execução destas melhorias, priorizando os itens de **Prioridade Crítica (P0)** e **Prioridade Alta (P1)**.
>
> Não faremos nenhuma alteração ou código até você aprovar explicitamente!

---

## 1. Otimização de Frontend e Bundle 🎒

### Problemas Encontrados:
- **Dependências Incorretas:** O `package.json` inclui dependências de servidor (como `firebase-admin`, `better-sqlite3`, `express`, `resend`, `dotenv`) listadas na seção principal de dependências, fazendo com que o Webpack/Vite tente compilar e incluir parte delas no bundle do navegador, inflando-o massivamente.
- **SDKs Mortos:** Dependências como `@aws-sdk/client-s3` e `@google/genai` estão instaladas mas não são usadas em nenhum import no diretório `src/`.
- **Duplicidade de Animação:** Uso duplicado de `@motion/react` e `framer-motion` em diferentes imports, gerando redundância no bundle.
- **Falta de Lazy-Loading em Rotas Não-Iniciais:** Mais de 10 views pesadas (como `ChatView`, `SupportView`, `CalendarView`, `ClientMapView`, `MonitoringView`) e páginas públicas são importadas diretamente de forma estática (eagerly), o que atrasa a primeira renderização do sistema.
- **Falta de isolamento de Chunks Pesados:** Bibliotecas grandes (`three`, `tldraw`, `recharts`) não estão isoladas em chunks manuais específicos no `vite.config.ts`, prejudicando o cache.

### Ações Propostas:
1. **Limpeza do `package.json`:** Mover dependências de backend para a seção correta e remover SDKs não utilizados.
2. **Unificação dos imports de Motion:** Padronizar todos os componentes para usar apenas uma biblioteca.
3. **Conversão de Rotas em Lazy-Loading:** Modificar `src/app/router/AppRouter.tsx` para carregar as views pesadas apenas quando acessadas.
4. **Isolamento de Chunks Manuais:** Configurar `vite.config.ts` para separar `tldraw` e `three` do bundle principal.

---

## 2. Otimização de Backend, Queries e Crons ⚙️

### Problemas Encontrados:
- **Ausência de Índices Compostos:** O arquivo `firestore.indexes.json` está com zero índices definidos. Queries do Firestore que utilizam filtros complexos ou order by estão sem o suporte de índices dedicados, podendo gerar erros em produção ou lentidão crônica.
- **Full Collection Scan no Cron (`process_scheduler.ts:105`):** O agendador faz um `collectionGroup('clients').get()` geral buscando TODOS os clientes do banco e depois filtra em memória os monitorados. Isso consome muitos recursos do Firestore e memória do servidor.
- **Loops Sequenciais N+1 em Crons:** Em `daily_cron.ts` e `finance_engine.ts`, as organizações são iteradas em um loop síncrono `for...of` com requisições HTTP e queries executadas uma após a outra sequentially.
- **Leituras Redundantes nas Regras de Segurança (`firestore.rules`):** A regra `hasPermission` executa queries Firestore em cascata (até 3 `get()` por verificação de permissão).
- **Queries em Cascata (Waterfalls):** Rotas como `portal_finance.ts` e `public_checkout.ts` executam queries no Firestore e requests HTTP em sequência síncrona uma por uma, ao invés de paralelizar as chamadas independentes.

### Ações Propostas:
1. **Indexação Correta:** Mapear e adicionar todos os índices necessários em `firestore.indexes.json`.
2. **Correção de Queries Firestore:** Substituir o scan de clientes pelo filtro nativo `.where('isMonitored', '==', true)` diretamente no banco.
3. **Paralelização de Loops:** Mover loops sequenciais dos crons para `Promise.allSettled()` executando o processamento em lotes paralelos.
4. **Resolução de Waterfalls com `Promise.all`:** Paralelizar requisições independentes nas APIs.

---

## 3. Estado, Hooks e Lógica Reativa 🧠

### Problemas Encontrados:
- **Cascata de Re-render no `UIContext`:** O provider de UI possui mais de 17 estados interdependentes compartilhados em um único contexto. Qualquer mudança em qualquer estado re-renderiza toda a árvore do app.
- **Consumo Indevido de Zustand no `CRMContext`:** O CRMContext faz o consumo de `useCRMStore()` de forma completa sem seletores específicos, fazendo com que todo consumer do context re-renderize para qualquer alteração no store.

### Ações Propostas:
1. **Otimização do CRMContext:** Utilizar seletores granulares do Zustand para evitar re-renders generalizados.
2. **Simplificação de re-renders de UI:** Desmembrar ou otimizar o UIContext usando Zustand para estados altamente voláteis.

---

## Cronograma de Execução Proposto 📅

### Fase 1: Correções Críticas (P0 - Backend & Banco)
- [ ] Configuração do `firestore.indexes.json`
- [ ] Correção do query no `process_scheduler.ts` (retirar processamento em memória)
- [ ] Paralelizar chamadas independentes em endpoints de API (`portal_finance.ts` e `public_checkout.ts`)

### Fase 2: Otimização de Performance de Carga (P1 - Bundle & Rotas)
- [ ] Limpeza do `package.json` (mover dependências de backend e remover SDKs sem uso)
- [ ] Habilitar Lazy-Loading para views pesadas no `AppRouter.tsx`
- [ ] Configurar Chunks dedicados para `tldraw` e `three` no `vite.config.ts`

### Fase 3: Eficiência e Re-renders (P2 - Hooks & Contexts)
- [ ] Otimização de seletores Zustand no `CRMContext`

---

## Plano de Verificação ✅

### Testes de Build e Performance:
- Executar `npm run build` para garantir que o tamanho total do bundle principal seja drasticamente reduzido (meta de redução de ~40%).
- Medir tempos de carregamento de crons e endpoints modificados.
