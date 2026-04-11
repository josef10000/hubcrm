# 🛡️ Matriz de Acessos e Permissões - Hub Central v1.7.0

Este documento detalha o que cada cargo pode visualizar e quais ações pode realizar dentro da plataforma. O HubCRM utiliza um sistema de **Controle de Acesso Baseado em Função (RBAC)** altamente granulado.

---

## 🔝 1. Liderança e Gestão Master

### **Administrador (Founder)** & **Gerente**
*O nível mais alto de privilégio, com autonomia total sobre o ecossistema.*
- **Visão**: Total (Mapa, Leads, Faturamento, Equipe).
- **Poderes**: Convidar/Remover membros, alterar qualquer cargo, gerenciar configurações de checkout e financeira.

### **People & Culture** (RH Moderno)
*Focado no bem-estar e organização do time.*
- **Especialidade**: Gestão da aba **Equipe**, Aniversários e Organograma.
- **Acessos**: Dashboard, Notificações, Mapa, Indicações e Configurações de Aparência.
- **Restrição**: Não visualiza Gestão de Custos ou Analytics Financeiro.

---

## 📈 2. Braço Comercial (Vendas)

### **SDR (Sales Development Rep)**
*Qualificação de novos leads.*
- **Foco**: Funil de Vendas (Prospects Iniciais) e Produtos.
- **Restrição**: Visualiza apenas os leads atribuídos ou marcados como novos.

### **Executive (Closer)**
*Fechamento de propostas de alto valor.*
- **Foco**: Funil de Vendas (Fase de Negociação/Fecho) e Catálogo de Produtos.
- **Restrição**: Privacidade total — não enxerga leads de outros executivos.

---

## 🤝 3. Pós-Vendas e Operações

### **Customer Success (CS)**
*Garantir que o cliente atinja seus objetivos.*
- **Acessos**: Mapa de Clientes, Agenda, Chamados e Produtos.
- **Missão**: Monitorar a saúde da carteira e evitar churn.

### **Onboarding Specialist**
*Implementação técnica e briefing inicial.*
- **Acessos**: Chamados (específicos de implementação), Agenda e Produtos.
- **Missão**: Tirar o projeto do papel após o pagamento.

### **Suporte Técnico**
*Resolução de bugs e infraestrutura.*
- **Foco**: **Monitoramento (Uptime)** e Chamados Técnicos.
- **Acessos**: Agenda e Mapa para intervenções locais.

---

## 💰 4. Braço Financeiro & Operações de Receita

### **FinOps / Controladoria / Revenue Ops**
*Os guardiões da saúde financeira.*
- **Acessos**: **Gestão de Custos**, Analytics Financeiro e Avisos.
- **Financeiro**: Controle de recebíveisAsaas e despesas operacionais.
- **Restrição**: Não acessam o Funil de Vendas ou Gestão de Pessoas (Equipe).

---

## 👁️ 5. Outros Perfis

### **Só Leitura**
- Acesso contemplativo ao Mapa e Dashboard básico. Não pode criar, editar ou apagar nenhum dado.

---

### 💡 Resumo de Segurança
> **Acesso Universal**: Independentemente do cargo, todos têm acesso ao **Mapa de Clientes** e às **Configurações Pessoais** (para alteração de cores do sistema e saída), fomentando uma cultura de visão estratégica compartilhada.
