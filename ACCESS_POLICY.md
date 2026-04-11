# 🛡️ Matriz de Acessos e Permissões - HubCRM

Este documento detalha o que cada cargo pode visualizar e quais ações pode realizar dentro da plataforma Hub Central.

---

## 🔝 1. Administrador (Proprietário)
*O nível mais alto de privilégio, projetado para o proprietário ou diretores.*

| Área | Acesso | Descrição |
| :--- | :---: | :--- |
| **Dashboard** | ✅ Sim | Visão geral de todas as métricas da empresa. |
| **Funil de Vendas** | ✅ Sim | Visualiza **todos** os leads e clientes da organização. |
| **Equipe** | ✅ Sim | Gerencia membros (convites, remoção e alteração de cargos). |
| **Analytics** | ✅ Sim | Acesso total a gráficos de performance e conversão. |
| **Gestão de Custos** | ✅ Sim | Controle total de saídas, entradas e orçamentos. |
| **Configurações** | ✅ Sim | Gerencia regras, onboarding, contratos e **aparência**. |
| **Outros** | ✅ Sim | Notificações, Chamados, Agenda, Produtos, Monitoramento e Mapa. |

---

## 🏅 2. Gerente
*Autonomia total para operar o sistema e gerenciar a equipe.*

| Área | Acesso | Descrição |
| :--- | :---: | :--- |
| **Dashboard** | ✅ Sim | Visão geral das métricas da empresa. |
| **Funil de Vendas** | ✅ Sim | Visualiza **todos** os leads e clientes da organização. |
| **Equipe** | ✅ Sim | Pode gerenciar a equipe. |
| **Analytics** | ✅ Sim | Acesso a dados de inteligência comercial. |
| **Gestão de Custos** | ✅ Sim | Pode gerenciar o financeiro. |
| **Configurações** | ✅ Sim | Gerencia regras, onboarding, equipe e **aparência**. |
| **Outros** | ✅ Sim | Todos os módulos operais (Chamados, Agenda, Mapa, etc). |

---

## 💼 3. Vendedor
*Focado na prospecção e fechamento, com visão restrita para privacidade.*

| Área | Acesso | Descrição |
| :--- | :---: | :--- |
| **Funil de Vendas** | ✅ Sim | **RESTRIÇÃO**: Visualiza apenas os leads e clientes **atribuídos a ele**. |
| **Produtos** | ✅ Sim | Consulta valores e disponibilidade para vendas. |
| **Chamados** | ✅ Sim | Registra e resolve tickets de suporte. |
| **Dashboard** | ✅ Sim | Visão simplificada. |
| **Notificações** | ✅ Sim | Recebe alertas de mudanças em seus leads. |
| **Mapa** | ✅ Sim | Visualiza a localização geográfica das operações. |
| **Configurações** | ✅ Sim | **RESTRIÇÃO**: Apenas **Trocar Cores** e **Sair**. |
| **Equipe** | ❌ Não | Não visualiza nem edita outros membros. |
| **Analytics** | ❌ Não | Não visualiza métricas globais da empresa. |

---

## 🎧 4. Atendimento
*Focado na operação e acompanhamento logístico/vizinhança.*

| Área | Acesso | Descrição |
| :--- | :---: | :--- |
| **Agenda Central** | ✅ Sim | Gerencia os compromissos e agendamentos globais. |
| **Chamados** | ✅ Sim | Foco principal na resolução de demandas de clientes. |
| **Monitoramento** | ✅ Sim | Visualiza o status de operações em tempo real. |
| **Mapa** | ✅ Sim | Localização geográfica de clientes e operações. |
| **Produtos** | ✅ Sim | Consulta de catálogo. |
| **Configurações** | ✅ Sim | **RESTRIÇÃO**: Apenas **Trocar Cores** e **Sair**. |
| **Funil de Vendas** | ❌ Não | **SEM ACESSO** às abas de leads ou prospecção ativa. |
| **Configurações** | ❌ Não | Não altera regras do sistema. |

---

### 💡 Resumo Técnico de Visibilidade
> **Privacidade de Dados**: O sistema está configurado para que usuários com o cargo **Vendedor** nunca vejam as vendas ou leads de outros colegas. Administradores e Gerentes mantêm a "Visão de Deus", enxergando toda a operação.
