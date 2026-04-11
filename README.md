# Hub Central - Ecossistema Completo de Gestão e Onboarding

<div align="center">
  <img src="https://i.imgur.com/EFBaYb5.png" alt="Hub Central Logo" width="300" />
  <p><em>By Hub Symples - Transformando prospecção em faturamento através de automação inteligente e gestão de alta precisão.</em></p>
  
  <p>
    <img src="https://img.shields.io/badge/Version-1.7.0-orange" alt="Version" />
    <img src="https://img.shields.io/badge/License-MIT-blue" alt="License" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css" alt="Tailwind" />
  </p>
</div>

---

## 🚀 Visão do Projeto

O **Hub Central** não é apenas um CRM; é um ecossistema ponta a ponta projetado para agências, SaaS e prestadores de serviço que buscam profissionalismo e escala. Ele cobre desde a prospecção inicial (Leads), passa por um processo de onboarding automatizado com contrato e pagamento, e termina em um Portal do Cliente robusto com suporte, indicadores de satisfação e programa de recompensas.

## 🛠️ Módulos de Alta Performance

### 🏗️ 1. Funil de Vendas & CRM
Gestão intuitiva de leads com status dinâmicos e pipeline visual (Kanban).
- **Status Customizáveis**: Adapte as etapas do funil ao seu processo comercial.
- **Conversão Direta**: Transforme leads em clientes com um clique, sincronizando dados financeiros com Asaas.

### 💳 2. Checkout Público & Onboarding Automatizado ("Power Checkout")
O "Power Checkout" permite que o cliente se auto-cadastre e inicie o projeto imediatamente.
- **Multi-Etapas**: Fluxo otimizado (Dados -> Briefing -> Contrato -> Pagamento).
- **Assinatura Digital**: Sistema integrado de aceite de contrato baseado em IP e carimbo de data/hora.
- **Coleta Multimídia**: Upload múltiplo de logos e ativos diretamente no onboarding.
- **Automação de Planos**: Integração profunda com Asaas para criação de assinaturas recorrentes.

### 🖥️ 3. Portal do Cliente (Self-Service)
Uma área exclusiva para cada cliente, aumentando a transparência e fidelidade.
- **Timeline de Projeto**: Barra de progresso visual das etapas (Design, Dev, Revisão, etc).
- **Central de Pagamentos**: Histórico de faturas, links de boleto/PIX e status em tempo real.
- **Support & Ticket**: Sistema de abertura de chamados com histórico.
- **Satisfação (NPS)**: Pesquisa automática de satisfação e Programa de Indicação.

### 📈 4. Finanças & Business Intelligence
Painel completo para controle de caixa e saúde do negócio (Churn, LTV, ROI).

### 🛰️ 5. Monitoramento de Serviços
Integração nativa com **UptimeRobot** para verificar status e latência dos sites dos clientes 24/7.

### 📧 6. Automação de Comunicação
Sistema de notificações transacionais via **Resend** (boas-vindas, alertas de faturas e avisos de atraso).

### 👥 7. Gestão de Equipe & Hierarquia (Team Management)
Visualização clara e profissional da estrutura organizacional.
- **Organograma Dinâmico**: Visualização em árvore da hierarquia da empresa.
- **Perfis Profissionais**: Páginas de perfil customizáveis com bio, cargo e links sociais.
- **Reporting Lines**: Definição manual de superiores imediatos para controle de gestão.
- **Segurança de Edição**: Regras rígidas que permitem edição apenas pelo próprio usuário ou administradores.

### 🎨 8. Personalização & Cultura (Nível Premium)
Experiência de uso elevada com foco no bem-estar e engajamento da equipe.
- **Sistema de Temas Dinâmicos**: Aplicação de cores globais (Laranja, Azul, Roxo, etc.) que alteram toda a identidade do CRM instantaneamente.
- **Celebração de Aniversários**: Detecção automática de aniversariantes com explosão de confetes 🎉, mensagens personalizadas e ícones festivos na barra lateral.
- **Interface Viva**: Micro-animações com Framer Motion e feedback visual de alto nível.

### 🗺️ 9. Democratização de Dados
- **Mapa Global**: Acesso ao mapa de clientes liberado para todos os níveis da equipe, fomentando a visão estratégica.
- **Configurações Granulares**: Acesso ao painel de configurações para todos, permitindo ajustes de aparência pessoal, mantendo seções críticas (financeiro/checkout) restritas a administradores.

---

## ⚙️ Stack Tecnológica & Arquitetura

| Camada              | Tecnologia                                      |
|---------------------|-------------------------------------------------|
| **Frontend**        | React 19 + TypeScript + Vite + Context API      |
| **Estilização**     | Tailwind CSS 4.0                                |
| **Backend**         | Vercel Serverless Functions (Node.js + TS)      |
| **Banco de Dados**  | Firebase Firestore (NoSQL) + Realtime           |
| **Rate Limiting**   | Upstash Redis                                   |
| **Pagamentos**      | Asaas (API + Webhooks)                          |
| **E-mails**         | Resend SDK                                      |
| **Monitoramento**   | UptimeRobot API                                 |

**Arquitetura Multi-Tenant**: Isolamento total de dados por organização via subcoleções estruturadas no Firestore. Cada empresa possui seu próprio contexto de dados, configurações e portais.

---

## 🏗️ Arquitetura de Dados (Firestore Schema)

- `profiles/{userId}`: Dados globais do usuário (nome, e-mail, foto, **role**, **orgId**, **jobTitle**, **reportsTo**).
- `organizations/{orgId}`: Documento mestre da empresa.
  - `organizations/{orgId}/settings/preferences`: Configurações de branding e APIs.
  - `organizations/{orgId}/clients/{clientId}`: Base de clientes sincronizada.
  - `organizations/{orgId}/offers/{offerId}`: Catálogo de produtos.

## 🔐 Segurança & Controle de Acesso (RBAC)

O ecossistema utiliza um sistema de permissões granulado:
- **👑 Administrador**: Controle total global e financeiro.
- **💼 Gerente**: Acesso administrativo e gestão de produtos.
- **🛠️ Suporte Técnico**: Focado em execução (Produtos, Clientes, Monitoramento).
- **🤝 Vendedor**: Leads próprios e criação de produtos.
- **👁️ Só Leitura**: Auditoria sem permissão de edição.

---

## 🔨 Configuração e Instalação

### Pré-requisitos
- Node.js instalado (v20+ recomendado).
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
   Copie o `.env.example` para `.env.local` e preencha as chaves do Firebase, Asaas, Resend e Upstash.
   Copie o `.env.example` para `.env.local` e preencha as chaves:
   ```env
   VITE_FIREBASE_API_KEY= # Chave de acesso ao Firebase
   VITE_ASAAS_API_KEY=    # Token de integração com Asaas
   VITE_RESEND_API_KEY=   # Chave da API de e-mails
   UPSTASH_REDIS_URL=     # URL do banco Redis para Rate Limiting
   ```

4. Acesse o ambiente de dev:
   ```bash
   npm run dev
   ```

## 📄 Licença
Este projeto é open-source sob a [Licença MIT](LICENSE).

---
<div align="center">
  🚀 <strong>Hub Central</strong>: Modernidade, Automação e Foco em Resultados.
</div>
