# Gestão de Cargos e Permissões - HubCRM

Este documento detalha o sistema de controle de acesso baseado em funções (RBAC) do HubCRM, explicando cada cargo padrão e o que cada permissão individual concede.

## Cargos Padrão (System Roles)

O sistema vem com cargos pré-configurados que cobrem as principais necessidades operacionais.

| Cargo | Nível | Descrição | Permissões Inclusas |
| :--- | :--- | :--- | :--- |
| **Administrador** | 0 | Acesso total e irrestrito a todas as funções do sistema. | Todas |
| **Gerente** | 1 | Supervisão operacional. Acesso a quase tudo, exceto configurações globais críticas. | Todos exceto `MANAGE_SETTINGS` |
| **SDR / Vendas** | 5 | Focado na prospecção e qualificação de leads. | `VIEW_DASHBOARD`, `MANAGE_LEADS` |
| **Suporte Técnico** | 5 | Atendimento ao cliente e manutenção da base de conhecimento. | `VIEW_DASHBOARD`, `MANAGE_SUPPORT`, `MANAGE_WIKI` |
| **Financeiro** | 3 | Gestão de faturamento, fluxo de caixa e relatórios econômicos. | `VIEW_DASHBOARD`, `MANAGE_FINANCE`, `VIEW_REPORTS` |
| **People & Culture** | 4 | Gestão de equipe e disseminação da cultura interna. | `VIEW_DASHBOARD`, `MANAGE_TEAM`, `MANAGE_WIKI` |
| **Só Leitura** | 10 | Visualização básica para acompanhamento de métricas. | `VIEW_DASHBOARD` |

## Detalhamento das Permissões

Abaixo está a especificação técnica do que cada chave de permissão libera no sistema:

### Geral & Dashboard
*   **VIEW_DASHBOARD**: Permite visualizar o painel principal, gráficos de desempenho, notificações e indicadores de saúde da organização.
*   **VIEW_REPORTS**: Dá acesso à área de relatórios avançados, exportação de dados e análise histórica de métricas financeiras e de vendas.
*   **MANAGE_SETTINGS**: Permite alterar o nome da organização, logo, integrações de terceiros (como Asaas, WhatsApp) e gerenciar a criação/edição de cargos customizados.

### Comercial
*   **MANAGE_LEADS**: Permite criar novos leads, editar informações de contato, mover leads entre colunas do funil (Pipeline) e excluir registros de prospecção.
*   **MANAGE_CLIENTS**: Dá acesso à base de clientes ativos. Permite gerenciar o histórico de contratos, dados cadastrais e relacionamento com clientes que já fecharam negócio.

### Financeiro
*   **MANAGE_FINANCE**: Acesso completo ao módulo financeiro. Permite visualizar faturamento real, configurar split de pagamentos, gerenciar assinaturas e conferir extratos de transações.

### Equipe & Cultura
*   **MANAGE_TEAM**: Permite convidar novos membros para a organização via e-mail e alterar o cargo/permissões de membros existentes.
*   **MANAGE_WIKI**: Permite criar, editar, categorizar e excluir artigos na base de conhecimento interna da empresa.
*   **MANAGE_SUPPORT**: Dá acesso ao sistema de suporte, chat em tempo real com clientes e gestão de tickets de atendimento.

---

## Criando Cargos Customizados
Usuários com a permissão `MANAGE_SETTINGS` podem criar novos cargos adequados à realidade da sua empresa, combinando as permissões acima conforme necessário.

> [!IMPORTANT]
> A hierarquia é definida pelo **Nível**: quanto menor o número, maior a autoridade. Um Administrador (Nível 0) pode gerenciar um Gerente (Nível 1), mas não o contrário.
