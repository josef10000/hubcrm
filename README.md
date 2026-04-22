# 🔐 Hub Central — Intranet Corporativa v4.5.7 (Hook Stability Update)

> [!CAUTION]
> **USO INTERNO EXCLUSIVO DA HUB SYMPLES LTDA**
> Este sistema é uma ferramenta proprietária desenvolvida para a gestão, onboarding e automação comercial interna. O acesso é restrito a colaboradores autorizados.

Transformando prospecção em faturamento através de automação inteligente e gestão de alta precisão.

  <p>
    <img src="https://img.shields.io/badge/Version-4.5.7-3b82f6?style=for-the-badge&labelColor=111111" alt="Version" />
    <img src="https://img.shields.io/badge/Status-Audited_&_Optimized-3b82f6?style=for-the-badge&labelColor=0d0d0d" alt="Status" />
    <img src="https://img.shields.io/badge/Identity-Dark_Absolute-ffffff?style=for-the-badge&labelColor=0d0d0d" alt="Identity" />
    <img src="https://img.shields.io/badge/License-MIT-3b82f6?style=for-the-badge&labelColor=111111" alt="License" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Firebase-12-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase" />
  </p>
  <div align="center">
  <h2>✨ Features em Destaque v4.5.7</h2>
</div>

<table>
  <tr>
    <td align="center" width="20%">
      <br />🛡️<br /><strong>Dynamic RBAC</strong><br />
      <sub>Permissões Modulares</sub>
    </td>
    <td align="center" width="20%">
      <br />💬<br /><strong>Hub Chat v3.0</strong><br />
      <sub>Approvals & Pins</sub>
    </td>
    <td align="center" width="20%">
      <br />📉<br /><strong>Sales BI</strong><br />
      <sub>Timeline & SLA</sub>
    </td>
    <td align="center" width="20%">
      <br />💎<br /><strong>Financeiro</strong><br />
      <sub>DRE & SaaS Metrics</sub>
    </td>
    <td align="center" width="20%">
      <br />📖<br /><strong>Wiki Hub</strong><br />
      <sub>Knowledge Base</sub>
    </td>
  </tr>
</table>

---

## 📋 Índice

- [📖 Documentação Master (Comece Aqui)](docs/modules/CRM.md)
- [🔐 Detalhamento de Cargos e Permissões](docs/ROLES_AND_PERMISSIONS.md)
- [Visão Geral](#-visão-geral)
- [Hub Chat v3.0](#-hub-chat-v30)
- [Arquitetura de Pilares](#-arquitetura-de-pilares)
- [Módulos da Plataforma](#-módulos-da-plataforma)
- [Identidade Visual](#-identidade-visual)
- [Stack Tecnológica](#-stack-tecnológica)
- [Sistema RBAC](#-sistema-rbac)
- [Roadmap](#-roadmap)

---

## 🚀 Visão Geral v4.0 — Decentralized Management

O **Hub Central v4.0** marca a evolução de um "CRM visual" para um **Ecossistema de Gestão Descentralizada**. O foco desta versão é a **elimininação de ruído visual**: cada um dos 13 cargos do sistema visualiza apenas o que é essencial para sua entrega, organizado em 4 Pilares de Poder.

---

## 💬 Hub Chat v3.0 — Productivity Hub

A comunicação interna foi elevada ao nível de ferramenta de gestão. Mais que um chat, um cockpit de produtividade. Veja os detalhes em [CHAT.md](CHAT.md).

| Recurso | Descrição |
|---|---|
| ✅ **Aprovações Nativas** | Cards de autorização direta (ex: descontos/folgas) com um clique. |
| ⭐ **Mensagens Salvas** | Bookmark de mensagens importantes para consulta rápida. |
| 📌 **Pins reativos** | Mensagens fixadas com atualização em tempo real (sem F5). |
| 🔗 **Rich Previews** | Pré-visualização automática de links internos do HubCRM. |
| 😎 **Jumbo Emojis** | Detecção e aumento automático de reações via emoji. |
| 👥 **Grupos & DMs** | Criação dinâmica de canais e conversas 1:1 privadas. |
| 🛡️ **Segurança RBAC** | Camada total de proteção de dados via Firestore Rules. |
| 📅 **Data & Timeline** | Divisores de data estilo Teams e timestamps no topo das bolhas. |

---

## 🚀 Arquitetura de Pilares Estratégicos

1.  **Comercial (Growth Engine)**: Focado em captar e converter. Leads, Pipeline e Propostas.
2.  **Operação (Delivery Hub)**: Garantia de entrega. Onboarding, Projetos, Contratos e Wiki.
3.  **Financeiro (Profit Engine)**: Saúde do caixa. Billing (Tático) e Finance (Estratégico).
4.  **Pessoas (Culture Hub)**: Retenção de talentos. Perfil, Equipe e Bem-estar.

### 🚀 O que há de novo na v4.6.0:
- **Agenda de Disponibilidade**: Sistema de agendamento 1:1 entre membros da equipe diretamente no Perfil.
- **Automação de Chat contextuais**: Ao aprovar uma reunião, o sistema cria automaticamente uma sala de chat dedicada com os participantes e o link da reunião.
- **Regras de Etiqueta Corporativa**: Trava obrigatória de **24 horas** para novos agendamentos e durações fixas de 15, 30 e 60 minutos.
- **Bloqueios de Privacidade**: Colaboradores podem bloquear horários com motivos públicos ou privados.
- **Integração Visual**: Atalhos de calendário na sidebar do chat para acesso imediato às agendas.

### 🛠 Correções e Melhorias Recentes (v4.5.7):

| Diferencial | Descrição |
|---|---|
| 🎯 **Minhas Oportunidades** | Filtro exclusivo para SDRs/Executives focarem no próprio pipeline. |
| ✨ **Proposta 1-Clique** | Geração instantânea de proposta estratégica via WhatsApp diretamente do card. |
| 🛡️ **Billing Hub** | Módulo tático isolado para gestão de inadimplência e comissões. |
| 🚀 **Hub de Onboarding** | Trilhas reativas de entrada para Clientes e Talentos. |
| 📋 **Central de Contratos** | Cockpit jurídico para gestão de assinaturas e formalização. |
| 🔧 **Projects Dashboard** | Visão técnica total com monitoramento de SLA e progresso real. |
| 👥 **Minha Equipe** | Lógica de liderança (`reportsTo`) para foco total do gestor em seus liderados. |
| 🚨 **SLA Pulse Red** | Alerta visual pulsante para chamados e entregas fora do prazo. |

---

## 🛠️ Módulos da Plataforma (Arquitetura v4.6.0)

### 🏗️ 1. Pilar Comercial (Leads Hub)

Gestão descentralizada de leads projetada para alta conversão.

- **Pipeline Descentralizado**: Cada vendedor foca no seu funil através do botão "Minhas Oportunidades".
- **Proposta 1-Clique**: Automação inteligente que gera a proposta e envia via WhatsApp com um clique.
- **Kanban Reativo**: Arraste e solte com sincronização atômica e logs de atividade.
- **Isolamento Comercial**: SDRs e Executives visualizam **apenas seus próprios leads**, enquanto a gestão possui visão BI global.
- **Segmentação por Etiquetas (Tags)**: Classificação granular de leads com cores personalizadas para identificar nichos, urgências ou origens específicas diretamente no Kanban.

- **Moderação de Conteúdo**: Ferramentas de edição e exclusão de comentários e artigos para administradores e gerentes.

---

### ⚙️ 2. Pilar Operação (Delivery Hub)

O cockpit de entrega da empresa, garantindo que o cliente receba exatamente o que comprou, no prazo e com segurança jurídica.

- **🚀 Hub de Onboarding**: Trilhas reativas de entrada para Clientes (CS) e novos Talentos (Equipe), com tracking de progresso em tempo real.
- **📋 Central de Contratos**: Gestão jurídica centralizada. Acompanhamento de propostas, minutas e assinaturas digitais com histórico de formalização.
- **🔧 Cockpit de Projetos**: Visão técnica completa de todos os projetos ativos, com estágios personalizados e monitoramento de **SLA Visual**.
- **🎧 Support Desk (Meus Chamados)**: Filtro descentralizado para foco técnico e efeito **Pulse Red** para chamados com SLA estourado.
- **📖 Wiki Hub**: Central de conhecimento integrada com badges de leitura em tempo real e busca proativa.

---

### 💰 3. Pilar Financeiro (Profit & Billing Hub)

Desmembramento estratégico entre a operação de cobrança e a análise de lucro.

- **🛡️ Billing Hub (Tático)**: Gestão dedicada de inadimplência, faturamento recorrente, conciliação e geração automática de comissões para o time comercial.
- 📊 **Finance BI (Estratégico)**: Visão executiva pura. DRE Gerencial com dedução automática de taxas Asaas, Fluxo de Caixa, Budgeting e Métricas SaaS.
- **🪙 ROI & SaaS Analytics**: Cruzamento inteligente de investimentos em Ads com o LTV real e Churn Rate (30 dias móveis).
- **📡 CSP (Fixed Cost Apportionment)**: Cálculo automático de rateio de infraestrutura por cliente para determinar a margem de contribuição real.

---

### 👥 4. Pilar Pessoas (Culture Hub)

Gestão de talentos focada em retenção, desenvolvimento e clareza de liderança.

- **👥 Minha Equipe**: Filtro estratégico baseado na hierarquia (`reportsTo`), permitindo que gestores foquem apenas em seus liderados diretos.
- **🧬 People Analytics**: Matriz de competências (Skill Radar), eNPS Anônimo e monitoramento de Clima Organizacional (Energy/Mood).
- **🏖️ Gestão de Ausências**: Fluxo auditável de férias e folgas integrado ao Calendário Operacional.
- **🎒 Inventário de Ativos**: Controle patrimonial vinculado ao colaborador com travas de segurança RBAC.

---

### 🎉 10. Gamificação — Celebração de Aniversários

Sistema automático de celebração que detecta o aniversário do colaborador a partir do campo `birthDate` no perfil.

- **Detecção Automática**: Comparação da data de nascimento com a data atual no login.
- **Explosão de Confetes**: Animação visual com canvas-confetti via CDN (disparos laterais durante 5 segundos).
- **Banner Personalizado**: Mensagem "Parabéns pelo seu dia!" com animação Framer Motion.
- **Ícone Festivo**: Emoji de festa 🎉 animado ao lado do nome na barra lateral durante todo o dia.
- **Controle de Exibição**: A animação aparece apenas uma vez por dia (controle via `localStorage`).

---

### 🎨 11. Personalização & Sistema de Temas

Experiência visual premium com troca dinâmica de identidade.

| Tema | Cor Primária | Código |
|---|---|---|
| 🟠 **Laranja** (Padrão) | `#f97316` | `theme-orange` |
| 🔵 **Azul** | `#3b82f6` | `theme-blue` |
| 🟢 **Verde** | `#22c55e` | `theme-green` |
| 🟣 **Roxo** | `#a855f7` | `theme-purple` |
| 🌹 **Rosa** | `#f43f5e` | `theme-rose` |

A troca de tema altera **globalmente** todos os elementos de destaque da interface (botões, badges, ícones, gradientes, sombras) via CSS Custom Properties.

---

### 🗺️ 12. Mapa de Clientes

Visualização geográfica de toda a carteira, com pins interativos contendo dados do cliente. Acessível por **todos os cargos** para fomentar visão estratégica.

---

### 🔔 13. Central de Notificações

Hub centralizado de avisos internos para a equipe, com categorização por tipo e leitura confirmada.

---

### 📦 14. Catálogo de Produtos / Ofertas

Gestão completa do portfólio de serviços e planos:

- **Tipos**: Assinatura Recorrente (`SUBSCRIPTION`) ou Pagamento Único (`SINGLE`).
- **Configuração**: Preço base, taxa de setup, parcelas máximas, descrição detalhada.
- **Contextos de Exibição**: controle de onde a oferta aparece (`CHECKOUT`, `PORTAL` ou `BOTH`).
- **Ordenação Visual**: Drag-and-drop para priorizar a ordem de exibição.
- **Acessibilidade Nativa (v3.9)**: Interface totalmente compatível com o fluxo de contratação pública.

---

### ♿ 15. Acessibilidade & Inclusão (v3.9.0)

O HubCRM segue o princípio **"Human First"**, garantindo que a tecnologia sirva a todos com a mesma precisão e dignidade.

- **Padrões WCAG 2.1**: Implementação rigorosa de diretrizes de acessibilidade para a web.
- **HTML Semântico & ARIA**: Uso de marcos regionais (`banner`, `main`, `navigation`, `search`) e atributos ARIA para contextualização total em leitores de tela.
- **Navegação por Teclado**: Fluxos críticos (Checkout e Dashboard) otimizados para operação via `Tab`, `Shift+Tab` e `Enter`.
- **Vínculos Semânticos**: Conexão entre rótulos (`label`) e campos (`input`) via IDs únicos, eliminando ambiguidades operacionais.
- **Indicadores de Progresso**: O fluxo de checkout informa dinamicamente a etapa atual e o contexto da tarefa para tecnologias assistivas.

---

## 🌑 Identidade Visual — Dark Absolute

A plataforma adota a identidade **Dark Absolute**: fundo preto profundo (`#030712`) com elementos em semi-transparência (`bg-black/40`, `bg-white/5`), bordas sutis (`border-white/10`) e gradientes luminosos sobre fundo escuro.

```css
/* Princípios de Design */
Fundo Global:       #030712 (Gray-950)
Superfícies:        bg-black/40 (backdrop-blur-xl)
Bordas:             border-white/10
Texto Principal:    text-white
Texto Secundário:   text-gray-400
Destaques:          primary-500 (variável dinâmica)
Sombras:            shadow-primary-500/20
```

> **Regra para Desenvolvedores**: Nunca utilize cores hardcoded (ex: `bg-orange-500`). Use sempre `bg-primary-500`, `text-primary-400`, etc., para garantir compatibilidade total com o sistema de temas.

---

## ⚙️ Stack Tecnológica & Arquitetura

### Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React 19 · TypeScript 5.8 · Vite 6 · Tailwind CSS 4       │
│  Framer Motion · Recharts · Lucide Icons · Sonner           │
│  Context API (Auth + CRM + UI) · React Router 7            │
├─────────────────────────────────────────────────────────────┤
│                     SERVERLESS API                          │
│  Vercel Functions (Node.js) · Firebase Admin SDK            │
│  Resend SDK · Upstash Redis (Rate Limiting)                 │
├─────────────────────────────────────────────────────────────┤
│                       BACKEND                               │
│  Firebase Firestore (NoSQL, Realtime)                       │
│  Firebase Auth (Google, Email/Password)                     │
│  Asaas API (Pagamentos, Webhooks)                           │
│  UptimeRobot API (Monitoramento)                            │
└─────────────────────────────────────────────────────────────┘
```

### Tabela de Dependências

| Camada | Tecnologia | Versão | Propósito |
|---|---|---|---|
| **Runtime** | React | 19.x | UI reativa com Server Components |
| **Linguagem** | TypeScript | 5.8 | Type safety e DX |
| **Build** | Vite | 6.x | Build ultrarrápido com HMR |
| **Estilização** | Tailwind CSS | 4.0 | Utility-first com Custom Properties |
| **Animações** | Framer Motion | 12.x | Micro-interações premium |
| **Gráficos** | Recharts | 3.x | Data visualization |
| **Ícones** | Lucide React | 0.546 | Biblioteca de ícones SVG |
| **Toasts** | Sonner | 2.x | Notificações elegantes |
| **Validação** | Zod | 4.x | Schema validation |
| **Datas** | date-fns | 4.x | Manipulação de datas |
| **Banco** | Firebase Firestore | 12.x | NoSQL realtime database |
| **Auth** | Firebase Auth | 12.x | Autenticação federada |
| **Backend** | Firebase Admin | 13.x | Acesso privilegiado server-side |
| **Pagamentos** | Asaas API | REST | Gateway de pagamentos BR |
| **E-mails** | Resend | 3.x | E-mails transacionais |
| **Rate Limit** | Upstash Redis | 1.x | Proteção contra abuso |
| **Deploy** | Vercel | Serverless | Edge Functions + CDN |
| **Monitoramento** | Sentry SDK | 8.x | Rastreio de erros e performance |
| **Acessibilidade** | WCAG 2.1 | ARIA | Inclusão e Navegação via Teclado |
| **Testes Unitários** | Vitest | 3.x | Unit testing |
| **AI** | Google Gemini | 1.x | Análise inteligente (opcional) |

---

## 🏗️ Arquitetura de Dados (Firestore Schema)

```
firestore/
├── profiles/{userId}
│   ├── uid, email, displayName
│   ├── orgId (vínculo com organização)
│   ├── role (UserRole - RBAC)
│   ├── jobTitle, bio, photoURL
│   ├── phoneNumber, instagram, linkedin
│   ├── reportsTo (UID do superior)
│   ├── birthDate (YYYY-MM-DD, opcional)
│   └── lastEnpsResponse (Timestamp da última participação)
│
├── organizations/{orgId}
│   ├── id, name, adminId, createdAt
│   │
│   ├── settings/
│   │   └── preferences
│   │       ├── defaultStages[] (etapas do projeto)
│   │       ├── onboardingQuestions[] (formulário dinâmico)
│   │       ├── defaultContractText (texto-base do contrato)
│   │       ├── checkoutTitle, checkoutDescription
│   │       └── asaas_api_key, resend_api_key, uptimerobot_key
│   │
│   ├── clients/{clientId}
│   │   ├── Dados pessoais (name, email, cpfCnpj, whatsapp)
│   │   ├── Dados do plano (plan, planPrice, billingCycle)
│   │   ├── Status operacional (status, stages[])
│   │   ├── Financeiro Asaas (asaasCustomerId, paymentStatus)
│   │   ├── Contratos (contracts[])
│   │   ├── Credenciais (credentials[])
│   │   ├── Indicações (referralCode, referredBy)
│   │   ├── NPS (npsScore, npsComment)
│   │   ├── Logs de atividade (logs[])
│   │   ├── Anexos (attachments[])
│   │   └── E-mail history (emailHistory[])
│   │
│   ├── leads/{leadId}
│   │   ├── Pipeline data (name, status, estimatedValue)
│   │   └── assignedTo (UID do vendedor responsável)
│   │
│   ├── offers/{offerId}
│   │   ├── Produto (name, type, price, setupPrice)
│   │   └── Exibição (displayContext, order, active)
│   │
│   ├── expenses/{expenseId}
│   │   └── Despesas operacionais
│   │
│   ├── transactions/{transactionId}
│   │   └── Lançamentos financeiros (DRE/Fluxo de Caixa)
│   │
│   ├── budgets/{budgetId}
│   │   └── Orçamentos por categoria/período
│   │
│   ├── transactionCategories/{categoryId}
│   │   └── Categorias de receita e despesa
│   │
│   ├── supportRequests/{requestId}
│   │   └── Chamados de suporte
│   │
│   └── enps_results/{resultId}
│       └── Respostas anônimas de clima (score, comment)
│
└── convites/{inviteId}
    ├── email, orgId, role, token
    ├── status (pending | accepted | expired)
    └── expiresAt
```

---

## 🔌 Endpoints da API (Serverless)

Todas as funções rodam como **Vercel Serverless Functions** com proteção por autenticação Firebase e Rate Limiting via Upstash Redis.

### Asaas (Pagamentos — Standardized RESTful API)

As rotas foram padronizadas para o formato `/api/asaas/...` com roteamento inteligente via `vercel.json` para o `asaas_handler.ts`.

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/asaas/customers` | Listar clientes Asaas |
| `POST` | `/api/asaas/create-customer` | Criar cliente no Asaas |
| `POST` | `/api/asaas/update-customer` | Atualizar dados do cliente |
| `GET` | `/api/asaas/payments` | Listar cobranças |
| `POST` | `/api/asaas/edit-payment` | Editar cobrança |
| `DELETE` | `/api/asaas/delete-payment` | Excluir cobrança |
| `POST` | `/api/asaas/receive-in-cash` | Confirmar pagamento manual |
| `POST` | `/api/asaas/payment-links` | Gerar link de pagamento |
| `GET` | `/api/asaas/subscriptions` | Listar assinaturas |
| `GET` | `/api/asaas/subscriptions/:id` | Detalhes de assinatura |
| `POST` | `/api/asaas/update-subscription` | Atualizar assinatura |
| `DELETE` | `/api/asaas/delete-subscription` | Cancelar assinatura |
| `POST` | `/api/asaas/webhook` | Webhook de eventos (público) |

### Equipe (Team Management)

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/team/list` | Listar membros e convites |
| `POST` | `/api/team/invite` | Enviar convite por e-mail |
| `POST` | `/api/team/accept` | Aceitar convite |
| `POST` | `/api/team/remove` | Remover membro |
| `POST` | `/api/team/cancel-invite` | Cancelar convite pendente |
| `POST` | `/api/team/update-profile` | Atualizar perfil/hierarquia |
| `POST` | `/api/team_handler?action=add-feedback` | Registrar novo feedback |
| `POST` | `/api/team_handler?action=add-asset` | Atribuir equipamento |
| `POST` | `/api/team_handler?action=remove-asset` | Remover equipamento |
| `POST` | `/api/team_handler?action=add-milestone` | Registrar marco de carreira |
| `POST` | `/api/team_handler?action=update-skills` | Atualizar matriz de skills |

### Outros

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/email/manual-trigger` | Disparar e-mail manualmente |
| `GET` | `/api/uptimerobot/monitors` | Consultar status dos monitores |
| `POST` | `/api/public_checkout` | Processar checkout público |
| `GET` | `/api/birthday_handler` | Execução diária do Cron de Aniversários |

---

## 🔐 Sistema RBAC v4.5 — Dynamic Permissions

O HubCRM utiliza um sistema de **Controle de Acesso Baseado em Função (RBAC)** dinâmico, permitindo uma segmentação granular de permissões conforme a necessidade da organização.

### 🏛️ Matriz de Pilares e Permissões Principais

| Pilar | Módulos Relacionados | Permissões Chave |
|---|---|---|
| **Comercial** | Leads, Pipeline, Propostas | `MANAGE_LEADS`, `MANAGE_CLIENTS` |
| **Operação** | Onboarding, Contratos, Wiki | `MANAGE_WIKI`, `MANAGE_SUPPORT` |
| **Financeiro** | Billing, DRE, Budget | `MANAGE_FINANCE`, `VIEW_REPORTS` |
| **Pessoas** | Perfil, Equipe, PDI | `MANAGE_TEAM`, `VIEW_DASHBOARD` |

### 📖 Documentação Detalhada
Para uma explicação completa de cada cargo (Administrador, SDR, Financeiro, etc.) e o que cada permissão individual libera tecnicamente no sistema, consulte o guia oficial:

👉 **[Guia Completo de Cargos e Permissões](docs/ROLES_AND_PERMISSIONS.md)**

### Regras de Ouro v4.5

- **Data Shielding**: Filtros automáticos por `assignedTo` (Comercial/Suporte) ou `reportsTo` (Pessoas) garantem que a interface exiba apenas o necessário.
- **Visual Urgency**: O sistema utiliza animações de pulsação sonora/visual (Pulse Red) para destacar atrasos em qualquer módulo para perfis de gestão.
- **Auto-Gestão Protegida**: Colaboradores não podem editar seus próprios PDIs ou Feedbacks, garantindo a integridade da mentoria.

### Regras Especiais

- **Super-Admin**: O e-mail proprietário é elevado automaticamente a `Administrador` em memória, independente do valor salvo no banco.
- **Privacidade de Performance (CSAT)**: A média de satisfação individual nos perfis é exibida apenas se o usuário possuir roles de `Administrador`, `Gerente`, `Customer Success` ou `Suporte Técnico`, ou se o seu cargo contiver palavras-chave de atendimento (suporte, sucesso, etc).
- **Firestore Rules**: Segurança server-side reforçada com funções `belongsToOrg()` e `isOrgAdmin()`.
- **Auto-Gestão Restrita (v2.4.2)**: Para garantir a integridade dos processos de feedback e desenvolvimento, colaboradores não podem adicionar feedbacks a si mesmos no Mural ou atualizar sua própria matriz de skills no PDI. Estas ações são exclusivas para papéis de gestão (`Administrador`, `Gerente`, `People & Culture`) ao visualizar perfis de terceiros.
- **Configurações Universais**: Todos os cargos acessam Configurações para trocar tema e sair do sistema. Seções administrativas (etapas, checkout, contrato) são renderizadas condicionalmente apenas para Admin/Gerente.

---

## 🔄 Pipeline CI/CD

O projeto possui 5 workflows automatizados via **GitHub Actions**:

| Workflow | Arquivo | Gatilho | Propósito |
|---|---|---|---|
| 🔒 **Firebase Rules** | `firebase-rules.yml` | Push → `main` | Deploy de Firestore Rules |
| 🛡️ **Sentry Monitoring** | `Sentry SDK` | Runtime | Monitoramento Proativo de Erros |
| 🚀 **Vercel Deploy** | `vercel-deploy.yml` | Push → `main` | Deploy de produção automático |

---

## 🔨 Instalação e Configuração

### Pré-requisitos

- **Node.js** v20+ ([Download](https://nodejs.org))
- **Git** ([Download](https://git-scm.com))
- **Conta Firebase** com projeto criado ([Console](https://console.firebase.google.com))
- **Conta Asaas** para pagamentos ([Cadastro](https://www.asaas.com))
- **Conta Resend** para e-mails ([Cadastro](https://resend.com))
- **Conta Vercel** para deploy ([Cadastro](https://vercel.com)) *(opcional para dev local)*

### Passos de Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/josef10000/hubcrm.git
cd hubcrm

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves reais (veja seção abaixo)

# 4. Inicie o servidor de desenvolvimento
npm run dev
# → Acesse http://localhost:5173
```

### Deploy para Produção (Vercel)

```bash
# Via CLI
npx vercel --prod

# Ou conecte o repositório no dashboard Vercel:
# vercel.com/new → Import Git Repository → hub-crm
```

> **Importante**: Configure todas as variáveis de ambiente no painel da Vercel (`Settings > Environment Variables`).

---

## 🔑 Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
# ═══════════════════════════════════════════════════
# 🔥 FIREBASE (Obrigatório)
# ═══════════════════════════════════════════════════
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="projeto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="projeto-id"
VITE_FIREBASE_STORAGE_BUCKET="projeto.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef..."

# ═══════════════════════════════════════════════════
# 💳 ASAAS — Gateway de Pagamentos (Obrigatório)
# ═══════════════════════════════════════════════════
VITE_ASAAS_API_KEY="asaas_..."         # API Key
ASAAS_WEBHOOK_TOKEN="token_seguro"     # Validação de webhooks

# ═══════════════════════════════════════════════════
# 📧 RESEND — E-mails Transacionais (Obrigatório)
# ═══════════════════════════════════════════════════
VITE_RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="notificacoes@seudominio.com.br"

# ═══════════════════════════════════════════════════
# ⚡ UPSTASH REDIS — Rate Limiting (Obrigatório)
# ═══════════════════════════════════════════════════
VITE_UPSTASH_REDIS_URL="https://slug.upstash.io"
VITE_UPSTASH_REDIS_TOKEN="token_aqui"

# ═══════════════════════════════════════════════════
# 🤖 GEMINI AI — Análise Inteligente (Opcional)
# ═══════════════════════════════════════════════════
VITE_GEMINI_API_KEY="AIzaSy..."

# ═══════════════════════════════════════════════════
# 🛰️ UPTIME ROBOT — Monitoramento (Opcional)
# ═══════════════════════════════════════════════════
VITE_UPTIMEROBOT_API_KEY="u12345-..."

# ═══════════════════════════════════════════════════
# 🌐 APP
# ═══════════════════════════════════════════════════
VITE_APP_URL="http://localhost:5173"
VITE_NODE_ENV="development"
INVITE_EXPIRATION_HOURS=72
```

> ⚠️ Variáveis `VITE_*` são públicas (expostas no frontend). Variáveis sem prefixo são privadas (apenas serverless).

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite + Express proxy) |
| `npm run build` | Build de produção otimizado |
| `npm run preview` | Preview do build local |
| `npm run test` | Execução dos testes unitários (Vitest) |
| `npm run clean` | Limpa o diretório `dist/` |
| `npm start` | Alias para `npm run dev` |

---

## 📁 Estrutura de Diretórios

```
hubcrm/
├── .github/
│   └── workflows/              # 5 pipelines CI/CD
│       ├── build-check.yml
│       ├── firebase-rules.yml
│       ├── lint-check.yml
│       ├── test-check.yml
│       └── vercel-deploy.yml
│
├── api/                        # Vercel Serverless Functions
│   ├── _logic/
│   │   ├── asaas/              # Lógica de pagamentos
│   │   ├── email/              # Templates e disparo
│   │   └── uptimerobot/        # Consulta de monitores
│   ├── _utils/
│   │   ├── asaas.ts            # Helper de chamadas Asaas
│   │   ├── authMiddleware.ts   # Validação JWT Firebase
│   │   ├── emailLogger.ts     # Registro anti-spam
│   │   └── firebase.ts        # Firebase Admin init
│   ├── asaas_handler.ts        # Roteador Asaas (customers/payments/subscriptions)
│   ├── asaas_webhook.ts        # Webhook receiver
│   ├── email.ts                # Trigger manual de e-mails
│   ├── public_checkout.ts      # Processamento do checkout público
│   ├── team_handler.ts         # CRUD de equipe e convites
│   └── uptime.ts               # Proxy UptimeRobot
│
├── src/
│   ├── components/
│   │   ├── Auth.tsx            # Login/Registro (Firebase Auth)
│   │   ├── BirthdayCelebration.tsx # 🎉 Confetes de aniversário
│   │   ├── CalendarView.tsx    # Agenda interativa
│   │   ├── ClientMapView.tsx   # Mapa geográfico (Leaflet)
│   │   ├── ClientModal.tsx     # Modal completo do cliente
│   │   ├── ClientPortal.tsx    # Portal self-service
│   │   ├── MonitoringView.tsx  # Painel UptimeRobot
│   │   ├── OnboardingForm.tsx  # Formulário de onboarding
│   │   ├── PublicCheckoutPage.tsx # Página de checkout público
│   │   ├── ReferralsView.tsx   # Programa de indicações
│   │   ├── ROITrafficView.tsx  # Módulo de ROI e Análise de Tráfego (Novo)
│   │   ├── client-modal/       # Sub-componentes do modal
│   │   ├── dashboard/          # Widgets do dashboard
│   │   ├── finance/            # Sub-módulos financeiros
│   │   ├── notifications/      # Componentes de avisos
│   │   └── SupportSatisfactionModal.tsx # ⭐ Modal de CSAT (Novo)
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Estado de autenticação + birthday check
│   │   ├── CRMContext.tsx      # Estado global (clients, leads, offers)
│   │   └── UIContext.tsx       # Estado de UI (tema, sidebar, filtros)
│   │
│   ├── views/
│   │   ├── AcceptInviteView.tsx
│   │   ├── AnalyticsView.tsx
│   │   ├── ContractSignView.tsx
│   │   ├── DashboardView.tsx
│   │   ├── FinanceView.tsx
│   │   ├── LeadsView.tsx
│   │   ├── MarketingView.tsx
│   │   ├── NotificationsView.tsx
│   │   ├── ProductsView.tsx
│   │   ├── ProfileView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── SupportView.tsx
│   │   └── TeamManagementView.tsx
│   │
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Firebase client config
│   ├── services/               # Serviços auxiliares
│   ├── types.ts                # Tipos TypeScript (13 UserRoles, 20+ interfaces)
│   ├── helpers.ts              # Funções utilitárias
│   ├── helpers.test.ts         # Testes unitários
│   ├── App.tsx                 # Aplicação principal + routing
│   ├── main.tsx                # Entry point
│   └── index.css               # Design system (temas + scrollbar + globals)
│
├── .env.example                # Template de variáveis de ambiente
├── ACCESS_POLICY.md            # Documento de política de acessos
├── CONTRIBUTING.md             # Guia de contribuição
├── LICENSE                     # MIT License
├── firebase.json               # Configuração Firebase
├── firestore.rules             # Regras de segurança Firestore
├── firestore.indexes.json      # Índices compostos
├── vercel.json                 # Rewrites e configuração Vercel
├── vite.config.ts              # Configuração Vite + plugins
├── vitest.config.ts            # Configuração de testes
├── tsconfig.json               # Configuração TypeScript
└── package.json                # Dependências e scripts
```

---

## 🤝 Guia de Contribuição

Consulte o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes completos. Resumo:

1. **Fork** o repositório
2. Crie uma branch (`git checkout -b feature/nome-da-feature`)
3. Siga o padrão de Design System (use `primary-500`, nunca cores hardcoded)
4. Commit com [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`)
5. Abra um **Pull Request** para `main`

### Regras de Estilo

```typescript
// ✅ CORRETO — Use variáveis de tema
className="bg-primary-500 text-white"
className="bg-black/40 border-white/10"

// ❌ ERRADO — Nunca use cores fixas
className="bg-orange-500 text-white"
className="bg-gray-100 border-gray-200"
```

---

## 🗺️ Roadmap

- [x] Funil de Vendas com Pipeline Kanban
- [x] Power Checkout (Onboarding Self-Service)
- [x] Portal do Cliente com NPS e Indicações
- [x] Módulo Financeiro completo (DRE, Budget, OFX)
- [x] Gestão de Equipe com Organograma
- [x] Celebração de Aniversários (Gamificação)
- [x] Sistema de Temas Dinâmicos (Dark Absolute)
- [x] CI/CD com GitHub Actions (5 pipelines)
- [x] 🧬 Gestão de Ativos, Skills, Carreira, Docs, Feedbacks e Humor (Módulo Intranet)
- [x] 🧬 Gestão de Ausências, Onboarding, PDI e eNPS
- [x] 🎧 Suporte com SLA Tracker, CSAT e Atribuição de Técnicos (Fase 2)
- [x] 📈 Health Score Automatizado (Financeiro + Engajamento + NPS) (Fase 2)
- [x] 📈 Timeline de Vendas e Controle de Follow-up (Fase 2)
- [x] ⚠️ Alertas de Inadimplência Crítica no Financeiro (Fase 2)
- [x] ⚙️ Confirmação de Resolução pelo Cliente e CSAT Customizável (Fase 2)
- [x] 💰 **FinOps Avançado**: Rentabilidade Real (Desconto de Comissões), ROI por Oferta e Gestão de Ads (Fase 2)
- [x] 🔮 **Projeção de Fluxo de Caixa Inteligente** com capacidade de investimento em Ads (Fase 2)
- [x] 🏷️ Sistema de tags e segmentação de clientes
- [x] 📖 **Wiki Hub (Central de Conhecimento com RBAC)**
- [x] 📱 **Atendimento Ativo (Quick Ticket + Modo Nota WhatsApp)** (Fase 3)
- [x] ⚡ **Sincronização de Perfil em Tempo Real** (Fix Wiki Notification)
- [x] 📧 **Automação de E-mails de Aniversário (Vercel Cron)**
- [x] 🚀 **v4.0.0 Decentralized Evolution (Leads/Support/People Focus)**
- [x] 💬 **v4.2.0 Hub Chat v2.0 (Groups, DMs, Media, Replies & Polish)**
- [x] 🛰️ **v4.2.1 Presença Persistente (Correção de Status Manual / Almoço)**
- [x] 🚀 **v4.3.0 Chat Productivity Hub (Approvals, Pins, Bookmarks & Task Integration)**
- [x] ⚡ **v4.3.3 UI Standardization & Real-time Pin Reactivity Fix**
- [x] ⚡ **v4.3.5 Bug Fix: Missing Text rendering & Mention Highlighting upgrade**
- [x] 🚀 **v4.4.0 Finance Optimization (Unified Transactions, Asaas Fee Automation & SaaS Metrics)**
- [x] 🛡️ **v4.5.4 Profile Resilience (Data Safety, PDI Fix & Date Guards)**
- [x] 🛡️ **v4.5.5 Deep Resilience (Radar Chart Fix, Hook Array Guards & Inventory Safety)**
- [x] 🛡️ **v4.5.6 Zero-White-Screen (Error State Fallback, Energy Score Hardening)**
- [x] 🛡️ **v4.5.7 Hook Stability (Fix React Error #310 & Firebase Alert Guard)**
- [ ] 🔮 **v4.5.0 Automations & AI Chat Summary** (Fase 3)


---

## 🧪 Testes Automatizados

O projeto possui **49 testes unitários** distribuídos em 4 suites, cobrindo as áreas de maior risco do sistema (pagamentos, cobranças, contratos).

| Suite | Arquivo | Testes | Cobertura |
|---|---|---|---|
| **Billing Logic** | `src/helpers.test.ts` | 10 | Preços, setup, descontos, referral |
| **Asaas Webhook** | `api/__tests__/webhook.test.ts` | 11 | Token auth, idempotência, status, anti-spam e-mails |
| **Public Checkout** | `api/__tests__/checkout.test.ts` | 15 | Validação de entrada, oferta, Asaas, Firestore, contrato |
| **Asaas Utils** | `api/__tests__/asaas-utils.test.ts` | 13 | Request builder, error handling, sanitização |

#### Executar testes:

```bash
npm test           # Executa todos (49 testes)
npx vitest run     # Modo CI (sem watch)
npx vitest         # Modo desenvolvimento (watch)
```

---


## 📄 Licença

Este projeto é distribuído sob a [Licença MIT](LICENSE).

```
MIT License — Copyright (c) 2026 Hub Symples LTDA
```

---

<div align="center">
  <br />
  <img src="https://i.imgur.com/EFBaYb5.png" alt="Hub Central" width="80" />
  <br /><br />
  <strong>Hub Central v4.0.0</strong>
  <br />
  <em>Modernidade · Automação · Resultados</em>
  <br /><br />
  <p>
    <a href="https://github.com/josef10000/hubcrm">GitHub</a> ·
    <a href="https://github.com/josef10000/hubcrm/issues">Reportar Bug</a> ·
    <a href="https://github.com/josef10000/hubcrm/issues">Sugerir Feature</a>
  </p>
  <br />
  <sub>Feito com ☕ e dedicação pela equipe Hub Symples</sub>
</div>
