# Guia de modularidade e qualidade do Hub Central

Este documento define como novas funcionalidades devem entrar no Hub Central e como as áreas existentes devem ser evoluídas sem aumentar o acoplamento. Ele complementa `ARCHITECTURE.md`: a arquitetura descrita ali é a direção desejada; o repositório ainda está em migração e contém pontes e módulos legados.

## 1. Princípios obrigatórios

1. **Cada domínio é dono de suas regras e dados.** CRM, financeiro, chat, portal, Office e demais áreas não devem alterar diretamente o estado interno de outro domínio.
2. **A interface apresenta e coleta dados; serviços executam casos de uso.** Regras de negócio não ficam escondidas em componentes de milhares de linhas.
3. **Contratos explícitos nas fronteiras.** Entradas externas e persistidas são validadas; valores desconhecidos não viram `any`.
4. **Servidor é autoridade para operações privilegiadas.** Identidade, organização, permissões, pagamentos, comissões e estados de assinatura são confirmados no backend.
5. **Acesso sempre começa fechado.** Regras do Firestore e rotas da API concedem somente as operações e campos necessários.
6. **Uma fonte de verdade por dado.** A interface pode manter cache e projeções, mas não deve duplicar o registro financeiro ou a autoridade de permissões.
7. **Mudanças pequenas, reversíveis e observáveis.** Migre um fluxo de cada vez, mantenha compatibilidade deliberada e registre mudanças de contrato.

## 2. Limites entre módulos

Estrutura recomendada para uma área nova ou uma refatoração vertical:

```text
src/domains/<dominio>/
  components/       # peças de interface reutilizadas dentro do domínio
  views/            # páginas e composição da interface
  hooks/            # estado de tela e coordenação de casos de uso
  services/         # casos de uso e coordenação do domínio
  repositories/     # acesso a Firestore/API, quando houver complexidade suficiente
  entities/         # tipos e invariantes próprios do domínio
  schemas/          # validação de entradas e contratos do domínio
  index.ts          # API pública mínima do domínio
```

Use somente a API pública de outro domínio, por exemplo `@finance` ou `@crm`. Não importe arquivos internos como `@crm/components/...` de outro domínio. Se uma capacidade precisa ser compartilhada, exponha uma função ou contrato estável ou mova somente o conceito realmente genérico para `src/shared`.

`src/core` contém capacidades transversais (autenticação, permissões, navegação, eventos e administração). `src/shared` contém componentes e utilitários sem regra de negócio específica. Não use `shared` como depósito de lógica que ainda não tem dono.

### Dependências permitidas

- `app` pode compor domínios e encaminhar rotas.
- Um domínio pode depender de `core` e `shared`.
- Um domínio não deve depender dos detalhes internos de outro domínio.
- O acesso a APIs externas fica em adaptadores de serviço no backend ou em serviços do domínio; componentes não chamam provedores diretamente.
- Dependências circulares entre domínios são proibidas. Extraia o contrato comum ou inverta a dependência com um evento/callback tipado.

## 3. Fluxo padrão de dados

### Frontend

```text
View/Component → Hook de tela → Caso de uso do domínio → Serviço/API/Firestore
```

- Uma view não concentra consulta, validação, política de acesso, transformação financeira e interação visual.
- Use React Query para consultas remotas com cache e invalidação explícita; use Zustand para estado compartilhado de interface que precisa persistir entre telas.
- Se o dado é de servidor, não mantenha duas cópias independentes no Zustand e no React Query.
- Use `authFetch` para endpoints autenticados e uma função de cliente HTTP público para endpoints públicos. Não espalhe `fetch` cru nos componentes.
- Retorne estados claros: carregando, sucesso vazio, erro recuperável e acesso negado.

### Backend

```text
Handler fino → validação Zod → autenticação/autorização → caso de uso → adaptador externo/repositório
```

- O handler valida método e formato, chama um caso de uso e converte erros conhecidos em respostas HTTP.
- O caso de uso não depende de React nem de detalhes de apresentação.
- O Admin SDK só é usado depois de validar identidade, organização e autorização no backend.
- Credenciais nunca vão para o bundle do browser, logs ou repositório.
- Operações financeiras e de pagamento devem ser idempotentes e registradas com origem, ID externo e estado confirmado pelo provedor.

## 4. Dados, tenant e segurança

- Toda leitura ou mutação de dados empresariais valida `orgId` no servidor ou nas regras. Não confie em `orgId`, `role`, `permissions`, `clientId`, valor, estado ou IDs enviados pelo browser.
- Campos de identidade, organização, cargo, permissões, saldo, pagamento, aprovação, comissão e auditoria são controlados por backend ou por uma regra administrativa explícita.
- Para portal público, prefira endpoint que valida um token forte e devolve uma projeção com apenas os campos necessários. Nunca libere o documento inteiro de cliente apenas para mostrar alguns campos.
- Tokens públicos devem ser aleatórios, revogáveis, comparados no servidor, limitados ao escopo do recurso e nunca tratados como autorização para alterar campos arbitrários.
- Nas regras do Firestore, cada operação declara `get`, `list`, `create`, `update` e `delete` separadamente quando a política for diferente. Cada `update` limita campos alteráveis e valida o estado anterior e posterior.
- Lembrete: várias cláusulas `allow` correspondentes são combinadas com **OR**. Uma regra permissiva não é reduzida por outra regra mais restrita.
- Webhooks são entradas não confiáveis: valide autenticação/assinatura quando disponível, confirme estado via API do provedor quando necessário, deduplique eventos e aplique transições de estado válidas.
- Não grave dados sensíveis em logs; não devolva stack traces ou mensagens internas ao cliente.

## 5. Tipagem e contratos

- TypeScript deve operar em modo estrito. Evite introduzir `any`, `as any`, `@ts-ignore` ou conversões sem validação.
- Dados vindos do Firestore, URL, formulário, webhook e API são `unknown` até serem validados com Zod ou um parser equivalente.
- Compartilhe contratos em `shared` somente quando frontend e backend realmente precisarem do mesmo formato. Tipos específicos continuam no domínio dono.
- Não use tipos do Firestore como modelo de domínio sem conversão. Converta timestamps, campos opcionais e registros antigos na fronteira.
- Mudanças em contratos persistidos devem ser compatíveis com registros antigos ou incluir migração e fallback documentados.

## 6. Desempenho e experiência

- Faça consultas direcionadas e paginadas; evite carregar coleções inteiras para filtrar no browser.
- Use `onSnapshot` somente para telas que precisam de atualização em tempo real e sempre cancele listeners no cleanup.
- Evite iniciar várias consultas de domínios diferentes por meio de um hook global usado por toda tela.
- Mantenha seletores Zustand pequenos, memoize transformações caras e divida páginas extensas em componentes com responsabilidade clara.
- Imagens passam por armazenamento autorizado, validação de tipo e tamanho, nomes não previsíveis quando necessário e compressão adequada.
- Toda interação deve funcionar por teclado, respeitar `prefers-reduced-motion` e ter rótulos acessíveis.

## 7. Como tratar simulação e dados reais

- Dados financeiros e de vendas são reais quando a fonte conectada é real; não os substitua por valores de demonstração.
- Simulações devem estar explicitamente identificadas e isoladas do modelo real, com origem e estado visíveis.
- A futura integração de agentes deve consumir um contrato de eventos/tarefas. O Office não será a fonte de verdade do trabalho do agente; ele apenas apresenta o estado publicado pelo serviço de execução.
- Integrações futuras (VPS, modelos, mensageria) entram por adaptadores, sem acoplar o domínio a um fornecedor específico.

## 8. Padrão de testes e verificações

Toda implementação nova deve acrescentar verificações proporcionais ao risco:

- Regra de negócio pura: testes unitários do caso de uso.
- Firestore/API: testes de contrato, autorização, campos permitidos, falhas e duplicidade.
- Fluxos financeiros: cenários de idempotência, estorno, webhook repetido e conciliação.
- Regra do Firestore: Firebase Emulator com usuários de organizações e papéis distintos; testar leitura e escrita permitidas e negadas.
- Interface: testar estados de carregamento, erro, vazio e ação principal quando houver lógica relevante.

Não considere uma verificação manual no browser substituta de um teste de segurança. Não publique regras permissivas temporárias em produção.

## 9. Checklist antes de concluir uma implementação

- [ ] A funcionalidade está no domínio que é dono da regra e dos dados?
- [ ] A nova dependência usa a API pública do módulo, sem import interno cruzado?
- [ ] A view ficou focada em apresentação e coordenação?
- [ ] Entradas externas e dados persistidos são validados e tipados?
- [ ] A autorização é verificada no servidor/regras, não apenas escondida na interface?
- [ ] As regras limitam operações e campos, inclusive para clientes do portal?
- [ ] Há tratamento de duplicidade, falha parcial e retry onde existe integração?
- [ ] Dados financeiros reais não se misturam com dados simulados?
- [ ] Há teste/checagem compatível com o risco e instrução de migração quando necessário?
- [ ] O README do módulo e `.agents/MEMORIES.md` foram atualizados se houve mudança arquitetural?

## 10. Migração do código existente

O código existente não precisa ser reescrito de uma vez. Ao tocar uma área:

1. identifique o caso de uso e os dados que pertencem a ele;
2. extraia a regra para um serviço pequeno com contrato tipado;
3. faça a view consumir o serviço sem alterar o comportamento visual;
4. mova a persistência para uma fronteira de repositório/API quando isso reduzir acoplamento ou fechar uma falha de segurança;
5. substitua imports cruzados por uma API pública do domínio;
6. remova a ponte antiga quando nenhum consumidor depender dela;
7. documente o que ainda é legado e o próximo passo de migração.

Não crie abstrações genéricas sem dois casos de uso reais. O objetivo é reduzir dependências e tornar a regra verificável, não multiplicar arquivos por padrão.

## 11. Estado atual e ordem de evolução

Este repositório ainda não pode ser descrito honestamente como nota 9/10 em todas as dimensões. A configuração global do TypeScript não ativa `strict`; o script `npm run lint` executa somente `tsc --noEmit` e não é um linter; `CRMContext` continua sendo uma ponte de compatibilidade sem contrato tipado; existem componentes e serviços grandes, imports cruzados entre domínios e avisos de bundles grandes na compilação.

Use a seguinte ordem para elevar a qualidade sem interromper o produto:

1. **Segurança e isolamento** — corrija primeiro regras abertas, permissões sem vínculo ao `orgId`, campos de identidade editáveis pelo próprio usuário e operações públicas sem validação. Mudanças em `firestore.rules` devem ter cenários permitidos e negados no Firebase Emulator antes do deploy.
2. **Contratos e tipagem** — tipar a ponte do CRM e os limites de Firestore/API, resolver erros de dados legados, então ativar `strict` por novos módulos ou projetos de referência antes de aplicar à aplicação inteira.
3. **Separação de módulos** — migrar casos de uso para serviços do domínio, trocar imports internos por APIs públicas e retirar a ponte global apenas quando seus consumidores tiverem sido migrados.
4. **Manutenção das telas** — quebrar as maiores views por fluxo e responsabilidade, mantendo comportamento, rotas e persistência; cada extração deve ser pequena e passível de revisão.
5. **Desempenho** — usar o relatório de produção para escolher os próximos chunks, retirar dependências carregadas por telas sem uso e medir consultas/listeners em fluxos reais. Não aumente limites de warning para esconder bundles grandes.
6. **Qualidade automatizada** — separar lint, typecheck, build e testes no CI; exigir testes de autorização no Emulator para regras e APIs que leem ou alteram dados de clientes.

### Situação registrada nesta revisão

- As regras de permissão agora comparam a organização do perfil à organização solicitada, e o perfil de cliente não lê perfis internos da organização.
- O cadastro próprio não pode promover o perfil, trocar sua organização ou editar permissões e campos de folha; convites deixam de ser graváveis pelo cliente diretamente.
- A leitura pública ampla de clientes e chamados foi removida. Briefing e assinatura de contrato passam por endpoints com Zod e token do próprio cadastro; chamado público recebe checagem do token e da titularidade do chamado.
- O cliente autenticado só pode atualizar o conjunto `plans` do próprio cadastro no fluxo atual do checkout; novos campos do cliente devem entrar por API validada e não por uma ampliação genérica das regras.
- Chamadas WebRTC continuam restritas aos participantes e validam transições de estado e campos mutáveis. A Arena, partidas, torneios, Trivia e loja de recompensas foram removidos do produto; seus documentos antigos ficam preservados, sem acesso pelas regras atuais.
- As regras ainda precisam ser exercitadas no Firebase Emulator com usuários de organizações e papéis diferentes. Nesta revisão o emulador não iniciou porque o download do binário foi bloqueado com HTTP 403; por isso, as regras não foram verificadas em runtime e não devem ser tratadas como prontas para deploy sem essa etapa.
- Permanecem superfícies públicas a revisar, incluindo leitura de configurações públicas, ofertas e assets compartilhados. A revisão desta rodada não declara o conjunto inteiro de regras como fechado.
- O build de produção aponta chunks acima de 1 MB no app principal (1,025 kB) e no editor Canvas (1,590 kB). São prioridades de medição e divisão de carregamento, sem invalidar o lazy loading já existente das rotas.
- `npm run lint` (que executa `tsc --noEmit`) e `npm run build` passaram após a remoção da Arena. O build ainda sinaliza imports estáticos/dinâmicos mistos para Firebase e helpers.

Essa lista é o ponto de partida para priorizar trabalho; não substitui métricas de incidentes, tempo de carregamento, erros de produção e regressões observadas por versão.
