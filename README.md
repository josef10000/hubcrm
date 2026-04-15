# 🔐 Hub Central — Intranet Corporativa

> [!CAUTION]
> **USO INTERNO EXCLUSIVO DA HUB SYMPLES LTDA**
> Este sistema é uma ferramenta proprietária desenvolvida para a gestão, onboarding e automação comercial interna. O acesso é restrito a colaboradores autorizados.

Transformando prospecção em faturamento através de automação inteligente e gestão de alta precisão.

  <p>
    <img src="https://img.shields.io/badge/Version-2.5.2-0d0d0d?style=for-the-badge&labelColor=111111" alt="Version" />
    <img src="https://img.shields.io/badge/Status-Production_Ready-22c55e?style=for-the-badge&labelColor=0d0d0d" alt="Status" />
    <img src="https://img.shields.io/badge/Identity-Dark_Absolute-ffffff?style=for-the-badge&labelColor=0d0d0d" alt="Identity" />
    <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge&labelColor=111111" alt="License" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Firebase-12-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase" />
    <img src="https://img.shields.io/badge/Vercel-Serverless-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
  </p>
</div>

---

<div align="center">
  <h2>✨ Features em Destaque</h2>
</div>

<table>
  <tr>
    <td align="center" width="25%">
      <br />🔄<br /><strong>Ciclo Completo</strong><br />
      <sub>Do lead ao pós-venda, sem trocar de ferramenta</sub>
    </td>
    <td align="center" width="25%">
      <br />💳<br /><strong>Power Checkout</strong><br />
      <sub>Cliente se cadastra, paga e inicia o projeto sozinho</sub>
    </td>
    <td align="center" width="25%">
      <br />🏢<br /><strong>Multi-Tenant</strong><br />
      <sub>Uma instalação, infinitas organizações isoladas</sub>
    </td>
    <td align="center" width="25%">
      <br />🎉<br /><strong>Gamificação</strong><br />
      <sub>Confetes e celebrações automáticas de aniversário</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <br />🎧<br /><strong>Gestão de Suporte</strong><br />
      <sub>CSAT, SLA, Atribuição e Dashboard de Qualidade</sub>
    </td>
    <td align="center">
      <br />📊<br /><strong>BI Financeiro</strong><br />
      <sub>DRE, Fluxo, Budget e Alertas de Inadimplência</sub>
    </td>
    <td align="center">
      <br />🧬<br /><strong>People & Culture</strong><br />
      <sub>Férias, Onboarding, PDI e eNPS Anônimo</sub>
    </td>
    <td align="center">
      <br />📖<br /><strong>Wiki Hub</strong><br />
      <sub>Central de conhecimento com editor rico e RBAC</sub>
    </td>
  </tr>
</table>

---


## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Módulos da Plataforma](#-módulos-da-plataforma)
- [Identidade Visual — Dark Absolute](#-identidade-visual--dark-absolute)
- [Stack Tecnológica](#-stack-tecnológica--arquitetura)
- [Arquitetura de Dados](#-arquitetura-de-dados-firestore-schema)
- [Endpoints da API (Serverless)](#-endpoints-da-api-serverless)
- [Sistema RBAC — Cargos e Permissões](#-sistema-rbac--cargos-e-permissões)
- [Pipeline CI/CD](#-pipeline-cicd)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Estrutura de Diretórios](#-estrutura-de-diretórios)
- [Guia de Contribuição](#-guia-de-contribuição)
- [Roadmap](#-roadmap)
- [Licença](#-licença)

---

## 🚀 Visão Geral

O **Hub Central** é mais do que um CRM — é um ecossistema ponta a ponta projetado para **agências digitais, empresas SaaS e prestadores de serviço** que buscam profissionalismo, escala e automação real.

A plataforma cobre o ciclo de vida completo do cliente:

```
Prospecção → Qualificação → Venda → Onboarding → Entrega → Suporte → Retenção → Expansão
```

### Diferenciais Competitivos

| Diferencial | Descrição |
|---|---|
| 🔄 **Ciclo Completo** | Do lead ao pós-venda em uma única plataforma |
| 🏢 **Multi-Tenant** | Isolamento total de dados por organização |
| 💳 **Checkout Self-Service** | Cliente se auto-cadastra, paga e inicia o projeto |
| 📊 **BI Financeiro & Health** | DRE, Fluxo e **Health Score (0-100)** automático |
| 🎧 **SLA Tracker** | Monitoramento de suporte em tempo real com alertas |
| 📱 **Atendimento Ativo** | Abertura rápida de chamados via WhatsApp com busca preditiva |
| 💰 **Calculadora de Comissões** | Automação de repasses para vendedores pós-pagamento |
| 🎉 **Gamificação** | Celebração automática de aniversários com confetes |
| 🌐 **100% Cloud-Native** | Zero infraestrutura para manter |

---

## 🛠️ Módulos da Plataforma

### 🏗️ 1. Funil de Vendas & CRM (Leads Pipeline)

Gestão intuitiva de leads com pipeline visual em **Kanban** ou **Lista**, atribuição de responsáveis, e conversão direta em clientes com sincronização financeira.

- **Pipeline Visual (Kanban)**: Arraste leads entre estágios (`Novo` → `Em Contato` → `Proposta Enviada` → `Negociação` → `Convertido` / `Perdido`).
- **Atribuição Inteligente**: Cada lead pode ser atribuído a um SDR ou Executive específico.
- **Conversão Direta**: Um clique transforma o lead em cliente ativo, sincronizando dados com Asaas automaticamente.
- **Filtros e Busca**: Pesquisa em tempo real por nome, CPF, e-mail ou status.
- **Timeline de Atividades (Bussiness Intelligence)**: Histórico atômico dentro de cada lead. Registra Notas, Chamadas, Reuniões e mudanças de status com carimbo de data, hora e responsável.
- **Lembretes de Follow-up (Sales Ops)**: Campo "Próximo Contato" com lógica de cores. Leads com follow-up atrasado brilham em vermelho no Kanban, enquanto próximos contatos aparecem em azul.
- **Isolamento Comercial**: SDRs e Executives visualizam **apenas seus próprios leads**, enquanto Gerentes e Admins possuem visão global do pipeline.
- **Segmentação por Etiquetas (Tags)**: Classificação granular de leads com cores personalizadas para identificar nichos, urgências ou origens específicas diretamente no Kanban.

---

### 📋 2. CRM & Gestão de Clientes Ativos

Gestão centralizada da base de clientes com automação financeira e segmentação avançada.

- **Segmentação Estratégica**: Sistema de etiquetas (Tags) unificado entre Funil e Dashboard para categorização de clientes (ex: VIP, Risco, Projeto Especial).
- **Filtragem Dinâmica**: Dashboard com filtros em tempo real por Status, Tag e Ordenação.

---

### 💳 2. Power Checkout — Checkout Público & Onboarding Automatizado

Um fluxo de auto-atendimento completo que permite ao cliente se cadastrar, enviar briefing, assinar contrato e pagar — tudo sem intervenção manual.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  📝 Dados   │ →  │  📋 Briefing │ →  │  ✍️ Contrato │ →  │  💳 Pagamento│
│  Pessoais   │    │  + Uploads   │    │  Digital     │    │  Asaas       │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

- **Multi-Etapas com Validação**: Formulário progressivo com validação Zod em cada passo.
- **Coleta de Briefing Dinâmica**: Perguntas customizáveis (texto, textarea, select, upload de arquivo) configuradas pelo admin.
- **Upload de Logos e Ativos**: Envio direto de arquivos multimídia na etapa de briefing.
- **Assinatura Digital**: Aceite eletrônico com registro de IP, User-Agent e carimbo de data/hora.
- **Integração Asaas**: Criação automática de cliente, assinatura recorrente (Mensal/Anual) e geração de link de pagamento (PIX, Boleto, Cartão).
- **Link Público Personalizado**: Cada organização possui sua URL única (`/contratar/{orgId}`).

---

### 🖥️ 3. Portal do Cliente (Self-Service)

Área exclusiva para cada cliente com visibilidade total do projeto, faturas e comunicação.

- **Timeline de Projeto**: Barra de progresso visual com etapas personalizáveis (Design, Desenvolvimento, Revisão, Deploy, etc.).
- **Central de Pagamentos**: Histórico completo de faturas com status em tempo real (Pago, Pendente, Vencido) + links diretos para PIX/Boleto.
- **Central de Chamados**: Abertura e acompanhamento de tickets de suporte com histórico.
- **Pesquisa CSAT (Customer Satisfaction)**: Avaliação de satisfação do cliente disparada após a resolução de um chamado técnico, utilizando uma escala visual de 1 a 5 estrelas.
- **Programa de Indicações**: Sistema completo de referral marketing com geração de códigos, rastreamento e recompensas.
- **Pesquisa CSAT Automática**: Ao concluir um chamado no suporte, o cliente é convidado a avaliar o atendimento (1-5 estrelas + comentário).
- **Avisos Globais**: Comunicados configuráveis pelo admin exibidos no topo do portal (recesso, atualizações, novidades).

---

### 📈 4. Analytics & Business Intelligence

Dashboard analítico completo para tomada de decisão baseada em dados.

- **Health Score Automatizado (0-100)**: Cálculo multidimensional que avalia a saúde temporal e financeira da conta em tempo real.
  - **Lógica Matemática do Health Score**: Base zero que soma até 100 pontos baseados em estado de sucesso.
    - `40 pontos`: Cliente "Ativo". (Desenvolvimento rende 30. Inadimplente/Cancelado rendem 0).
    - `30 pontos`: Pagamento Asaas "RECEIVED". (Pendente rende 15. Atrasado rende 0).
    - `30 pontos`: Rate percentual (`%`) de etapas concluídas no portal vs total de etapas.
    - `Ajuste CSAT / NPS Interno`: Bônus/Penalidade dinâmica extra baseada no histórico de feedbacks estruturados da conta.
- **Matriz de Risco Crítico**: Indicadores de cor (`Emerald` >= 80, `Amber` >= 50, `Rose` < 50) para detecção proativa de churn.
- **KPIs em Tempo Real**: MRR, ARR, Churn Rate, LTV, CAC e taxa de conversão.
- **Análise de ROI por Oferta**: Módulo especializado que cruza o investimento em Ads (Meta/Google) com a receita direta gerada por cada produto, calculando lucratividade real e CAC.
- **Dashboard de Tendências**: Gráficos interativos em Recharts com filtros por período.
- **Distribuição de Receita**: Análise granular por plano e canal de aquisição.

---

### 💰 5. Gestão Financeira (FinOps)

Módulo financeiro completo com 6 sub-abas especializadas:

| Sub-módulo | Descrição |
|---|---|
| **Resumo Operacional** | MRR, Despesas, Lucro e **Alertas de Inadimplência Crítica** |
| **DRE Gerencial** | Demonstração de Resultados (Entradas vs Saídas) com gráficos de barras |
| **Inadimplência Crítica** | Módulo de detecção imediata de clientes com faturas em atraso (OVERDUE) ou status devedor. |
| **Fluxo de Caixa** | Projeção cronológica baseada no vencimento das assinaturas |
| **Orcamento (Budget)** | Planejamento por categoria com indicadores de saúde orçamentária |
| **ROI por Oferta** | **Inteligência de Tráfego:** Performance de Ads (Investimento vs Retorno) por produto |
| **Comissões** | Controle automático de comissões de SDRs e Closers com cálculo de repasse |
| **Rentabilidade por Cliente** | Cálculo de lucro isolado por contrato, deduzindo custos diretos e comissões |
| **Conciliação OFX** | Importação de extratos bancários para validação de saldo |
| **Categorias** | Gerenciamento de categorias de receita e despesa |

---

### 📅 6. Agenda Central

Calendário integrado com prazos de entrega, datas de pagamento e eventos operacionais vinculados aos clientes.

---

### 🎧 8. Gestão de Suporte de Elite (Support Desk)

Sistema de atendimento profissional focado em SLAs e qualidade perceptível.

- **Dashboard de SLA Tracker**: Painel executivo no topo da visão que categoriza chamados em 4 estados críticos:
  - 🔴 **Atrasados**: Prazo de resposta expirado (Animação *Pulse*).
  - 🟠 **Vencendo Agora**: Menos de 2 horas para o limite (Efeito *Glow*).
  - 🔵 **Em Alerta**: Menos de 6 horas para o limite.
  - 🟢 **No Prazo**: Dentro dos parâmetros contratuais.
- **Abertura Rápida de Chamados Internos**: Interface otimizada com busca preditiva de clientes, auto-preenchimento de dados e integração com a Wiki Hub para respostas ágeis.
- **Modo Nota (Timeline)**: Permite registrar interações do WhatsApp diretamente no histórico do cliente sem a necessidade de abrir um ticket técnico.
- **Ordenação por Prioridade de SLA**: Sistema inteligente que reorganiza a fila de atendimento priorizando tickets próximos do vencimento ou com maior urgência (`Alta` > `Média` > `Baixa`).
- **Cálculo de SLA Dinâmico**: Lógica baseada em Horas Úteis com prazos diferenciados por prioridade.
- **CSAT (Customer Satisfaction Score)**: Ciclo fechado de feedback. Após a conclusão, o cliente avalia o atendimento com estrelas (1-5) e feedback textual.
- **Visibilidade Restrita de Performance**: Médias de satisfação individuais protegidas por RBAC, visíveis apenas para lideranças de CS/Suporte.

---

### 📧 8. Automação de Comunicação (E-mails Transacionais)

Sistema de notificações via **Resend SDK** com anti-spam inteligente:

| Template | Gatilho |
|---|---|
| 🎉 **Boas-vindas** | Novo cliente criado via Checkout |
| 📄 **Fatura Gerada** | Webhook Asaas `PAYMENT_CREATED` |
| ✅ **Pagamento Recebido** | Webhook Asaas `PAYMENT_RECEIVED` |
| ⚠️ **Fatura Vencida** | Webhook Asaas `PAYMENT_OVERDUE` |
| 🔗 **Link de Assinatura** | Criação de assinatura recorrente |
| 🎂 **Aniversário** | Gatilho diário Vercel Cron (08:00 AM) |

- **Controle de Idempotência**: Prevenção total de disparo duplicado via registro atômico no Firestore.
- **Rate Limiting**: Proteção contra abuso via Upstash Redis.

---

### 👥 9. People & Culture — Ecossistema de Talentos (v2.4)

- v2.4.2 (People & Culture RBAC Hardening)
- v2.4.3 (Wiki Hub Redesign & Beginner's Guide Config)
- v2.4.4 (Full Width Wiki & Smart Client Creation RBAC)

Módulo completo de People Management focado em retenção, felicidade e controle patrimonial da equipe.

- **Matriz de Competências (Skill Radar Chart)**: Gestão 360º de habilidades. Soft Skills geridas globalmente pelo Admin e Hard Skills 100% customizáveis por colaborador.
- **Ecossistema de Saúde & Dashboard**: Monitoramento diário de energia e humor com visualização agregada para liderança e alertas de bem-estar automáticos.
- **Onboarding Inteligente**: Filtragem avançada que oculta talentos que já concluíram 100% das tarefas de entrada, mantendo o foco nos novos colaboradores.
- **Gestão de Inventário & Ativos**: Controle patrimonial seguro (Laptops, Periféricos, Acessos) vinculado diretamente ao perfil do colaborador, com restrição de criação/exclusão apenas para gestores.
- **Mural de Feedbacks & Reconhecimento**: Espaço para cultura de feedback e reconhecimento público, integrado com o ecossistema de cultura da empresa.
- **Jornada do Colaborador (Career Path)**: Linha do tempo visual com marcos históricos (Hired, Promotion, Certification, Birthday) gerenciado com exclusividade pela liderança.
- **Plano de Desenvolvimento (PDI)**: Árvore de competências e ações de curto/médio prazo. O gerenciamento e atualização da matriz de competências é restrito a Admins, Gerentes e People & Culture, e não pode ser realizado pelo próprio colaborador em seu próprio perfil (Auto-gestão restrita).
- **Férias & Ausências**: Fluxo completo de solicitação, aprovação e histórico de períodos de descanso.
- **eNPS Anônimo**: Termômetro de fidelidade e satisfação interna baseado na métrica clássica de promotoria, com dashboard de sentimentos anônimos.
- **Gamificação (Aniversários)**: Celebração visual automática no dia do nascimento com animação de partículas (confetes).
- **Checklists Interativos**: Trilhas de onboarding personalizáveis por usuário com acompanhamento de progresso em tempo real.
- **RBAC Robusto**: Todas as ações sensíveis (Ativos, PDI, Carreira, Clima) possuem travas de segurança que exigem permissões de Administrador, Gerente ou People & Culture.

---

### 📖 10. Wiki Hub — Central de Conhecimento (v2.5)

Sistema completo de base de conhecimento interna para documentação de processos, cultura e guias técnicos.

- **Editor WYSIWYG Profissional**: Interface amigável para criação de artigos com suporte a formatação rica, links e carregamento de imagens via ImgBB.
- **Sincronização Reativa (v2.5.1)**: Sistema de notificações de leitura atualizado em tempo real via `onSnapshot`, garantindo que badges de novos artigos sumam instantaneamente após a leitura.
- **Guia do Iniciante Configurável**: Possibilidade de definir um artigo mestre para onboarding de novos colaboradores, acessível com um clique no topo da Wiki.
- **Controle de Acesso Granular (RBAC)**: Definição de visibilidade por Cargo (Role) ou por Usuários específicos.
- **Categorização Estratégica**: Organização por áreas (RH, Vendas, Técnico, Atendimento, Suporte, Geral).
- **Interatividade Total**: Sistema de curtidas (Estrelas) e seção de comentários com tempo real para tirar dúvidas e enriquecer o conteúdo.
- **Busca Global**: Filtro inteligente que pesquisa no título e no corpo dos manuais instantaneamente.
- **Integração com Atendimento Proativo**: Busca integrada durante a abertura de chamados para cópia rápida de manuais de suporte.
- **Moderação de Conteúdo**: Ferramentas de edição e exclusão de comentários e artigos para administradores e gerentes.

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
| **Testes** | Vitest | 3.x | Unit testing |
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

## 🔐 Sistema RBAC — Cargos e Permissões

O Hub Central implementa **Role-Based Access Control (RBAC)** com 13 cargos especializados e controle granular por módulo.

### Matriz de Permissões Completa

| Módulo | 👑 Admin | 💼 Gerente | 👤 P&C | 🎯 SDR | 🤝 Exec | 🟢 CS | 🔧 Onboard | 🛠️ Suporte | 💰 FinOps | 📊 Ctrl | 📈 RevOps | 💳 Fatur. | 👁️ Leitura |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Funil (Leads) | ✅ | ✅ | — | ✅¹ | ✅¹ | — | — | — | — | — | — | — | — |
| Notificações | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — | — |
| Chamados | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Agenda | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | — | — | — | — | — |
| Financeiro | ✅ | ✅ | — | — | — | — | — | — | ✅ | ✅ | ✅ | ✅ | — |
| Indicações | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Avisos | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — |
| Produtos | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| Monitoramento | ✅ | ✅ | — | — | — | — | — | ✅ | — | — | — | — | — |
| **Mapa** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Equipe | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| **Configurações** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> ¹ **SDR e Executive**: Visualizam apenas leads/clientes **atribuídos a si próprios** (`assignedTo === user.uid`).

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
| 🔍 **Lint Check** | `lint-check.yml` | Push/PR → `main` | `tsc --noEmit` — Type checking |
| 🏗️ **Build Check** | `build-check.yml` | Push/PR → `main` | `vite build` — Validação de build |
| 🧪 **Test Check** | `test-check.yml` | Push/PR → `main` | `vitest run` — Unit tests |
| 🔒 **Firebase Rules** | `firebase-rules.yml` | Push → `main` | Deploy de Firestore Rules |
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
| `npm run lint` | Type-checking completo (`tsc --noEmit`) |
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
  <strong>Hub Central v2.0.0-rc1</strong>
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
