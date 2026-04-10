# HubCRM - Gestão de Clientes e Automação de Onboarding

<div align="center">
  <img src="https://i.imgur.com/2H9UPAW.png" alt="HubCRM Logo" width="300" />
  <p><em>Sua solução completa para gestão de leads, clientes e faturamento automatizado.</em></p>
</div>

---

## 🚀 Sobre o Projeto

O **HubCRM** é uma plataforma robusta projetada para simplificar o ciclo de vida do cliente, desde a prospecção inicial até a entrega do projeto e faturamento recorrente. Integrado nativamente com **Asaas** e **Resend**, o sistema automatiza cobranças, notificações e o processo de onboarding, permitindo que você foque no que realmente importa: o crescimento do seu negócio.

## ✨ Principais Funcionalidades

### 🛒 Checkout Público & Onboarding
- **Página de Vendas Pública**: Link exclusivo para contratação direta de planos e serviços.
- **Briefing Dinâmico**: Formulário de perguntas personalizável via painel administrativo.
- **Coleta de Ativos**: Suporte para upload de logos e imagens do site durante o cadastro.
- **Assinatura Digital**: Etapa de aceite de contrato integrada ao fluxo de pagamento, baseada em cláusulas customizáveis.

### 💰 Gestão Financeira (Asaas)
- **Integração Nativa**: Sincronização em tempo real com o Asaas para gestão de clientes, faturas e assinaturas.
- **Cobranças Automáticas**: Suporte a pagamentos únicos, assinaturas mensais e planos anuais com desconto.
- **Webhook Inteligente**: Processamento automatizado de eventos de pagamento (criação, confirmação, atraso).

### 📧 Automação de E-mails (Resend)
- **Fluxos Transacionais**: Envio automático de e-mails de boas-vindas, faturas emitidas e avisos de vencimento.
- **Gatilhos Manuais**: Possibilidade de disparar notificações específicas diretamente do card do cliente.
- **Templates Profissionais**: Uso do Resend para entrega garantida e design elegante dos e-mails.

### 📊 Painel Administrativo
- **Gestão de Leads**: Funil de vendas intuitivo para acompanhamento de prospecções.
- **Monitoramento de Projetos**: Acompanhamento de etapas e entregas de cada cliente.
- **Métricas Financeiras**: Gráficos de faturamento, churn e saúde financeira do negócio.

## 🛠️ Stack Técnica

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Framer Motion.
- **Backend (Serverless)**: Vercel Functions (Node.js/TypeScript).
- **Banco de Dados**: Firebase Firestore.
- **Armazenamento**: Firebase Storage (para documentos e logos).
- **Integrações**:
  - **Asaas**: API de pagamentos e assinaturas.
  - **Resend**: Serviço de e-mail transacional.
  - **Upstash Redis**: Rate limiting e segurança da API.

## ⚙️ Configuração Local

### Pré-requisitos
- Node.js (v18+)
- Conta no Firebase, Asaas e Resend.

### Instalação
1. Clone o repositório:
   ```bash
   git clone https://github.com/josef10000/hubcrm.git
   cd hubcrm
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   Crie um arquivo `.env` baseado no `.env.example`:
   ```env
   # Firebase
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...

   # Asaas
   ASAAS_API_KEY=...
   ASAAS_WEBHOOK_TOKEN=...

   # Resend
   RESEND_API_KEY=...

   # Upstash
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

4. Execute o ambiente de desenvolvimento:
   ```bash
   npm run dev
   ```

## 📁 Estrutura de Pastas

```text
├── api/                # Cloud Functions (Vercel)
│   ├── _logic/         # Lógica de negócio (Asaas, Email)
│   └── _utils/         # Utilitários (Firebase Admin, Helpers)
├── src/                # Frontend React
│   ├── components/     # Componentes reutilizáveis
│   ├── contexts/       # Contextos (Auth, CRM, UI)
│   ├── hooks/          # Hooks personalizados
│   ├── services/       # Clientes de API e Firebase
│   └── views/          # Páginas principais
└── public/             # Ativos estáticos
```

## 📄 Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).

---
<div align="center">
  Desenvolvido com ❤️ para otimizar negócios.
</div>
