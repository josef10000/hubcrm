# 🔐 Hub Central — Intranet Corporativa v5.9.1

> [!CAUTION]
> **USO INTERNO EXCLUSIVO DA HUB SYMPLES LTDA**
> Este sistema é uma ferramenta proprietária desenvolvida para a gestão, onboarding e automação comercial interna. O acesso é estritamente restrito a colaboradores autorizados e rigorosamente monitorado.

A plataforma Hub Central é o motor de crescimento da Hub Symples. Nossa intranet transforma prospecção em faturamento por meio de automação inteligente, integração fluida e gestão de dados em alta precisão.

---

<p align="center">
  <img src="https://img.shields.io/badge/Version-5.9.1-3b82f6?style=for-the-badge&labelColor=111111" alt="Version" />
  <img src="https://img.shields.io/badge/Status-Audited_&_Stable-3b82f6?style=for-the-badge&labelColor=0d0d0d" alt="Status" />
  <img src="https://img.shields.io/badge/Identity-Dark_Absolute-ffffff?style=for-the-badge&labelColor=0d0d0d" alt="Identity" />
  <img src="https://img.shields.io/badge/License-Proprietary-3b82f6?style=for-the-badge&labelColor=111111" alt="License" />
</p>

---

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Firebase-12-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase" />
</p>

<div align="center">
  <h2>✨ Destaque da Versão v5.9.1</h2>
  <p><strong>Hub Chat Group Mentions</strong></p>
  <p>Implementação de menções inteligentes por cargo (@Financeiro, @Suporte), otimizando a comunicação entre departamentos.</p>
</div>

<br />

<table>
  <tr>
    <td align="center" width="16%">
      <br />📱<br /><strong>Mobile UX</strong><br />
      <sub>Bottom Navigation</sub>
    </td>
    <td align="center" width="16%">
      <br />🔄<br /><strong>Unified Hub</strong><br />
      <sub>Sync por CPF/CNPJ</sub>
    </td>
    <td align="center" width="16%">
      <br />💬<br /><strong>Hub Chat Pro</strong><br />
      <sub>Mentions & Threads</sub>
    </td>
    <td align="center" width="16%">
      <br />💎<br /><strong>Premium Portal</strong><br />
      <sub>Glassmorphism UI</sub>
    </td>
    <td align="center" width="16%">
      <br />⚡<br /><strong>Auto Checkout</strong><br />
      <sub>Portal Payments</sub>
    </td>
    <td align="center" width="16%">
      <br />🛡️<br /><strong>Audit Trails</strong><br />
      <sub>Segurança & Logs</sub>
    </td>
    <td align="center" width="16%">
      <br />🎨<br /><strong>Hub Canvas</strong><br />
      <sub>Planejamento Infinito</sub>
    </td>
  </tr>
</table>

---

## 📋 Índice de Documentação

- [📖 Documentação Master (Processos)](docs/modules/CRM.md)
- [🔐 Matriz de Cargos e Permissões (RBAC)](docs/ROLES_AND_PERMISSIONS.md)
- [Arquitetura de Pilares Estratégicos](#-arquitetura-de-pilares-estratégicos)
- [Visão Geral dos Módulos](#-visão-geral-dos-módulos)
- [Hub Chat v3.0](#-hub-chat-v30---cockpit-de-produtividade)
- [Identidade Visual e Temas](#-identidade-visual-e-temas)
- [Stack Tecnológica e Arquitetura](#-stack-tecnológica-e-arquitetura)
- [Infraestrutura API (Serverless)](#-infraestrutura-api-serverless)
- [Instalação e Setup Local](#-instalação-e-setup-local)
- [Histórico de Atualizações (Roadmap)](#-histórico-de-atualizações-roadmap)

---

## 🚀 Arquitetura de Pilares Estratégicos

O Hub Central adota o modelo de **Gestão Descentralizada**. A plataforma é segmentada em 4 pilares centrais de poder, garantindo que cada colaborador (entre os 13 cargos do sistema) visualize estritamente os dados cruciais para a sua entrega e KPI.

1. **Comercial (Growth Engine)**: Focado em captação e conversão. Pipeline de Leads, Propostas One-Click e Cockpit do Vendedor.
2. **Operação (Delivery Hub)**: Garantia de entrega. Onboarding reativo, Controle de Projetos, Contratos, SLA Visual e Base de Conhecimento (Wiki).
3. **Financeiro (Profit Engine)**: Saúde de caixa corporativo. Billing Hub tático para cobrança (Dunning) e Finance BI estratégico para DRE e Métricas SaaS.
4. **Pessoas (Culture Hub)**: Aquisição e retenção de talentos. Perfis detalhados, Gestão de Liderados, PDI, eNPS e People Analytics.

---

## 🛠️ Visão Geral dos Módulos

### Pilar Comercial
*   **Pipeline Descentralizado**: Cada executivo de contas tem visibilidade exclusiva do seu próprio funil ("Minhas Oportunidades").
*   **Kanban Reativo**: Interface drag-and-drop de alta fluidez com log de atividades imutável e categorização colorida via Tags.
*   **Propostas em Tempo Real**: Geração de orçamentos complexos e envio automático pelo WhatsApp diretamente do card do Lead.

### Pilar Operacional
*   **Hub Canvas (Novo v5.9.0)**: Um quadro em branco infinito embarcado (`tldraw`), habilitando diagramação em equipe e planejamento arquitetural sem depender de ferramentas externas.
*   **Cockpit de Projetos & SLA**: Visão de delivery com **Pulse Red** – alertas visuais que pulsam e escalam a interface para chamados com prazos vencidos.
*   **Central de Contratos**: Gestão do fluxo de vida de documentos legais. Criação, envio, e formalização com registro imutável no Firestore.

### Pilar Financeiro
*   **Gestão de Assinaturas (Billing)**: Motor tático sincronizado bidirecionalmente com o gateway de pagamentos (Asaas). Tratamento automático de webhook para estorno, inadimplência e conciliação.
*   **Inteligência Executiva (BI)**: DRE Gerencial automático, rateio de custos de nuvem (CSP) e cruzamento de investimentos em Ads (CPA) contra o LTV real da carteira.

### Pilar de Pessoas & Cultura
*   **People Analytics**: Matriz de competências individual (`Skill Radar`), gestão de ausências e tracking contínuo de clima via eNPS anônimo e avaliações de liderança.
*   **Celebração Gamificada**: Motor inteligente que detecta aniversários e dispara interações comemorativas imersivas na interface de todos os membros do time ao longo do dia.

---

## 💬 Hub Chat v3.0 - Cockpit de Produtividade

Nossa comunicação interna vai muito além da troca de mensagens de texto; ela é integrada aos fluxos da empresa.

| Feature | Capacidade Estratégica |
|---|---|
| **Aprovações Nativas** | Botões de `Aprovar` embutidos no chat para autorização de propostas comerciais e aprovação de folgas com 1 clique. |
| **CRM Linking** | Referências ricas ("Rich Cards") de clientes diretamente no chat, permitindo pular da conversa para a ficha técnica do cliente. |
| **Threads e Organização** | Respostas em tópicos para debates aprofundados sem poluição visual da linha do tempo da empresa. |
| **Menções de Grupo** | Notificação em massa para departamentos inteiros (ex: `@Financeiro`, `@Suporte`) com 1 único comando. |
| **Agendamento & Reminders** | Programação de envio de mensagens para horários cruciais (follow-ups) e lembretes pessoais vinculados a tarefas. |
| **Controle Anti-Ruído** | Leituras detalhadas de mensagem (status de lido nominal), reações com Jumbo Emojis, e fixação dinâmica de atualizações da diretoria. |

---

## 🎨 Identidade Visual e Temas

O padrão estético primário da plataforma é o **Dark Absolute**: Fundo em preto absoluto (`#030712`) contrastando com superfícies em vidro fosco (`backdrop-blur-xl`), bordas de ultra-baixa opacidade (`border-white/10`) e detalhes em cores vibrantes.

A intranet oferece um sistema profundo de personalização com 6 estéticas que recalibram globalmente todos os tokens da interface:

*   **Cyberpunk** (Neon, Ciano & Rosa)
*   **Minimalista** (Premium B&W)
*   **Forest** (Esmeralda & Ouro)
*   **Nordic** (Gelo Ártico & Clean)
*   **Midnight** (Roxo Escuro & Índigo)
*   **Barbie** (Rosa Pastel Clean)

> [!TIP]
> **Convenção de Frontend:** O Design System proíbe o uso de cores literais (ex: `bg-blue-500`) em componentes sistêmicos. Todo desenvolvimento deve empregar as variáveis de tema globais (`bg-primary-500`, `text-primary-400`) assegurando transições suaves entre os temas escolhidos pelo colaborador.

---

## ⚙️ Stack Tecnológica e Arquitetura

O Hub Central foi concebido com uma infraestrutura de escala instantânea, adotando o modelo Serverless para eliminação de servidores estáticos e arquitetura orientada a eventos para processos de background.

### Frontend
*   **Framework**: React 19 executado via Vite 6
*   **Linguagem**: TypeScript 5.8 (Estrita tipagem para robustez enterprise)
*   **Styling Engine**: Tailwind CSS 4.0
*   **Interações & UI**: Framer Motion (animações de fluid mechanics), Lucide React (Simbologia SVG) e Radix/Custom Hooks para acessibilidade.

### Backend & Database
*   **Database Principal**: Firebase Firestore (NoSQL, Realtime syncs por websocket).
*   **Autenticação**: Firebase Auth integrado com Contextos React para segurança em nível de rota e de renderização.
*   **Serverless APIs**: Vercel Edge/Node Functions.

### Infraestrutura Integrada
*   **Gateway de Pagamento**: Asaas (API REST, Webhooks).
*   **E-mail Transacional**: Resend SDK.
*   **Rate Limiting & Anti-DDoS**: Upstash Redis acoplado nas requisições públicas de webhook e endpoints abertos.

---

## 🔌 Infraestrutura API (Serverless)

Todos os processos vitais fora do escopo do cliente operam como **Vercel Serverless Functions**. Estão localizados em `/api` e padronizados para garantir segurança.

**Principais Endpoints Asaas (Gateway):**
*   `/api/asaas/customers` (GET, POST, UPDATE)
*   `/api/asaas/subscriptions` (Gestão de Assinaturas & Cobranças)
*   `/api/asaas/webhook` (Recebimento Seguro de Eventos de Caixa)

**Gerenciamento Interno:**
*   `/api/team/invite` (Sistema seguro de onbarding com envio de tokens por e-mail)
*   `/api/team_handler` (Gestão de Skills, Ativos e Promoções de Carreira)
*   `/api/cron/process-scheduler` (Motor de automação temporal)

---

## 🔨 Instalação e Setup Local

### 1. Requisitos do Sistema
*   Node.js v20 LTS ou superior
*   Conta ativa Firebase, Asaas, Resend e Upstash (para desenvolvimento full-stack).

### 2. Inicialização do Projeto
```bash
# Clone o repositório proprietário
git clone https://github.com/josef10000/hubcrm.git
cd hubcrm

# Instale os pacotes (utilizamos npm)
npm install

# Copie o env.example e popule com chaves seguras
cp .env.example .env.local

# Inicie o processo Vite localmente
npm run dev
# Acesse o portal corporativo no navegador em http://localhost:5173
```

### 3. Deploy de Produção (CI/CD)
O projeto conta com automações profundas no GitHub Actions. Realizar pushes para a ramificação `main` engatilha:
1.  **Code Linting & Typescript Validation**
2.  **Testes Unitários via Vitest**
3.  **Firebase Security Rules Deploy**
4.  **Vercel Production Deploy**

---

## 🗺️ Histórico de Atualizações (Roadmap)

Um registro do contínuo processo de amadurecimento e modernização do produto.

- [x] **v1.0** — Funil de Vendas com Pipeline Kanban e Criação de Leads.
- [x] **v2.0** — Módulo Financeiro completo (DRE, Budget) e Gestão de Equipe com Organograma.
- [x] **v3.0** — Sistema de Temas Dinâmicos (Dark Absolute) e Central de Conhecimento (Wiki).
- [x] **v4.0.0** — Descentralização de Gestão: Interfaces baseadas no pilar de atuação do colaborador.
- [x] **v4.2.0** — Hub Chat v2.0 (Groups, DMs, Media, Replies).
- [x] **v4.3.0** — Chat Productivity Hub (Approvals, Pins, Bookmarks & Task Integration).
- [x] **v4.5.9** — Dunning (Cobrança Automática) e Hub de Audit Logs.
- [x] **v4.6.0** — Refatoração profunda de estabilidade em Contextos React e Serverless Security.
- [x] **v4.6.5** — Hub Chat Pro (Threads e CRM Linking).
- [x] **v5.0.0** — Sistema Global Customizado de Dialogs (Design Premium Glassmorphism).
- [x] **v5.1.0** — Premium Client Portal (Visão externa sofisticada com métricas em tempo real).
- [x] **v5.9.0** — Hub Canvas (Ferramenta de arquitetura estratégica tldraw integrada) & Estabilização Serverless.
- [x] **v5.9.1** — Group Mentions no Hub Chat (Integração com Cargos/Departamentos).

