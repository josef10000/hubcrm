# Investimentos nas Finanças Pessoais

## Cotações

Ativos podem receber um ticker da B3, quantidade e preço médio por unidade. A tela Patrimônio apresenta o valor da posição, a variação diária informada pela fonte e o resultado total em relação ao custo cadastrado. O restante do patrimônio continua podendo ser atualizado manualmente.

As cotações são solicitadas pelo servidor à brapi.dev. Elas não são em tempo real: a modalidade gratuita pode apresentar atraso (aproximadamente 30 minutos). A tela usa cache compartilhado de 30 minutos e a atualização é iniciada pelo usuário.

## Proteção da cota gratuita

- Configure `BRAPI_API_KEY` como variável de ambiente secreta no deploy do servidor; a chave nunca é enviada ao navegador.
- O servidor registra as consultas em `marketQuoteUsage/{AAAA-MM}` por transação Firestore antes da chamada externa.
- O teto global é 4.000 tentativas por mês UTC, abaixo das 15.000 requisições/mês anunciadas pela brapi.dev para o plano gratuito. A margem também cobre um ciclo de até 31 dias que atravesse três meses UTC: no máximo 12.000 tentativas. O contador inclui falhas e não reinicia por usuário.
- Quando o teto é alcançado, o servidor bloqueia novas consultas até o próximo mês. O cache compartilhado evita novas consultas para o mesmo ticker durante 30 minutos.

## Fonte

- [Planos e limite mensal da brapi.dev](https://brapi.dev/faq/)
- [Frequência/atraso das atualizações](https://brapi.dev/faq/qual-a-frequencia)
- [Exemplo oficial de consulta](https://brapi.dev/docs/examples/typescript)
