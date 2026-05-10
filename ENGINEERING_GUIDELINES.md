# 📜 DIRETRIZES DE ENGENHARIA — HUB CENTRAL

Este documento define os padrões de arquitetura, código e organização que DEVEM ser seguidos em todas as novas implementações no HubCRM. O objetivo é manter o sistema escalável, legível e livre de "God Files" (arquivos gigantes com múltiplas responsabilidades).

---

## 🏗️ 1. Arquitetura Modular (DDD)

O projeto segue uma abordagem inspirada em Domain-Driven Design (DDD).

- **`src/app/`**: Orquestração global. Contém Providers, Roteamento, Shell Visual e Layouts básicos.
- **`src/domains/`**: Lógica de negócio dividida por domínio (ex: `crm`, `finance`, `wiki`, `support`). Cada domínio deve ter suas próprias `views`, `components`, `hooks` e `services`.
- **`src/core/`**: Funcionalidades transversais essenciais (ex: `auth`, `settings`, `notifications`).
- **`src/shared/`**: Componentes de UI puramente visuais, constantes globais e utilitários genéricos.
- **`src/store/`**: Gerenciamento de estado global (Zustand) dividido em `slices`.

---

## 📏 2. Limites de Componente e Código

Para evitar complexidade cognitiva:

1. **Limite de Linhas**: Nenhum componente React deve ultrapassar **250 linhas**. Se ultrapassar, a lógica deve ser extraída para `hooks` ou subcomponentes.
2. **Responsabilidade Única (SRP)**:
   - Uma **View** apenas orquestra componentes.
   - Um **Componente** apenas renderiza UI.
   - Um **Hook** apenas gerencia lógica de estado ou efeitos.
3. **Complexidade de Render**: Evite condicionais aninhadas (`a ? b ? c : d : e`). Use componentes de controle ou retornos antecipados (*early returns*).

---

## 🛡️ 3. Resiliência e Null-Safety

A hidratação do estado via Firebase/Zustand é assíncrona.

- **Fallbacks Obrigatórios**: Sempre use fallbacks para arrays e objetos vindos da store:
  - `const clientsList = clients || [];`
  - `(data || []).map(...)`
- **Optional Chaining**: Sempre use `?.` ao acessar propriedades de objetos que podem estar em carregamento (ex: `userProfile?.orgId`).
- **Zustand Versioning**: Ao adicionar novos campos críticos à store, incremente a `version` no middleware `persist` para evitar conflitos com caches antigos no navegador do usuário.

---

## 🛣️ 4. Fluxo de Roteamento e Layout

O `App.tsx` não deve conter lógica de negócio.

- **AppProviders**: Onde todos os Contexts moram.
- **AppRouter**: Onde as rotas são definidas. Use `lazy()` e `Suspense` para rotas pesadas.
- **RouteGuards**: Lógica de proteção de rotas (Auth/Permissions) separada da UI.
- **WorkspaceShell**: Elementos visuais persistentes (Wallpaper, Efeitos, Background).
- **AppLayout**: Estrutura de navegação (Sidebar + Header).

---

## 🎨 5. Design System (Glassmorphism)

- Use o sistema de cores definido no `tailwind.config.ts`.
- Mantenha a estética **Dark Absolute**: frentes translúcidas, bordas com baixa opacidade (`border-white/10`) e `backdrop-blur`.
- Componentes de interação (Modais/Alertas) devem usar o `DialogContext` para garantir consistência visual e não-bloqueio.

---

## 📝 6. Processo de Mudança

Antes de cada implementação significativa:
1. **Verifique se o domínio já existe** em `src/domains/`.
2. **Crie um Implementation Plan** detalhando os novos arquivos.
3. **Mantenha os arquivos pequenos** desde o início.

---

## 🧬 7. Governança de Contexto e Estado

Para evitar erros de `undefined` e conflitos de renderização, os estados devem ser estritamente segmentados:

1.  **`UIContext`**: Exclusivo para estados efêmeros de interface.
    - Ex: Modais abertos, Sidebar aberta, Termos de busca visual, Modo Foco, Tema.
    - **NUNCA** coloque lógica de Firestore aqui.
2.  **`CRMContext`**: Exclusivo para dados de domínio e persistência.
    - Ex: Lista de clientes, chamados, permissões, lógica de sincronização com Firestore.
    - Serve como uma ponte estável para a `Zustand Store`.
3.  **Hooks de Permissão**: Use `usePermissions()` para qualquer lógica de controle de acesso. Evite duplicar verificações de permissão manualmente.

---

> [!IMPORTANT]
> **A regra de ouro:** Se você precisar dar scroll mais de 3 vezes para entender um componente, ele está grande demais. Quebre-o.
