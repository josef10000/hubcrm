# <p align="center">🔐 HUB CENTRAL — INTELLIGENCE ECOSYSTEM</p>

<p align="center">
  <img src="https://img.shields.io/badge/Enterprise_OS-v8.1.6-3b82f6?style=for-the-badge&labelColor=0a0a0a" alt="Version" />
  <img src="https://img.shields.io/badge/Architecture-Collaboration_Bots-blueviolet?style=for-the-badge&labelColor=0a0a0a" alt="Architecture" />
  <img src="https://img.shields.io/badge/Status-Pro_Collaboration-emerald?style=for-the-badge&labelColor=0a0a0a" alt="Status" />
</p>

<p align="center">
  <i>"Transformando prospecção em faturamento através de engenharia de dados e automação de alta fidelidade."</i> ✨
</p>

---

## 💎 A Visão Hub Symples
O **Hub Central** não é apenas uma intranet; é o sistema operacional da Hub Symples. Projetado sob a estética **Dark Absolute** e fundamentado em **Glassmorphism**, ele une beleza e potência para entregar uma experiência de gestão sem precedentes.

### 🌌 Ecossistema de 4 Pilares
Nossa arquitetura descentralizada garante que cada cargo (dos 13 níveis sistêmicos) tenha exatamente o que precisa para vencer.

| Pilar | Foco Estratégico | Tecnologias Chave |
| :--- | :--- | :--- |
| **🚀 COMERCIAL** | Conversão & Growth | Pipeline Kanban, Propostas One-Click, WhatsApp Sync |
| **🛠️ OPERAÇÃO** | Delivery & SLA | Hub Canvas, Pulse Red Alerts, Central de Contratos |
| **💰 FINANCEIRO** | Profit & Runway | Billing Automático (Asaas), DRE Realtime, BI Executivo |
| **🤝 PESSOAS** | Cultura & Retenção | Skill Radar, People Analytics, Celebração Gamificada |

---

## ✨ Estrela da Versão: Hub Architecture v8.1.0 (Modular Evolution)
O **Hub Central v8.1** consolida a transição para uma plataforma enterprise, focando em **desacoplamento total** e **integridade de dados industrial**.

### 🏗️ Pilares Técnicos
- **Event-Driven Architecture:** Implementação de um `EventBus` centralizado. Módulos agora se comunicam via eventos (`lead.created`, `invoice.paid`), eliminando dependências circulares.
- **Domain Integrity (Zod):** Camada de Entidades robusta. Todo dado que flui pelo sistema é validado em runtime por schemas Zod, garantindo 100% de segurança contra `undefined`.
- **Infrastructure Decoupling:** Serviços de Auditoria, Logs e Notificações agora são ouvintes (listeners) passivos, tornando o core de negócio mais limpo e rápido.
- **Design System Tokens:** Consolidação do padrão **Dark Absolute** via `HUB_TOKENS`, garantindo consistência visual em todo o ecossistema Glassmorphism.

> [!TIP]
> Confira as [Diretrizes de Engenharia](ENGINEERING_GUIDELINES.md), o novo [Guia de Arquitetura e Padronização](ARCHITECTURE.md) e a [Evolução de Arquitetura](ARCHITECTURE_EVOLUTION.md) para detalhes sobre os novos padrões.

---

## 📚 Wiki Central Pro
A base de conhecimento da Hub Symples, agora com rastreamento inteligente.

*   **Read Tracking:** Notificações em tempo real para novos artigos com persistência de leitura vinculada ao perfil.
*   **Nexus Binding:** Artigos podem ser vinculados a obras na Nexus Library para aprofundamento técnico.
*   **Interaction Loop:** Sistema de estrelas (favoritos) e comentários com suporte a menções.
*   **Access Control:** Filtros por cargo (RBAC) para garantir que cada setor veja o conteúdo pertinente.

---

## 💬 Hub Chat Pro v3.5 (Optimistic UI)
A comunicação interna elevada ao nível de ferramenta de trabalho, agora com **Zustand**.

*   **Optimistic Updates:** Feedback instantâneo no envio de mensagens antes mesmo da confirmação da rede.
*   **Canais Temáticos:** Salas públicas e privadas com suporte a **HubBots**.
*   **Context Linking:** Cards ricos que conectam conversas diretamente a clientes no CRM.
*   **Controle Anti-Ruído:** Menções inteligentes (`@Financeiro`, `@Diretoria`), threads e reações jumbo.
*   **Aprovações Nativas:** Autorize fluxos comerciais diretamente da conversa.

---

## 🛠️ Stack de Alta Performance

Construído para escala infinita e latência zero, o Hub Central adota tecnologias Serverless e Bancos de Dados em Tempo Real para garantir sincronização instantânea em qualquer lugar do mundo.

- **Frontend Core**: React 19 + Vite 6
- **Architecture & State**: Zustand 5.0 (Gestão Global) + TypeScript 5.8 (Estrita Segurança de Tipos)
- **Design System & UI**: Tailwind CSS 4.0 + Framer Motion (Glassmorphism & Dark Absolute Identity)
- **Database & Auth**: Firebase Firestore (Realtime NoSQL) e Firebase Authentication
- **Edge Computing & API**: Vercel Serverless Functions
- **Integrações de Parceiros**: Asaas (Gateway de Pagamentos) e Resend (Disparo de E-mails)

---

## 🏗️ Documentação da API e Arquitetura do Backend

Para entender profundamente como o Firebase se conecta com as APIs Serverless (Asaas, Webhooks, CRON Jobs) e para debugar problemas no fluxo de dados, confira a nossa documentação técnica dedicada:

👉 **[Ver Documentação Completa da Arquitetura (API_ARCHITECTURE.md)](API_ARCHITECTURE.md)**

Neste documento você encontrará:
- O ciclo de vida do Webhook de Pagamentos.
- Modelos completos do Firestore (Clientes, Transações, Users).
- Guia definitivo de Troubleshooting.

---

> [!CAUTION]
> **PROPRIEDADE INTELECTUAL HUB SYMPLES LTDA**
> Este software é proprietário e seu uso é restrito a colaboradores autorizados. A distribuição não autorizada é estritamente proibida e sujeita a penalidades legais.

<p align="center">
  <sub>Hub Central © 2026 — Desenvolvido com ❤️ pela equipe de Engenharia.</sub>
</p>
