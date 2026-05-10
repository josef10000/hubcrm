# 🏗️ EVOLUÇÃO ARQUITETURAL — HUB CRM v8.1

Este documento serve como a "Fonte da Verdade" para o processo de modernização do HubCRM. Deve ser consultado e atualizado a cada nova etapa de implementação para garantir que os limites (boundaries) sistêmicos sejam respeitados.

---

## 🗺️ Mapa de Camadas (Nível Enterprise)

| Camada | Responsabilidade | Localização |
| :--- | :--- | :--- |
| **UI Layer** | Componentes puros, animações e layout. | `src/shared/components`, `src/domains/*/components` |
| **Feature Layer** | Lógica de interface específica de uma funcionalidade. | `src/domains/*/views` |
| **Domain Layer** | Regras de negócio, Entidades (Zod) e Mappers. | `src/domains/*/entities` |
| **Infra Layer** | Event Bus, Logger, API Services, Firebase Auth. | `src/core/*`, `src/services/*` |
| **State Layer** | Gerenciamento de estado global e persistência. | `src/store/slices/*` |

---

## 🛠️ Padrões Obrigatórios

### 1. Entidades (Entities)
Toda entidade de negócio (Client, Lead, Transaction) deve possuir:
- Um **Schema Zod** para validação.
- Uma **Interface TypeScript** extraída do schema.
- Um **Mapper** para converter dados brutos do Firestore em objetos de domínio seguros.

### 2. Eventos (Decoupling)
Módulos não devem chamar funções de outros domínios diretamente se houver efeito colateral.
- **Correto**: `eventBus.emit('finance.invoice_paid', data)`
- **Incorreto**: `chatStore.sendSystemMessage('Pagamento recebido')` dentro do módulo de Financeiro.

### 3. Governança de Contexto
- `UIContext`: Apenas estados visuais (modais, sidebars).
- `CRMContext`: Apenas dados e bridge para a Store.

---

## 📋 Checkpoint de Progresso (Evolução v8.1)

- [ ] **Fase 1**: Refatoração do Domínio CRM (Entidades + Zod).
- [ ] **Fase 2**: Implementação do Event Bus Central.
- [ ] **Fase 3**: Desacoplamento de Logs e Notificações via Eventos.
- [ ] **Fase 4**: Formalização do UI System (Design Tokens).

---
> [!IMPORTANT]
> **Não quebre os Boundaries.** Se um componente na `Shared Layer` começar a importar coisas de um `Domain`, ele está no lugar errado.
