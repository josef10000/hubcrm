# Hub Central - Ecossistema Completo de Gestão e Onboarding

<div align="center">
  <img src="https://i.imgur.com/EFBaYb5.png" alt="Hub Central Logo" width="300" />
  <p><em>By Hub Symples - Transformando prospecção em faturamento através de automação inteligente e gestão de alta precisão.</em></p>
  
  <p>
    <img src="https://img.shields.io/badge/Version-1.5.0-orange" alt="Version" />
    <img src="https://img.shields.io/badge/License-MIT-blue" alt="License" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css" alt="Tailwind" />
  </p>
</div>

---

## 🚀 A Visão do Projeto

O **Hub Symples** não é apenas um CRM; é um ecossistema ponta a ponta projetado para empresas que buscam profissionalismo e escala. Ele cobre desde a prospecção inicial (Leads), passa por um processo de onboarding automatizado com contrato e pagamento, e termina em um Portal do Cliente robusto com suporte, indicadores de satisfação e programa de recompensas.

## 🛠️ Módulos de Alta Performance

### 🏗️ 1. Funil de Vendas & CRM
Gestão intuitiva de leads com status dinâmicos. Acompanhe a jornada do prospect até a conversão definitiva.
- **Status Customizáveis**: Adapte as etapas do funil ao seu processo comercial.
- **Conversão Direta**: Transforme leads em clientes com um clique, sincronizando dados financeiros.

### 💳 2. Checkout Público & Onboarding Automatizado
O "Power Checkout" permite que o cliente se auto-cadastre e inicie o projeto imediatamente.
- **Multi-Etapas**: Fluxo otimizado (Dados -> Briefing -> Contrato -> Pagamento).
- **Assinatura Digital**: Sistema integrado de aceite de contrato baseado em IP e carimbo de data/hora.
- **Coleta Multimídia**: Upload múltiplo de logos e ativos do site diretamente no onboarding.
- **Automação de Planos**: Integração profunda com Asaas para criação de assinaturas (In-App).

### 🖥️ 3. Portal do Cliente (Self-Service)
Uma área exclusiva para cada cliente, acessível via link único, aumentando a transparência e fidelidade.
- **Timeline de Projeto**: Barra de progresso visual das etapas (Design, Dev, Revisão, etc).
- **Central de Pagamentos**: Histórico completo de faturas, links de boleto/PIX e status em tempo real.
- **Support & Ticket**: Sistema de abertura de chamados com histórico de conversas.
- **Satisfação (NPS)**: Pesquisa automática de satisfação após a conclusão do projeto.
- **Referral Program**: Sistema "Indique e Ganhe" com bônus acumulados ou descontos automáticos na assinatura.

### 📈 4. Finanças & Business Intelligence
Painel completo para controle de caixa e saúde do negócio (Churn, LTV, ROI).
- **Fluxo de Caixa**: Gestão de entradas (pagamentos Asaas) e saídas (despesas operacionais).
- **Orçamentos & Metas**: Visualize se o faturamento está atingindo o Break Even ou batendo recordes.

### 🛰️ 5. Monitoramento de Serviços (Uptime API)
Integração nativa para monitoramento de infraestrutura.
- **Real-time Status**: Verifique se os sites e serviços dos clientes estão online.
- **Dashboard de Latência**: Métricas de tempo de resposta integradas diretamente no CRM.
- **Powered by UptimeRobot**: Sincronização automática via API para monitoramento 24/7.

### 📧 6. Automação de Comunicação (Resend)
Sistema de notificações transacionais que mantém o cliente informado sem esforço manual.
- **Boas-vindas Inteligente**: Envio com link de pagamento e boas-vindas logo após o setup.
- **Alertas de Faturas**: Notificações de pagamento recebido, fatura emitida e avisos de atraso.
- **Gatilhos Manuais**: Central de notificações para disparar e-mails específicos de suporte ou financeiro com um clique.

## ⚙️ Stack Tecnológica & Arquitetura

- **Arquitetura Multi-Tenant**: Isolamento total de dados por organização via subcoleções estruturadas no Firestore. Cada empresa possui seu próprio contexto de dados, configurações e portais.
- **Frontend**: React 19 (Hooks, Context API) utilizando Vite como build tool.
- **Estilização**: Tailwind CSS 4.0 para uma interface moderna, responsiva e performática.
- **Backend (Serverless)**: Vercel Functions rodando lógica em Node.js e TypeScript.
- **Database**: Firebase Firestore (NoSQL) para persistência escalável e em tempo real.
- **Segurança & Rate Limit**: Upstash Redis garantindo a integridade dos endpoints de pagamento.
- **Providers**: Asaas (Pagamentos), Resend (Transactional Emails), UptimeRobot (Monitoring).

## 🔐 Segurança & Controle de Acesso (RBAC)

O ecossistema utiliza um sistema de permissões granulado para garantir que cada membro da equipe acesse apenas o necessário:

- **👑 Administrador**: Controle total sobre a organização, finanças, configurações globais e gestão de equipe.
- **💼 Gerente**: Acesso administrativo completo, incluindo gestão de produtos e leads.
- **🛠️ Suporte Técnico**: Focado na execução técnica e criação de sites. Acesso a Clientes, Monitoramento, Mapa e Agenda, sem acesso ao Pipeline de Vendas.
- **🤝 Vendedor**: Gestão de leads próprios e agora com acesso à criação de **Produtos** para agilizar o fechamento de propostas.
- **👁️ Só Leitura**: Permite auditoria completa do sistema sem permissão para criar, editar ou excluir registros.

## 🔨 Configuração e Instalação

### Pré-requisitos
- Node.js instalado (v18 recomendada).
- Git para controle de versão.

### Passos Rápidos
1. Clone este repositório:
   ```bash
   git clone https://github.com/josef10000/hubcrm.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure o arquivo `.env`:
   Use o `.env.example` como base e preencha as chaves do Firebase, Asaas, Resend e Upstash.

4. Acesse o ambiente de dev:
   ```bash
   npm run dev
   ```

## 📄 Licença

Este projeto é open-source sob a [Licença MIT](LICENSE) em nome de **Hub Symples**.

---
<div align="center">
  🚀 <strong>Hub Central</strong>: Modernidade, Automação e Foco em Resultados.
</div>
