# 📊 Financeiro Inteligente (BI): Decisões Baseadas em Dados

O módulo Financeiro BI do HubCRM transforma números em inteligência de negócio. Ele permite que gestores identifiquem onde a empresa ganha dinheiro, onde gasta demais e como está a saúde do modelo de recorrência (SaaS).

## 🗂️ As Abas de Poder Financeiro

### 1. Resumo Corporativo e BI de Clientes
Nesta tela, o sistema cruza o MRR (Receita) com os Custos Diretos e o **CSP (Rateio de Infraestrutura)** para entregar a lucratividade real por cliente.
- **CSP Unitário**: Calculado dividindo os custos de infraestrutura (servidores, ferramentas globais) pelo número de clientes ativos.
- **Markup**: Indica quantas vezes o valor cobrado cobre o custo (ex: 2.5x).
- **Margem Real**: O percentual líquido que sobra após todas as deduções e rateios.

### 2. DRE Gerencial (Demonstrativo do Resultado do Exercício)
Uma tabela completa com visão mensal e anual das:
- **Receitas**: Brutas e deduções de taxas de gateway (Asaas).
- **Despesas**: Divididas por categorias (Folha, Impostos, Marketing, Ferramentas).
- **Lucro Líquido**: A linha final do seu negócio mês a mês.

### 3. Fluxo de Caixa Projetado
Um gráfico de tendência que permite visualizar o saldo futuro da empresa com base nos vencimentos agendados, permitindo antecipar necessidades de caixa.

### 4. Orçamento (Budget)
Área para definir limites de gastos por categoria. 
- O sistema monitora o consumo em tempo real.
- **Saúde do Orçamento**: Indica qual percentual da verba planejada já foi consumida.
- **Alertas**: O sistema avisa se um novo lançamento exceder o limite mensal de uma categoria.

---

## 📈 Métricas SaaS (Base do Modelo Recorrente)

Este painel é exclusivo para análise de escala:
- **LTV (Lifetime Value)**: O ranking dos clientes que mais trouxeram dinheiro para a empresa durante todo o tempo de contrato.
- **Churn Rate (30 dias)**: O percentual de perda de clientes no último mês. Um termômetro vital para a sustentabilidade do negócio.
- **Sugestões de Growth**: IA financeira que sugere ações baseadas nas margens (ex: "Considere reajuste no Plano X, pois a margem está abaixo de 15%").

---

## 💸 Como Lançar Despesas Corretamente

Para que o BI funcione, toda despesa deve ser categorizada:
1. Clique em **Novo Lançamento**.
2. Preencha **Descrição** e **Valor**.
3. Selecione a **Categoria** (Folha, Infraestrutura, etc).
4. **Categoria "Infraestrutura"**: Essencial para o cálculo automático do CSP Unitário.

---

## 💡 Dicas de Especialista

> [!TIP]
> **Use o Markup para precificar.** Se o seu Markup em um cliente está abaixo de 2x, você provavelmente está cobrando pouco ou o serviço está exigindo infraestrutura demais. O ideal em serviços de alta margem é situar-se acima de 3x.

> [!IMPORTANT]
> **O Churn Rate ideal é abaixo de 5% ao mês.** Se o dashboard indicar um aumento nesta métrica, verifique imediatamente o módulo de Suporte e Projetos para identificar falhas na entrega ou satisfação.

---

### Links Relacionados
- [Faturamento e Cobranças](./Financeiro_Billing.md)
- [Gestão de Operação](./Operacao_Projetos.md)
- [Dashboard Geral](./Dashboard.md)
