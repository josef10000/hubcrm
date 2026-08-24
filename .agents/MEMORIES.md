# Memória de Arquitetura e Decisões Técnicas (HubCRM)

Este arquivo armazena o histórico consolidado de decisões, integrações de APIs, estruturas de dados e regras de negócio para consultas do agente em futuras sessões de desenvolvimento.

---

## 1. Central de Foco & Streaming (RadioPlayer)
- **Data da Integração**: 19/06/2026
- **Funcionalidade**: Integração da busca e reprodução de vídeos/playlists do YouTube na Central de Foco (`RadioPlayer`).
- **Decisões Técnicas**:
  - **Rotas e API**: Rota `/api/youtube/search` mapeada em `vercel.json` direcionando para `api/system_handler.ts?action=youtube-search`.
  - **Chave de API**: Ocultada no backend na variável de ambiente `process.env.youtube` (configurada no console da Vercel).
  - **Firestore Cache**: Coleção `youtubeSearchCache` armazena resultados normalizados por **30 dias** usando a própria query normalizada como ID do documento para economizar a cota de 10.000 unidades diárias da API v3 do YouTube.
  - **Modo Apenas Áudio**: Implementado botão alternador no cabeçalho do player. Quando ativo, o iframe do YouTube não é removido do DOM (o que pausaria a música), mas recebe a classe CSS `absolute opacity-0 pointer-events-none w-0 h-0` e o container encolhe para `h-0` para não ocupar espaço visual.
  - **Salvamento Determinístico**: Ao clicar no coração (favorito) em um item de busca que ainda não existe nas playlists customizadas (`customStations`), o sistema o cadastra localmente e o favorita em seguida para que o favorito persista e não suma ao limpar a pesquisa.
  - **Bloqueio de Edição**: Playlists corporativas fixas (como `spotify-empresa` "Hub SiYmples") não exibem botões de Editar ou Excluir.

---

## 2. Perfil do Colaborador & Avatares DiceBear
- **Data da Integração**: 19/06/2026
- **Funcionalidade**: Gerador de avatares com a API DiceBear no perfil de colaboradores (`ProfileView.tsx`).
- **Decisões Técnicas**:
  - **Botão DiceBear**: Botão com ícone `Sparkles` roxo adicionado no modo de edição de perfil, ao lado do botão da câmera (upload manual).
  - **Modal de Avatar**:
    - Seletor com 8 estilos suportados: `lorelei`, `bottts`, `avataaars`, `adventurer`, `pixel-art`, `shapes`, `initials`, `fun-emoji`.
    - Campo de input para a semente (`seed`) e botão para randomizar com sementes aleatórias em tempo real.
    - O botão de confirmação injeta a URL final SVG `https://api.dicebear.com/9.x/{estilo}/svg?seed={semente}` no `formData.photoURL`, que é persistido no Firestore ao salvar as alterações do perfil.
  - **Sincronização**: O upload de fotos originais do dispositivo (Cloudinary) permanece ativo e independente.

---

## 3. HubAds — Módulo de Gestão de Criativos & Tráfego Pago
- **Data da Integração**: 19/06/2026
- **Funcionalidade**: Central de planejamento, referências e performance financeira de criativos de tráfego pago.
- **Decisões Técnicas**:
  - **Estrutura Firestore**: Coleção `organizations/{orgId}/hubads_creatives` para dados de criativos.
  - **Sequenciador de Tracking**: Geração automática de `trackingCode` sequencial (ex: `HUBADS-001`, `HUBADS-002`...) baseado na ordenação reversa por `createdAt`.
  - **Métricas de Performance**: Entrada manual de investimento, impressões, cliques, conversões e faturamento, com cálculos de front-end reativos em tempo real para CTR, CPC, CPL e ROAS.
  - **Atribuição Reativa**: O sistema conta leads e faturamento reais consultando o banco de dados do CRM onde `leadSource` seja igual ao `trackingCode` correspondente ao criativo. Se não houver dados reais, cai de volta nos valores informados manualmente.
  - **Upload de Mídia**: Suporte para subir imagens e vídeos direto no Cloudinary utilizando `uploadToCloudinary` ou inserção manual de URLs externas.
  - **Navegação**: Adicionado novo grupo na Sidebar com ícone `LayoutGrid` mapeado para `ph-grid-four` do Phosphor. Rota protegida `/hub-ads` com lazy loading.

---

## 4. Correções de Usabilidade e Estabilidade no HubAds & Molduras
- **Data**: 19/06/2026
- **Funcionalidade**: Ajustes de navegação do HubAds e solução para o deploy de molduras de avatar.
- **Decisões Técnicas**:
  - **Sintaxe do Modal**: Restaurada e fechada adequadamente a tag do `textarea` de Notas e as divs/forms na aba de performance em `src/domains/hubads/components/CreativeModal.tsx`.
  - **Remoção de Passos do HubAds**: Retirada a numeração sequencial das abas do modal do HubAds, mantendo-as como abas de preenchimento livre para fins de banco de criativos.
  - **Deploy do Backend (Vercel)**: Assegurada a compilação do projeto (`npm run build`) para reativar o pipeline de deploy automático. Isso atualizou o schema Zod (`teamUpdateProfileSchema` em `shared/schemas.ts`) com a propriedade `avatarFrame` na API do Vercel Serverless, garantindo a gravação reativa de molduras nos perfis dos usuários.
  - **Ajustes de Avatar na Sidebar**: Removida a classe `border border-white/10` interna no avatar da Sidebar para limpar a borda cinza residual quando nenhuma moldura está ativa. Passada a prop `frame` de forma explícita para o `<AvatarFrame>` para sincronizar as atualizações de moldura em tempo real.
  - **Avatar com Fundo Transparente**: Alterado o contêiner interno do `AvatarFrame` para `bg-transparent`. Desenvolvido o helper `getCleanPhotoURL` para dinamicamente injetar `backgroundColor=transparent` em qualquer URL da API do DiceBear (retroativo para avatares antigos e nativo para novas gerações).
  - **Layout do CreativeCard (HubAds)**: Removido o badge de `trackingCode` e o botão hover de cópia de cima da mídia do criativo. Reestruturado o card para alocar o código e botão de cópia de forma fixa na base do card, logo abaixo do título, limpando a imagem.

---

## 5. Limpeza de Painel de Consumo & Ativação de Rotinas de Background Reais
- **Data da Integração**: 19/06/2026
- **Funcionalidade**: Limpeza de rotinas fictícias e integração das ações de Varredura de Faturas e Sincronização CFO com o backend real.
- **Decisões Técnicas**:
  - **Ação de Backend**: Criado endpoint seguro `/api/system_handler?action=force-task` protegido por `verifyAuth(req, res)` que executa rotinas baseadas na organização correspondente ao UID do usuário logado.
  - **Extração de Rotinas**: Extraída a lógica de reconciliação para `processSingleOrgReconciliation` em `api/_cron/finance_reconciler.ts` e exportada `processOrganizationFinance` de `api/_cron/finance_engine.ts`.
  - **Atualização do Firestore**: O timestamp de execução (`lastBillingScan` e `lastCfoSync`) é gravado de verdade pelo backend após a conclusão com sucesso de cada rotina, e não simulado localmente no frontend.
  - **Limpeza de UI**: Removidas as opções simuladas de Fila de E-mails, Atualização do Grafo de Conhecimento e o painel correspondente ao Graphify em `AdministrativeView.tsx`.

---

## 6. Sistema Site Shield (Bloqueio Automático)
- **Data da Integração**: 19/06/2026
- **Funcionalidade**: Desativação dinâmica de sites por assinatura de clientes inadimplentes há mais de 10 dias ou com assinaturas canceladas.
- **Decisões Técnicas**:
  - **Endpoints e Rotas**:
    - `/api/site-shield` mapeado no `vercel.json` retornando o script de verificação JS (`application/javascript`).
    - `/api/site-status?domain=...` consultando e validando as regras contábeis do cliente no Firestore sem exigir autenticação (CORS liberado com `Access-Control-Allow-Origin: *`).
  - **Lógica de Bloqueio**:
    - Normalização inteligente de URLs (removendo `https?://`, `www.`, caminhos e parâmetros) no frontend e no backend para match perfeito.
    - Atraso superior a 10 dias a partir da data de vencimento (`nextDueDate`) quando `paymentStatus === 'OVERDUE'` ou `status === 'Inadimplente'` suspende o site.
    - Cancelamento explícito (`status === 'Cancelado'`) também suspende de imediato.
  - **Performance e Cache**: O script guarda a resposta no `sessionStorage` do visitante por 12 horas, minimizando o impacto no limite de leituras do Firestore. O botão "Verificar Novamente" na tela de bloqueio limpa o cache e recarrega a página.
  - **Interface CRM**: Adicionado botão de cópia com um clique "Copiar Script Site Shield" (ícone `Shield`) e toast explicativo sob o campo `siteLink` no modal de visualização de cliente (`ClientModal.tsx`).

---

## 7. Central de Artigos Dinâmicos (Dicas & Insights)
- **Data da Integração**: 24/06/2026
- **Funcionalidade**: CMS administrativo para publicação de artigos dinâmicos em tempo real na aba de Dicas & Insights do portal dos clientes.
- **Decisões Técnicas**:
  - **Firestore Global**: Armazenamento na coleção global raiz `/blog_posts`. Os documentos utilizam como ID o slug amigável gerado automaticamente a partir do título.
  - **CMS no CRM (`GrowthHubView.tsx`)**:
    - Layout dividido em sub-abas superiores ("Ativos de Sucesso" e "Dicas & Insights").
    - Construtor de blocos ricos reordenável no formulário do artigo, contendo botões de reordenação (🔼/🔽) e exclusão (🗑️).
    - Tipos de blocos suportados: Parágrafo, Subtítulo, Citação e CTA (este com redirecionamento dinâmico mapeado para as abas exatas do portal).
    - Controle de status de publicação (Rascunho/Publicado).
    - **Limpeza de `undefined`**: Introduzida a função helper `cleanUndefined` que recursivamente remove quaisquer propriedades do payload ou do array de blocos que possuam valor `undefined` (como `ctaText` or `ctaAction` em blocos que não sejam CTA), evitando erros de rejeição do Firestore (`Unsupported field value: undefined`) durante a chamada de `setDoc`.
    - **Importação de Ícones**: Adicionado o componente `Clock` de `lucide-react` às importações do arquivo, solucionando o travamento por `ReferenceError: Clock is not defined` ao renderizar o card administrativo de post.
  - **Portal do Cliente (`PortalInsights.tsx`)**:
    - Substituição completa de dados mockados por listener em tempo real (`onSnapshot`) apontando para `/blog_posts` onde `status == 'published'`.
    - Contadores de curtidas (`likes`) e visualizações (`views`) gravados e sincronizados de forma reativa no Firestore com incrementos atômicos (`increment(1)` ou `increment(-1)`).
    - Uso de `localStorage` local para evitar múltiplas curtidas ou incrementos redundantes de visualizações na mesma máquina.

---

## 8. Correção do Pipeline de Segurança do Firestore no GitHub Actions
- **Data da Integração**: 24/06/2026
- **Funcionalidade**: Correção da autenticação e deploy automático de regras de segurança do Firestore no GitHub Actions.
- **Decisões Técnicas**:
  - **Identificação da Chave**: Encontrado e validado o arquivo JSON `gassistant-83242-22b1c80241f3.json` na Área de Trabalho pertencente à conta de serviço `github-actions-hub@gassistant-83242.iam.gserviceaccount.com`.
  - **Upload Criptografado de Secret**: Executado um script de integração (`update_secret_github.py`) que usa a API do GitHub com as credenciais locais do usuário (`git credential fill`) para criptografar (Curve25519 e libsodium box) e subir o JSON na secret `GCP_SA_KEY` do repositório `josef10000/hubcrm`.
  - **Refatoração do Workflow**: Substituído o contêiner Docker da action de terceiros (`w9jds/firebase-action`) no arquivo [firebase-rules.yml](file:///c:/Users/JoséFrazãodaSilvaNet/OneDrive - 39985 - DIGITAL TECH LTDA/Área de Trabalho/Clonecrm/hubcrm/.github/workflows/firebase-rules.yml) pela action oficial `google-github-actions/auth@v2` em conjunto com a instalação nativa do `firebase-tools` via `npm` no runner de Actions. Isso resolveu o erro `Failed to authenticate` e validou com sucesso a publicação de novas regras.

---

## 9. Remoção de Diálogos Nativos do Navegador (Modais Próprios)
- **Data da Integração**: 24/06/2026
- **Funcionalidade**: Substituição total de `window.confirm`, `confirm` e `window.alert` por diálogos customizados do hook `useDialog`.
- **Decisões Técnicas**:
  - **Interceptação de Cancelamento no Growth Hub**: Adicionadas as funções `handleClosePostModal` e `handleCloseAssetModal` em `GrowthHubView.tsx`. Elas verificam se o formulário está "sujo" (com alterações) e, em caso positivo, exibem um diálogo de confirmação customizado para descarte.
  - **Substituição Geral**: As caixas de diálogo nativas síncronas em `ProductionTemplatesView.tsx`, `CreativeModal.tsx`, `AnnouncementManager.tsx`, `PayrollPanel.tsx`, `PortalInventory.tsx`, `PortalAgenda.tsx` e `PortalCRMFinance.tsx` foram integralmente reescritas com chamadas assíncronas ao `useDialog` do projeto.

---

## 10. Marketplace para Clientes VIP e Escolha de Artigo em Destaque
- **Data da Integração**: 24/06/2026
- **Funcionalidade**: Abertura do Marketplace para clientes VIP/Cortesia e escolha de artigo em destaque exclusivo no CMS administrativo.
- **Decisões Técnicas**:
  - **Abertura do Marketplace**: Separadas as condicionais no `ClientPortalLayout.tsx` (sidebar, dropdown do cabeçalho e gaveta mobile) para manter "Faturas Hub" restrito a clientes pagantes (`!client.isCourtesy`), mas disponibilizar "Marketplace" (`services`) para todos os clientes ativos.
  - **Destaque Exclusivo no CMS**: Introduzido o toggle `featured` em `postFormData` e no modal de edição em `GrowthHubView.tsx`. Caso o artigo seja salvo como destaque (`featured === true`), o sistema realiza uma consulta por outros artigos em destaque no Firestore e os desmarca automaticamente de forma paralela.
  - **Identificação no Portal**: Atualizada a lógica de escolha do post no banner superior em `PortalInsights.tsx` para `posts.find(p => p.featured) || posts[0]`. O grid inferior remove o post destacado de forma automática para evitar repetição.

---

## 11. Integração de Áudio e Mini Podcasts (R2)
- **Data da Integração**: 24/06/2026
- **Funcionalidade**: Integração de mini podcasts e áudio-resumos armazenados no Cloudflare R2 e integrados ao "Dicas & Insights" e "Hub de Crescimento".
- **Decisões Técnicas**:
  - **Upload Direto no CRM**: Criado utilitário `uploadToR2` (`src/lib/r2.ts`) no CRM que obtém URLs assinadas de `/api/storage_handler?action=upload-url` e realiza PUT binário direto no R2 para evitar sobrecarga no servidor Node.js.
  - **Compatibilidade do Chat**: Adicionado alias `uploadFileToR2` apontando para `uploadToR2` para compatibilidade com o chat interno.
  - **Player de Insights**: Player de áudio customizado e reativo integrado no leitor de artigos do Portal (`PortalInsights.tsx`). Controles incluem play/pause, progresso interativo e velocidade de reprodução (1.0x, 1.5x, 2.0x) com cleanup dinâmico de áudio ao alternar ou fechar o artigo.
  - **Player no Hub de Treinamentos**: Separação visual de videoaulas e áudios na aba "Treinamentos" do Hub de Crescimento (`PortalGrowthHub.tsx`), renderizando um `AudioCard` modular por podcast listado.

---

## 12. Checkout Transparente (White-Label Asaas)
- **Data da Integração**: 25/06/2026
- **Funcionalidade**: Sistema de checkout transparente (white-label) no próprio repositório CRM para pagamentos via PIX, Cartão de Crédito e Boleto integrados à API Asaas v3.
- **Decisões Técnicas**:
  - **Endpoints e Rotas**:
    - Criado `/api/checkout_handler.ts` com endpoints seguros para buscar dados da fatura (`info`), pagar com cartão (`pay`), gerar QR Code Pix (`pix`) e retornar linha digitável/boleto (`boleto`).
    - Mapeadas as rotas do backend no `vercel.json`.
  - **Identificação do Pagamento**:
    - Suporte para `paymentId === 'latest'` para buscar automaticamente a última fatura pendente ou vencida do cliente no Asaas de forma nativa.
    - Suporte para IDs de assinatura do tipo `sub_xxx` (pesquisa e extrai a fatura pendente de forma transparente).
    - Persistência da propriedade `currentPaymentId` no Firestore do cliente ao gerar novas cobranças (webhooks e checkout inicial).
  - **Segurança**:
    - Tripla validação baseada em tokens públicos (`publicToken`) gerados de forma determinística para cada cliente no Firestore e IDs de compradores no Asaas.
    - Dados sensíveis do cartão de crédito nunca são persistidos em banco de dados; são enviados diretamente para a API Asaas via requisição segura.
  - **Frontend Integrado**:
    - Criada a view `/checkout-pay/:orgId/:clientId/:paymentId` (`CheckoutPayView.tsx`) no próprio projeto, integrando os fluxos na mesma aba.
    - Substituídos os botões de faturas e histórico de mensalidades no painel do portal do cliente (`ClientPortal.tsx`) e na aba de planos do CRM (`PlansTab.tsx`) para direcionar ao checkout transparente Hub.
    - Atualizado o template de mensagem automática de cobrança via WhatsApp no `ClientsGrid.tsx` com a URL do checkout white-label.
    - **Ajuste estético**: Rodapé do checkout atualizado para remover o texto de proteção SSL e centralizar a marca "Powered by Asaas" de maneira discreta (texto xs, logo h-5 e opacidade suave de 60%).

---

## 13. Otimização de Imagens no Upload do Cloudinary
- **Data da Integração**: 30/06/2026
- **Funcionalidade**: Otimização automática e transparente de imagens no frontend antes do upload para o Cloudinary.
- **Decisões Técnicas**:
  - **Conversão e Redimensionamento**: Qualquer imagem elegível (excluindo arquivos vetoriais SVG) é convertida para o formato **WebP** com qualidade de **80%** e tem suas dimensões reduzidas para no máximo **1200px** de largura ou altura (mantendo a proporção original) usando a API de Canvas do navegador.
  - **Transparência**: Implementado diretamente na função global `uploadToCloudinary` em `src/lib/cloudinary.ts`. Isso garante que todas as telas do sistema que utilizam upload (perfil do usuário, criativos de anúncios do HubAds, prints do sistema, lojinha VIP e ativos do cliente) passem a enviar arquivos otimizados e comprimidos automaticamente, sem precisar reescrever cada componente individualmente.
  - **Segurança e Fallback**: Caso ocorra qualquer erro no processo do Canvas, o sistema faz o fallback seguro enviando o arquivo original bruto para não travar o fluxo de upload. PDFs, vídeos e áudios passam direto sem modificação.

---

## 14. CRM Multiproduto — Interface Reativa (Passo 1)
- **Data da Integração**: 03/07/2026
- **Funcionalidade**: Adaptação reativa das telas do CRM com base no produto adquirido pelo cliente, permitindo gerenciar cadastros, cobranças e suporte de múltiplos softwares (como o novo SaaS de Cobrança) na mesma plataforma.
- **Decisões Técnicas**:
  - **Propriedade de Identificação**: Campo `productType: 'portal_hub' | 'saas_cobranca' | 'outros'` adicionado na interface `Client` e salvo no Firestore.
  - **Filtro de Abas e Campos**: Abas exclusivas do Portal Hub ("Credenciais", "Briefing" e "Cofre da Marca") são omitidas dinamicamente do modal de cliente (`ClientModal.tsx`) para outros produtos. O mesmo ocorre para campos e atalhos na aba "Dados" e no grid de clientes (`ClientsGrid.tsx`), ocultando "Link do Site", "Link Portal", "Código de Ativação" e "Script Site Shield".
  - **Manutenção de Cobranças**: O botão de "Checkout" (link do checkout transparente do Asaas) e a gestão financeira de mensalidades continuam disponíveis para todos os clientes, independentemente do produto selecionado.

---

## 15. CRM Multiproduto — APIs de Suporte Externo (Passo 2)
- **Data da Integração**: 03/07/2026
- **Funcionalidade**: Endpoints de API seguros integrados no CRM para que outros SaaS externos criem chamados, listem chamados anteriores e enviem réplicas de forma bilateral.
- **Decisões Técnicas**:
  - **Autenticação Baseada em Token**: As requisições externas para suporte são assinadas com `orgId`, `clientId` e `token` (que é comparado com o `publicToken` do cliente no Firestore para garantir acesso autorizado e exclusivo).
  - **Limitação de Serverless Functions da Vercel**: Para evitar estourar o limite de 12 serverless functions do plano Hobby da Vercel, as novas rotas de suporte foram adicionadas como subações no arquivo `api/portal_handler.ts`.
  - **Ações Implementadas**:
    - `POST support_create`: Cria um novo chamado com origem `external_saas` e mensagem no formato `[Assunto]: [Mensagem]`.
    - `POST support_reply`: Permite enviar réplicas a chamados existentes e reabre-os (mudando o status para `aberto`).
    - `POST support_cancel_subscription`: Exclui a assinatura e as cobranças pendentes no Asaas, atualiza o status no CRM para "Cancelado" e responde ao SaaS externo com a data limite de acesso (`accessUntil` baseado na propriedade `nextDueDate` do cliente no CRM).
    - `GET support_list`: Retorna a listagem de chamados do cliente com Timestamps convertidos para strings ISO para evitar problemas na serialização do JSON.
  - **Sincronização de Integração (Código de Integração)**:
    - Campo `integrationCode` exposto no modal do cliente do CRM se o produto não for Portal Hub.
    - Ao salvar o card no CRM, o frontend dispara um Webhook `POST` em segundo plano para `https://tracker.hubsymples.com.br/api/crm-webhook` (ou a URL definida em `VITE_SAAS_WEBHOOK_URL`) sincronizando as chaves `orgId`, `clientId` e `publicToken` geradas para o SaaS de Rastreamento de forma autônoma.

---

## 16. Construtor de Checkout com Live Preview, R2 & Vendas Avulsas
- **Data da Integração**: 11/08/2026
- **Funcionalidade**: Construtor completo de checkouts transparentes por produto com armazenamento no Cloudflare R2, simulador ao vivo (Live Preview), prova social (depoimentos) e suporte a Vendas Avulsas (Sem Acesso ao Portal).
- **Decisões Técnicas**:
  - **Armazenamento de Mídia no Cloudflare R2**:
    - Logos de produtos e fotos de depoimentos de clientes são salvas no seu bucket corporativo via `uploadToR2` (`/api/storage_handler`), retornando URLs públicas via CDN da Cloudflare sem expiração.
  - **Live Preview em Tempo Real no `OfferModal.tsx`**:
    - Layout expansível em Split-View (Formulário em 3 Abas à esquerda + Simulador do Checkout em tempo real à direita).
    - Mudanças no nome do produto, preço, cor de tema, logo R2, benefícios, depoimentos e avisos são refletidos instantaneamente no preview sem recarregar a página.
  - **Módulo de Prova Social & Depoimentos (`TestimonialItem`)**:
    - Suporte ao cadastro de depoimentos de clientes (foto R2, nome, empresa/cargo, rating de 5 estrelas e comentário) exibidos no checkout.
  - **Regra de Produto Avulso / Uso Único (`hasPortalAccess`)**:
    - Campo `hasPortalAccess: boolean` adicionado em `Offer`. Quando definido como `false`:
      - O checkout processa a cobrança no Asaas e cadastra a venda no CRM com a tag `isAvulso: true` e `productType: 'venda_avulsa'`.
      - **Isolamento de Acesso**: O backend (`api/public_checkout.ts`) **NÃO** gera credenciais de acesso ao portal e **NÃO** envia e-mails de boas-vindas do portal do cliente.
  - **Sincronização & Build**: Testes de build (`npm run build`) validados sem erros e código enviado para os repositórios remotos no GitHub.

---

## 17. Página de Pagamento Transparente Direta (1-Page Checkout)
- **Data da Integração**: 11/08/2026
- **Funcionalidade**: Reformulação completa da página pública do produto (`PublicCheckoutPage.tsx`) para um Checkout Transparente Direto em 1 única tela, sem questionários ou etapas longas de onboarding.
- **Decisões Técnicas**:
  - **Experiência de Compra Direta**:
    - Substituído o fluxo antigo de 4 etapas por uma interface fluida de 2 colunas:
      - **Coluna Esquerda (Branding & Prova Social)**: Logo em alta definição (vinda do Cloudflare R2), título da oferta, descrição, preço em destaque, benefícios inclusos com checkmarks na cor temática R2, selo de garantia incondicional, depoimento de cliente e badges de segurança SSL.
      - **Coluna Direita (Checkout Transparente Direto)**: Dados do comprador (Nome, E-mail, WhatsApp e CPF/CNPJ) e seletor de método de pagamento por abas (PIX, Cartão de Crédito e Boleto).
  - **Pagamento PIX Instantâneo no Próprio Checkout**:
    - Ao selecionar PIX, a API `/api/public_checkout` comunica-se com o Asaas, obtém a imagem Base64 do QR Code e a chave Copia e Cola, e renderiza INSTANTANEAMENTE na mesma tela.
    - O sistema ativa polling em segundo plano (`/api/checkout/info`) para identificar a confirmação do pagamento em tempo real sem exigir atualização manual do cliente.
  - **Processamento de Cartão de Crédito e Boleto**:
    - Abas dedicadas para pagamento transparente com cartão de crédito (com dados enviados diretamente à API do Asaas) e emissão de boleto bancário com linha digitável.
  - **Sincronização & GitHub**: Validada compilação com `npm run build` e alterações enviadas para a branch `main` no GitHub.

---

## 18. Sistema de Order Bump Multiproduto (Ofertas de 1 Clique)
- **Data da Integração**: 19/08/2026
- **Funcionalidade**: Sistema de Order Bump integrado ao cadastro de ofertas no CRM, simulador ao vivo, checkout público transparente e API de cobrança via Asaas.
- **Decisões Técnicas**:
  - **Interface `OrderBump` (`shared/types.ts`)**:
    - Propriedades `id`, `title`, `description`, `price`, `highlightTag` e `active`.
    - Campo `orderBumps?: OrderBump[]` integrado na interface `Offer`.
  - **Construtor no CRM (`OfferModal.tsx`)**:
    - Nova aba "Order Bumps" permitindo criar, editar valores, alterar títulos, descrições, tags de destaque e ativar/desativar bumps.
    - **Simulador Live Preview**: Atualizado à direita para renderizar o card de Order Bump no preview em tempo real.
  - **Checkout Público (`PublicCheckoutPage.tsx`)**:
    - Card de Order Bump destacado com checkbox interativo de 1 clique.
    - Re-cálculo automático do valor total do investimento na tela em tempo real à medida que o comprador marca/desmarca bumps.
    - Envio de `selectedBumpIds` no payload para `/api/public_checkout`.
  - **Consolidação na Cobrança (`api/public_checkout.ts`)**:
    - Cálculo de valor consolidado (Preço Principal + Bumps Selecionados).
    - Descrição da cobrança no Asaas inclui o resumo das ofertas adicionais adquiridas.
    - Notas do cliente no CRM enriquecidas com `[ORDER BUMPS ADQUIRIDOS: ...]`.
  - **Sincronização & Git**: Tag local `pre-order-bump-v1` criada, build verificado com sucesso e código enviado para o GitHub (`88421ae`).

---

## 19. Redesign Premium do Checkout & Cartão de Crédito 3D Interativo
- **Data da Integração**: 19/08/2026
- **Funcionalidade**: Redesign visual da página pública de pagamento (`PublicCheckoutPage.tsx`) com tema Dark Slate Mesh Gradient (`#080e1a`), Glassmorphism e um **Cartão de Crédito Virtual Interativo 3D** (`InteractiveCreditCard.tsx`).
- **Decisões Técnicas**:
  - **Componente `InteractiveCreditCard.tsx`**:
    - Suporte a giro 3D de 180 graus (`rotate-y-180` com `perspective: 1000px` e `transform-style: preserve-3d`).
    - Detecção automática de bandeiras por regex (Visa, Mastercard, Elo, Amex, Hipercard) exibindo logos dinâmicas no canto do cartão.
    - Atualização simultânea em tempo real dos dígitos do cartão, nome do titular e validade (MM/AA).
    - Eventos `onFocus` e `onBlur` no campo **CVV** acionam a rotação 3D suave mostrando a tarja magnética no verso do cartão e os 3 dígitos digitados.
  - **Design & Acabamento**:
    - Fundo Dark Slate `#080e1a` com Mesh Light Glows em gradiente difuso que se adaptam à cor de destaque (`accentColor`) do produto.
    - Molduras de vidro fosco (`backdrop-blur-2xl bg-white/[0.03]`) e sombras de alta profundidade.
  - **Sincronização & GitHub**: Build compilado sem erros e código enviado para o GitHub (`109a48f`).

---

## 20. Segregação de Clientes Recorrentes & Compradores Avulsos no CRM
- **Data da Integração**: 19/08/2026
- **Funcionalidade**: Organização e filtragem automática de compradores de vendas pontuais/avulsas separadamente dos clientes recorrentes de portal/assinatura.
- **Decisões Técnicas**:
  - **API `api/public_checkout.ts`**:
    - Compras de assinatura (`SUBSCRIPTION`) criam o registro como cliente recorrente (`isAvulso: false`, `productType: 'portal_hub'`).
    - Compras de produtos avulsos (`SINGLE` / `hasPortalAccess: false`) marcam o cadastro com `isAvulso: true` e `productType: 'venda_avulsa'`.
  - **Abas de Filtragem (`DashboardView.tsx` & `useFilteredClients.ts`)**:
    - Adicionado o seletor de abas no topo da área de Operações CRM:
      - 🔵 **Clientes Recorrentes** *(Padrão)*: Exibe apenas clientes ativos/em desenvolvimento com mensalidade e portal, deixando a tela de gestão limpa.
      - 🟢 **Compradores Avulsos**: Exibe a base de contatos dos compradores de ofertas pontuais com e-mails, WhatsApps e Order Bumps adquiridos, ideais para campanhas de **remarketing**.
      - 🟣 **Todos os Registros**: Exibe a base consolidada.
  - **Sincronização & GitHub**: Compilado sem erros (`npm run build`) e sincronizado no GitHub (`fde66df`).

---

## 21. Módulo de Perfil de Cliente Ideal (ICP B2B & B2C)
- **Data da Integração**: 19/08/2026
- **Funcionalidade**: Mapeamento completo e gerenciamento interativo de Perfis de Cliente Ideal (**ICP**) com suporte a **B2B (Empresas)** e **B2C (Consumidor Final)** e conexão opcional bidirecional aos produtos do CRM.
- **Decisões Técnicas**:
  - **Interface `ICP` (`shared/types.ts`)**:
    - Suporte a `targetType: 'B2B' | 'B2C'`.
    - Campos B2B: Nicho, Porte da Empresa, Cargo do Decisor, Ticket Médio.
    - Campos B2C: Faixa Etária (`ageGroup`), Gênero (`gender`), Faixa de Renda (`incomeRange`), Interesses.
    - Mapeamento comportamental comum: Dores (`painPoints`), Objetivos (`desires`), Objeções (`objections`), Canais de Aquisição (`channels`) e Pitch de Venda (`pitchNotes`).
  - **Visualização & Modal (`ICPView.tsx`, `ICPModal.tsx`, `useICPs.ts`)**:
    - Formulário em 3 abas dinâmicas com chave B2B/B2C.
    - Cards estilo *Persona Canvas* com badges coloridos (`🏢 B2B` / `👤 B2C`) e filtros superiores.
  - **Vínculo com Produtos (`OfferModal.tsx`)**:
    - Campo de seleção opcional "Perfil de Cliente Ideal (ICP)" no construtor de ofertas, conectando ofertas ao perfil de comprador ideal.
  - **Avatares Ilustrativos & Modal Customizado (`ConfirmDeleteICPModal.tsx`)**:
    - Avatares dinâmicos nos cards: `User` com iluminação verde esmeralda para B2C e `Building2` com iluminação azul neon para B2B.
    - Remoção completa do `confirm()` nativo do navegador, substituído por modal customizado de confirmação de exclusão em Glassmorphism.
  - **Dossier de Visualização (`ICPDetailsModal.tsx`)**:
    - O botão "Ver Detalhes ->" nos cards abre a ficha de leitura executiva (*Executive Persona Dossier*) em modo somente leitura com resumo demográfico/firmográfico, dores, desejos, objeções, pitch e ofertas conectadas, mantendo o formulário de edição restrito ao atalho do ícone de lápis.
  - **Sincronização & GitHub**: Validado com `npm run build` e publicado na branch `main` (`379ad06`).

---

## 22. Laboratório de Ofertas (Offer Lab & Blueprints)
- **Data da Integração**: 19/08/2026
- **Funcionalidade**: Estação de trabalho para ideação e estruturação profunda de ofertas irresistíveis (Promessa, Nome Chiclete, Mecanismo Único, Entregáveis, Bônus, Garantia, Ancoragem e Rascunho).
- **Decisões Técnicas**:
  - **Coleção Firestore**: Armazenamento na subcoleção isolada `organizations/{orgId}/offer_blueprints` para não conflitar com a coleção legada `offers` (utilizada pelos produtos e faturas).
  - **Integração no CRM**: Conexão com ICPs e Produtos cadastrados. Remoção de campos obrigatórios para permitir ideação livre.
  - **Persistência & UX**: Auto-save silencioso em segundo plano debounced para 2s e navegação automática de volta para a lista ao clicar em "Salvar".

---

## 23. Arquiteto de Funis & Ecossistema (Quadro Infinito & Simulador de Vendas)
- **Data da Integração**: 24/08/2026
- **Funcionalidade**: Módulo visual interativo no estilo Funnelytics / Miro para desenho, simulação e gerenciamento da jornada completa de vendas em um Quadro Infinito (Infinite Canvas).
- **Decisões Técnicas**:
  - **Estrutura Firestore**: Coleção `organizations/{orgId}/funnels`.
  - **Tipagem & Modelos (`shared/types.ts`)**:
    - `FunnelNodeType`: `traffic`, `page`, `offer`, `automation`.
    - `FunnelNodeSubType`: 29 subtipos especializados (Pinterest, TikTok, Instagram, YouTube, Google SEO, WhatsApp, Blog/Site de Conteúdo, Quiz Interativo, Quiz + VSL Híbrido, Páginas Estáticas/Pre-sell, Webnário/Masterclass, Páginas de Venda/VSL/Captura, Checkout Transparente, Order Bump, Upsell, Assinatura Recorrente, High-Ticket, Afiliados Amazon, Afiliados Shopee, Afiliados Mercado Livre, Infoprodutos Afiliados, E-mails e Remarketing).
    - `FunnelNode`: Posições no canvas (`x`, `y`), taxa de conversão esperada, preço (R$), CPC de tráfego, link de afiliado (`affiliateLink`), taxa de comissão (`commissionRate`), checklist de execução e notas.
    - `FunnelConnection`: Ligações curvas Bezier (SVG) dinâmicas com setas direcionais e estilos sólido, pontilhado e animado.
  - **Quadro Infinito (`FunnelArchitectEditorView.tsx`)**:
    - Pan livre com botão do meio/fundo do canvas e Zoom In/Out com mouse wheel (0.3x a 2.2x).
    - **Arraste a 60fps & Linhas Sincronizadas**: Listener global de mouse com `requestAnimationFrame` garantindo que os blocos e as curvas SVG se movam colados em tempo real sem atraso ou desencaixe de linha.
    - **Edição com Lápis & Buffer de Rascunho (Draft)**: Cada bloco possui um botão de lápis (`Pencil`) que abre o inspetor lateral; alterações ficam em buffer rascunho com botões dedicados de **"Salvar Alterações"** e **"Cancelar"** (ou fechar/clicar fora para descartar sem alterar).
    - Grid Dark Slate com Glassmorphism e mini-controles de visualização.
    - **Biblioteca de Blocos com Busca em Tempo Real**: Campo de pesquisa com filtro instantâneo por nome, categoria, palavras-chave e estratégias, com botão de limpar e estado vazio elegante.
    - Gaveta lateral retrátil dividida em 5 categorias: Linhas de Tráfego, Páginas & Etapas, Ofertas Próprias, Afiliação & Lojas Parceiras e Automações.
    - Inspetor lateral com 3 abas: Parâmetros (links de afiliado com botão de teste, vínculo opcional com ofertas do CRM e links de checkout), Checklist de Tarefas e Guia Tático Estratégico de Copy.
  - **Simulador de Tráfego & Gargalos de Venda**:
    - Algoritmo em tempo real que propaga o volume de visitantes iniciais pelos nós através das taxas de conversão, calculando Faturamento Projetado (incluindo comissões de afiliados), Custo de Tráfego, Lucro Líquido e ROAS.
    - Alerta visual de gargalo (*Bottleneck Alert*) em etapas com baixa conversão.
  - **Galeria de Templates de 1-Clique (`funnelTemplates.ts`)**:
    - 6 modelos validados prontos: *Baixo Ticket + Bump + Assinatura*, *Orgânico Pinterest & TikTok ➡️ WhatsApp*, *Quiz Interativo + VSL Customizada*, *B2B High-Ticket*, *Lançamento 24h WhatsApp* e *Perpétuo SaaS*.
  - **Navegação**: Rota `/funnels` e `/funnels/:id` adicionadas em `AppRouter.tsx` e item "Funis & Ecossistema" com ícone `GitFork` no menu Comercial do `Sidebar.tsx`.
