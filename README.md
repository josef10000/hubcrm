# Hub Central - Ecossistema Completo de Gestão e Onboarding

**Hub Symples** — Transformando prospecção em faturamento através de automação inteligente e gestão de alta precisão.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/josef10000/hubcrm/blob/main/LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)

---

## Visão do Projeto

O **Hub Central** não é apenas um CRM. É um ecossistema **ponta a ponta** projetado para agências, SaaS e prestadores de serviço que precisam de profissionalismo e escala.

Ele cobre desde a captação de leads, passando por onboarding automatizado com assinatura digital e pagamento recorrente, até um Portal do Cliente self-service completo.

### Principais Módulos

### 1. Funil de Vendas & CRM
- Gestão de leads com status dinâmicos e customizáveis
- Conversão de lead → cliente com um clique (sincronização automática com Asaas)
- Pipeline visual (Kanban)

### 2. Checkout Público & Onboarding Automatizado ("Power Checkout")
- Fluxo multi-etapa: Dados → Briefing → Contrato → Pagamento
- **Assinatura digital** com registro de IP + carimbo de data/hora
- Upload múltiplo de logos e ativos do cliente
- Criação automática de assinaturas recorrentes no Asaas
- Automação completa de boas-vindas via Resend

### 3. Portal do Cliente (Self-Service)
- Timeline visual de progresso do projeto
- Central de pagamentos com histórico completo (boleto, PIX, cartão)
- Sistema de tickets de suporte
- Pesquisa automática de satisfação (NPS)
- Programa de indicação ("Indique e Ganhe")

### 4. Finanças & Business Intelligence
- Fluxo de caixa integrado com Asaas
- Métricas de Churn, LTV, ROI e Break Even
- Dashboard financeiro completo

### 5. Monitoramento de Serviços
- Integração nativa com **UptimeRobot**
- Status em tempo real de sites e serviços dos clientes
- Dashboard de latência e uptime

### 6. Automação de Comunicação
- Integração com **Resend** (e-mails transacionais)
- Gatilhos automáticos e manuais
- Alertas de faturas, atrasos e onboarding

---

## 🛠️ Stack Tecnológica

| Camada              | Tecnologia                                      |
|---------------------|-------------------------------------------------|
| **Frontend**        | React 19 + TypeScript + Vite + Context API      |
| **Estilização**     | Tailwind CSS 4.0                                |
| **Backend**         | Vercel Serverless Functions (Node.js + TS)      |
| **Banco de Dados**  | Firebase Firestore (NoSQL) + Realtime           |
| **Autenticação**    | Firebase Auth                                   |
| **Rate Limiting**   | Upstash Redis                                   |
| **Pagamentos**      | Asaas (clientes, assinaturas, webhooks)         |
| **E-mails**         | Resend                                          |
| **Monitoramento**   | UptimeRobot API                                 |
| **Deploy**          | Vercel                                          |
| **Testes**          | Vitest                                          |

**Arquitetura**: Multi-tenant completa com isolamento de dados por organização (empresa/tenant) via Firestore.

---

## 🔐 Segurança & Controle de Acesso (RBAC)

Sistema de permissões granulares (Role-Based Access Control):

- **Administrador** — Controle total (finanças, configurações, gestão de equipe)
- **Gerente** — Acesso administrativo completo (produtos, leads, relatórios)
- **Suporte Técnico** — Produtos, Clientes, Monitoramento, Mapa, Agenda (sem acesso ao pipeline de vendas)
- **Vendedor** — Leads próprios + criação de Produtos para agilizar propostas
- **Só Leitura** — Auditoria completa (sem criar/editar/excluir)

**Recursos implementados**:
- Convites para equipe com detecção automática de "ghost invites"
- Remoção de membros com opção de limpeza de dados
- Restrições baseadas em roles no frontend e backend
- Arquitetura multi-tenant com isolamento por `empresaId`

---

## 🚀 Como rodar localmente

### Pré-requisitos
- Node.js ≥ 20 (recomendado)
- Conta Firebase (Firestore + Auth)
- Chaves API: Asaas, Resend, Upstash Redis, UptimeRobot (opcional)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/josef10000/hubcrm.git
cd hubcrm

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite o .env.local com suas chaves
Variáveis principais (veja .env.example):

Firebase config (VITE_FIREBASE_*)
VITE_ASAAS_API_KEY
VITE_RESEND_API_KEY
VITE_UPSTASH_REDIS_URL

Bash# 4. Rode em desenvolvimento
npm run dev
Acesse: http://localhost:5173

Configuração do Firebase

Regras de segurança estão em firestore.rules
Índices em firestore.indexes.json
Recomendação forte: revise as rules antes de produção para garantir isolamento multi-tenant e RBAC


Roadmap (principais próximos passos)

 Notificações push (Firebase Cloud Messaging)
 Relatórios avançados com gráficos
 Integração WhatsApp Business API
 Dark mode completo
 Exportação de dados (PDF/Excel)
 Melhoria nas regras de segurança com Custom Claims


Contribuindo
Contribuições são bem-vindas!

Faça um fork do projeto
Crie uma branch para sua feature (git checkout -b feature/nova-funcionalidade)
Commit suas mudanças (git commit -m 'feat: adiciona ...')
Push para a branch (git push origin feature/nova-funcionalidade)
Abra um Pull Request

Veja também o arquivo email_integration_guide.md para detalhes sobre automação de e-mails.

Licença
Este projeto está licenciado sob a Licença MIT — veja o arquivo LICENSE para mais detalhes.

Feito com ❤️ no Brasil 🇧🇷
Autor: José (josef10000)
Quer ajudar? Abra uma Issue ou Pull Request!
<div align="center">
  🚀 <strong>Hub Central</strong>: Modernidade, Automação e Foco em Resultados.
</div>
