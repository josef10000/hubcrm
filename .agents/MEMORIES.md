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

## 23. Funis & Orquestração de Processos (Quadro Infinito & Simulador Empresarial)
- **Data da Integração**: 24/08/2026 - Atualizado em 25/08/2026
- **Funcionalidade**: Módulo visual interativo no estilo Funnelytics / Miro para desenho, simulação e gerenciamento da jornada completa de vendas B2C/B2B, réguas de e-mail marketing, processos de vendas consultivas, pós-venda (CS), RH, Perfis ICP, Post-its e Molduras Visuais em um Quadro Infinito (Infinite Canvas).
- **Decisões Técnicas**:
  - **Estrutura Firestore**: Coleção `organizations/{orgId}/funnels`.
  - **Tipagem & Modelos (`shared/types.ts`)**:
    - `FunnelNodeType`: `traffic`, `page`, `offer`, `automation`, `b2b`, `cs`, `hr`, `icp`, `note`.
    - `FunnelNodeSubType`: 47 subtipos especializados cobrindo:
      - *Inteligência do CRM*: `icp_persona` (Perfil ICP com vínculo a `useICPs`, dores, desejos, objeções e ticket médio).
      - *Anotações & Post-its*: `sticky_note` (Notas adesivas com 5 cores pastéis: Amarelo, Azul, Rosa, Verde e Roxo).
      - *Tráfego*: Pinterest, TikTok, Instagram, YouTube, Google SEO, WhatsApp, Parceiros.
      - *Páginas & Etapas Web*: Blog/Site, Quiz, Quiz+VSL, VSL, Página de Vendas, Captura, Estática/Pre-sell, Webnário, Advertorial, Checkout Transparente, Obrigado.
      - *Ofertas*: Lead Magnet, Front-End, Order Bump, Upsell, Downsell, Assinatura, High-Ticket.
      - *Afiliados*: Amazon, Shopee, Mercado Livre, Infoproduto Parceiro.
      - *E-mail & Multicanal*: Régua de E-mails, E-mail Broadcast, Delay/Temporizador de Espera, Decisão Condicional (Se/Então), WhatsApp Automático, SMS Transacional, Robô de Voz/Ligação, Remarketing.
      - *Vendas B2B Corporativas*: Agendamento de Reunião/Demo, Qualificação SDR (BANT), Envio de Proposta Comercial, Assinatura Eletrônica de Contrato, Faturamento PJ & NF-e.
      - *Pós-Venda, Sucesso do Cliente (CS) & Retenção*: Onboarding Kick-off, Abertura de Chamado/Helpdesk, Pesquisa NPS (0 a 10), Renovação de Contrato / Up-Sell.
      - *RH & Processos Internos*: Triagem & Recrutamento de Talentos, Treinamento & Onboarding de Equipe.
    - `FunnelFrame`: Molduras de agrupamento visual livres (`id`, `title`, `color`, `x`, `y`, `width`, `height`) com 7 cores (Índigo, Esmeralda, Âmbar, Rosa, Ciano, Roxo, Slate), cabeçalho arrastável, edição inline de título, seletor de cor e alça de redimensionamento live no canto inferior direito.
    - `FunnelNode`: Posições no canvas (`x`, `y`), `icpId` (vínculo ICP), `noteColor` (cor do post-it), taxa de conversão, preço (R$), CPC, link de afiliado (`affiliateLink`), taxa de comissão (`commissionRate`), checklist e notas.
    - `FunnelConnection`: Ligações curvas Bezier (SVG) dinâmicas com setas direcionais e estilos sólido, pontilhado e animado.
  - **Quadro Infinito (`FunnelArchitectEditorView.tsx`)**:
    - Pan livre com botão do meio/fundo do canvas e Zoom In/Out com mouse wheel (0.3x a 2.2x).
    - **Arraste a 60fps & Linhas Sincronizadas**: Listener global de mouse com `requestAnimationFrame` garantindo que os blocos, as molduras e as curvas SVG se movam colados em tempo real sem atraso ou desencaixe de linha.
    - **Edição com Lápis & Buffer de Rascunho (Draft)**: Cada bloco possui um botão de lápis (`Pencil`) que abre o inspetor lateral; alterações ficam em buffer rascunho com botões dedicados de **"Salvar Alterações"** e **"Cancelar"** (ou fechar/clicar fora para descartar sem alterar).
    - **Molduras de Área Flexíveis**: Botão `+ Nova Moldura` na barra superior para criar caixas de agrupamento de fases/estratégias livres (ex: Tráfego Direto, Upsells, Fechamento B2B) com cores e dimensões 100% personalizáveis.
    - **Biblioteca de Blocos com Busca em Tempo Real**: Campo de pesquisa com filtro instantâneo por nome, categoria, palavras-chave e estratégias, organizado em 10 categorias ricas.
    - Inspetor lateral com 3 abas: Parâmetros (seleção de ICPs do CRM, cores de Post-it, links de afiliado com botão de teste, vínculo opcional com ofertas do CRM e links de checkout), Checklist de Tarefas e Guia Tático Estratégico de Copy.
  - **Simulador de Tráfego & Gargalos de Venda**:
    - Algoritmo em tempo real que propaga o volume de visitantes iniciais pelos nós através das taxas de conversão, calculando Faturamento Projetado (incluindo comissões de afiliados), Custo de Tráfego, Lucro Líquido e ROAS.
    - Alerta visual de gargalo (*Bottleneck Alert*) em etapas com baixa conversão.
  - **Galeria de Templates de 1-Clique (`funnelTemplates.ts`)**:
    - 8 modelos validados prontos: *Baixo Ticket + Bump + Assinatura*, *Orgânico Pinterest & TikTok ➡️ WhatsApp*, *Quiz Interativo + VSL Customizada*, *B2B High-Ticket*, *Lançamento 24h WhatsApp*, *Perpétuo SaaS*, *Orquestração Comercial B2B (Inbound ➡️ Demo ➡️ Proposta ➡️ Contrato & NF-e)* e *Esteira de Pós-Venda CS, NPS & Renovação*.
  - **Navegação**: Rota `/funnels` e `/funnels/:id` adicionadas em `AppRouter.tsx` e item "Funis & Orquestração" com ícone `GitFork` no menu Comercial do `Sidebar.tsx`.

---

## 24. Sala de Comando Multi-Monitores (War Room / Multi-Screen Display)
- **Data da Integração**: 25/08/2026
- **Funcionalidade**: Sistema de visualização dedicada em tempo real para múltiplos monitores físicos e TVs (Modo Kiosk / TV Clean) para monitoramento contínuo sem barras de navegação pesadas.
- **Decisões Técnicas**:
  - **Rotas Standalone & Layout Kiosk (`ScreenLayout.tsx`)**:
    - Fundo Dark Slate de alto contraste com ambient lights e grid sutil.
    - Relógio digital em tempo real (HH:mm:ss) e data em português.
    - Botões integrados de Fullscreen (F11 via HTML5 Fullscreen API) e áudio sintético nativo (🔊/🔇).
    - Seletor rápido de alternância entre monitores (M1, M2, M3).
  - **Efeitos Sonoros Nativos (`soundEffects.ts`)**:
    - Síntese de áudio 100% nativa com a Web Audio API (`AudioContext`, osciladores e curvas de ganho exponenciais) sem dependência de arquivos externos ou assets remotos (som suave de moeda/caixa registradora para vendas confirmadas, pop para Pix gerado e alerta duplo para quedas de página).
  - **Monitor 1: Sala Financeira & ASAAS Live (`FinancialScreenView.tsx` / `/screen/financial`)**:
    - **Valor Gerado Hoje (R$)**: Soma de todos os Pix, Boletos e Cartões gerados no dia.
    - **Valor Pago Hoje (R$)**: Faturamento líquido confirmado que entrou na conta.
    - **Taxa de Conversão do Caixa (%)**: Indicador de eficiência `(Valor Pago / Valor Gerado) * 100`.
    - **Pendente de Recuperação (R$)**: Dinheiro na mesa aguardando fechamento.
    - **Meta Diária de Faturamento**: Barra de progresso com meta configurável diretamente no painel.
    - **Conversão por Meio de Pagamento**: Pix (Gerados vs Pagos + % conversão), Cartão de Crédito (Aprovados vs Recusados) e Boletos.
    - **Live Feed de Transações ASAAS**: Atualização em tempo real com efeito de pulso e som de caixa registradora ao aprovar pagamentos.
    - **Gráfico de Vendas Horário (24h)**: Histograma de faturamento gerado e pago hora a hora (00h às 23h).
  - **Monitor 2: Radar de Clientes & Recuperação ao Vivo (`ClientsScreenView.tsx` / `/screen/clients`)**:
    - Novos Clientes Hoje com badge `Asaas Auto` quando gerados por webhook/checkout.
    - Fila de Onboarding & Kick-off para o time operacional.
    - **Fila de Recuperação Ativa de Pix/Boleto**: Lista de clientes com pagamentos pendentes com botão de 1-clique para abrir o WhatsApp Web (`https://wa.me/55...`) com mensagem persuasiva pronta.
  - **Monitor 3: Status de Páginas, Checkouts & Funis (`StatusScreenView.tsx` / `/screen/status`)**:
    - Radar de Uptime com medição de latência em milissegundos (ms) para checkouts transparentes (`/checkout/${orgId}`) e páginas de venda.
    - Visualizador de jornada do funil de vendas ativo com taxas de passagem.
  - **Central de Lançamento Multi-Monitores (`MultiScreenLauncherModal.tsx` & `ScreenLauncherView.tsx` / `/screens`)**:
    - Botão "Lançar Todos os 3 Monitores" que abre 3 janelas pop-up limpas para distribuição instantânea nas 3 telas físicas do setup.
    - Acesso direto via botão "Monitores" no cabeçalho global (`Header.tsx`), menu Comercial (`navigation.ts`) e Command Palette (`CommandPalette.tsx`).

---

## 25. Ponto Eletrônico: Controle Manual de Expediente & Ajuste em Lote
- **Data da Integração**: 25/08/2026
- **Funcionalidades**:
  1. Desativação do início automático de expediente (Auto-Clock In).
  2. Botão de Expediente (Pill Inteligente) com controle de status e tempo ao vivo no Header.
  3. Calendário completo do mês e sistema de Ajuste/Regularização de Ponto em Lote (Multi-dias).
- **Decisões Técnicas**:
  - **Desativação de Auto-Clock In (`usePresence.ts`)**:
    - Removida a chamada automática a `startExpediente` na transição para `online` e eliminada a rotina `trackActivityForAutoClockIn`. A presença de chat continua atualizando `online`/`away`/`offline` sem gerar logs de ponto não intencionais no Firestore.
  - **Botão de Expediente no Header (`Header.tsx`)**:
    - Substituído o ícone pequeno por um botão tipo *Pill* expressivo com indicador de status (`Iniciar Expediente` em azul/violeta, `Expediente Ativo` em verde com ponto pulsante, `Em Intervalo` em âmbar e `Expediente Encerrado`).
    - Clique interativo: Inicia expediente imediatamente no primeiro clique; permite pausar, retomar ou encerrar com diálogo de confirmação seguro.
  - **Espelho de Ponto com Ajuste em Lote (`ProfileView.tsx`)**:
    - Geração de todos os dias do mês selecionado (`allMonthDays`) com cálculo de dias úteis e fins de semana.
    - Status visuais por dia: ✅ *Concluído*, ⚠️ *Sem Saída (Ponto Aberto)*, ⭕ *Sem Registro*, 🌴 *Folga / Fim de Semana*, ⏳ *Futuro*.
    - Seleção múltipla com checkboxes individuais, master checkbox e botões de atalho rápido (*"Selecionar Faltantes"*, *"Selecionar Todos"*, *"Limpar"*).
    - Barra de ação flutuante e modal de preenchimento em lote com horários padrão (Entrada, Saída e Intervalo de Almoço de 1h) aplicando a múltiplos dias com 1 clique no Firestore (`time_logs`), calculando a duração líquida e registrando auditoria (`editedByAdmin: true`).

---

## 26. Funis & Orquestração: Seleção em Lote, Arraste em Grupo, Auto-Layout & Roteamento Ortogonal
- **Data da Integração**: 25/08/2026
- **Funcionalidades**:
  1. Seleção em Lote & Área (Marquee Box Selection) via mouse ou `Shift + Drag`.
  2. Arraste Sincronizado a 60fps de múltiplos blocos e exclusão em lote (`Delete`).
  3. Barra Flutuante de Ação em Grupo com alinhamento, exclusão e criação automática de Moldura envolvente.
  4. Destaque Inteligente de Trilha (Smart Dimming) reduzindo opacidade do ruído visual.
  5. Alternador de Roteamento de Linhas: Curvas Bézier vs Ortogonal em Ângulo Reto (90°) com portas inteligentes de retorno.
  6. Algoritmo de Auto-Organização Hierárquica em 1-Clique (⚡ Auto-Layout).
- **Decisões Técnicas**:
  - **Modelos (`shared/types.ts`)**:
    - Campos `intent?: 'conversion' | 'recovery' | 'loop' | 'upsell' | 'neutral'` e `color?: string` na interface `FunnelConnection`.
    - Campo `routingStyle?: 'bezier' | 'orthogonal'` persistido no `FunnelBlueprint`.
  - **Multi-Seleção & Arraste (`FunnelArchitectEditorView.tsx`)**:
    - Estado `selectedNodeIds: string[]` sincronizado com offsets individuais (`draggingGroupOffsets`) permitindo mover todo o grupo com precisão absoluta de coordenadas em `requestAnimationFrame`.
    - Bounding box automático para transformar a seleção de blocos em uma `FunnelFrame` perfeitamente ajustada.
  - **Persistência Segura & Regras de Firestore (`funnelService.ts` & `firestore.rules`)**:
    - Sanitização recursiva profunda de campos `undefined` em nós, conexões e molduras para prevenir exceções do Firestore SDK.
    - Gravação com `setDoc(docRef, updateData, { merge: true })` para resiliência de escrita.
    - Regra explícita `match /funnels/{funnelId}` com permissão `allow read, write: if isOwnerEmail() || belongsToOrg(orgId);`.
  - **Estabilidade & Performance de Arraste (`FunnelArchitectEditorView.tsx`)**:
    - Blindagem de `Number(offer.price || 0).toFixed(2)` e `Number(node.price || 0).toFixed(2)` evitando quebras de `ErrorBoundary`.
    - Desacoplamento de listeners de mouse com `funnelRef` eliminando re-attachments constantes durante o arraste a 60fps.

---

## 27. Funis & Arquitetura: Ancoragem Fixa de Linhas, Gavetas na Biblioteca, Alinhamento Anti-Colisão & Eliminação do Lag CSS (0ms)
- **Data da Integração**: 25/08/2026
- **Funcionalidades**:
  1. **Eliminação do Lag CSS de Arraste (0ms Delay)**: Identificado e removido o `transition-all` que causava atraso de 150ms na renderização dos cards enquanto o SVG se movia instantaneamente. Cards e linhas agora se movem 100% soldados no mesmo exato milissegundo a 60fps.
  2. **Plugs Magnéticos Físicos (Frente & Atrás)**: Conectores visuais táteis posicionados na lateral esquerda (entrada) e direita (saída/clicável para puxar linhas).
  3. **Ancoragem Magnética Estável das Linhas**: Portas de conexão rigorosamente fixas em `y + height/2` na ponta direita e esquerda, mantendo curva contínua elegante mesmo em fluxos reversos.
  4. **Gavetas Retráteis (Accordion) na Barra Lateral de Blocos**: Categorias de blocos com cabeçalho clicável individual para abrir/fechar com transição suave.
  5. **Alinhamento Inteligente Anti-Colisão**: Distribuição automática horizontal (`gap = 80px`) e vertical (`gap = 45px`) sem sobreposição de blocos.
- **Decisões Técnicas**:
  - `FunnelArchitectEditorView.tsx`: Substituição de `transition-all` por `transition-[border-color,box-shadow,background-color,opacity]` nos nós, permitindo atualização instantânea de `left` e `top` sem interferência da interpolação CSS do navegador.
  - `calculateConnectionPath`: Alturas dinâmicas baseadas no subtipo (`fromHeight / 2`, `toHeight / 2`) para alinhamento pixel-perfect dos conectores.

---

## 28. Funis & Arquitetura: Gavetas Retráteis Ativas & Gerenciador Completo de Tarefas/Checklist
- **Data da Integração**: 25/08/2026
- **Funcionalidades**:
  1. **Gavetas Retráteis (Accordion) na Barra Lateral de Blocos**: Renderização interativa com toggle de estado `openCategories[catKey]`, setinha indicadora com rotação animada (`ChevronDown`), contador de blocos por tema e fechamento/abertura fluido.
  2. **Gerenciador Completo de Tarefas/Checklist do Bloco**:
     - Criação de novas tarefas com input e atalho de tecla `Enter`.
     - Carregamento em 1-clique do checklist estratégico padrão do modelo quando vazio.
     - Barra de progresso visual com porcentagem (`% Concluído`) e contador de tarefas concluídas.
     - Checkbox interativo com texto riscado e botão de exclusão de tarefa individual.
  3. **Resiliência do Rascunho de Edição (`nodeEditDraft`)**: `updateDraftField` inicializa automaticamente a partir do nó selecionado se o rascunho estiver nulo, prevenindo perda de interações na barra de inspeção.
- **Decisões Técnicas**:
  - `FunnelArchitectEditorView.tsx`: Funções `handleAddChecklistItem`, `handleToggleChecklistItem`, `handleDeleteChecklistItem` e `handleLoadTemplateChecklist` integradas com `FunnelChecklistItem` para persistência limpa no Firestore.

---

## 29. Funis & UX: Abertura Exclusiva do Editor Lateral pelo Ícone do Lápis
- **Data da Integração**: 26/08/2026
- **Funcionalidades**:
  1. **Inserção Limpa de Blocos no Canvas**: Ao adicionar novos blocos através da biblioteca lateral (`handleAddBlock`), o bloco é criado e selecionado na tela mantendo o painel de inspeção lateral fechado, sem poluir a visão do usuário.
  2. **Gatilho Explícito de Edição**: A abertura da gaveta de edição (`isInspectorOpen`) passa a ser acionada única e exclusivamente ao clicar no botão de lápis (`<Pencil />`) dentro do card do bloco.
- **Decisões Técnicas**:
  - `FunnelArchitectEditorView.tsx`: Substituição de `handleOpenNodeEditor(newNode)` em `handleAddBlock` por `setSelectedNodeIds([newNode.id])`.

---

## 30. Funis & Espaço Infinito: Super Zoom (10%-300%), Zoom Centrado no Cursor, Enquadrar Tudo, Tela Cheia, Minimapa & Pan por Espaço
- **Data da Integração**: 26/08/2026
- **Funcionalidades**:
  1. **Super Zoom Extremo (10% a 300%)**: Expansão do range de zoom de 0.1 a 3.0 para permitir visão macro de funis gigantes com 50+ etapas e micro-foco de alta resolução.
  2. **Zoom Inteligente Centrado no Cursor**: Fórmula matemática que ancora as coordenadas mundiais do mouse (`worldX, worldY`) durante o scroll da rodinha, garantindo que o bloco apontado fique perfeitamente estático durante aproximação ou afastamento.
  3. **Enquadrar Tudo no Canvas (Fit-to-Screen / `Shift + 1` / Duplo Clique)**: Algoritmo de Bounding Box que calcula as extremidades de todos os nós e molduras e centraliza o funil inteiro com margem de segurança de 100px.
  4. **Modo Tela Cheia Imersivo (Zen Mode / Tecla `F`)**: Alternância nativa de fullscreen usando a API do navegador para entrega de 100% dos pixels ao canvas.
  5. **Mini-Mapa Radar Retrátil**: Painel radar no canto inferior exibindo miniatura vetorial dos blocos, conexões, molduras e o retângulo de visão (viewport box) com suporte a teleporte por clique.
  6. **Navegação Rápida com Barra de Espaço (`Spacebar Pan`)**: Pressionar e segurar a barra de espaço permite arrastar o canvas com botão esquerdo ou do meio a partir de qualquer ponto.
  7. **Dock Flutuante de Ferramentas Espaciais**: Barra inferior translúcida com botões de zoom, reset 100%, enquadramento, radar e tela cheia.
- **Decisões Técnicas**:
  - `FunnelArchitectEditorView.tsx`: Funções `handleFitToScreen`, `handleWheel` vetorial, `toggleFullscreen`, `renderMinimap` e listeners de teclado (`keydown` / `keyup` para `Space`, `Shift+1`, `F`, `Ctrl+0`).

---

## 31. Funis & Navegação Visual: Enquadramento Preciso, Tela Cheia Híbrida, Mini-Mapa 100% Arrastável e Barra de Ferramentas com Ícones
- **Data da Integração**: 26/08/2026
- **Funcionalidades**:
  1. **Correção do Enquadramento / Centralizar**: Definição da função `getNodeDimensions` para cálculo rigoroso do Bounding Box de todos os blocos e molduras, eliminando erros silenciosos e centralizando o funil inteiro na tela com margem de 120px e zoom ótimo.
  2. **Modo Tela Cheia Híbrido Infalível**: Aplicação de classes CSS fixas (`fixed inset-0 z-[9999] w-screen h-screen`) combinada com `requestFullscreen`, garantindo expansão instantânea em 100% dos navegadores sem depender de permissões do sistema.
  3. **Mini-Mapa 100% Arrastável em Tempo Real**: Suporte contínuo a clique e arraste com cálculo proporcional a 60fps, permitindo pilotar o canvas livremente arrastando o visor pelo radar.
  4. **Barra de Ferramentas Completa com Ícones Visuais**: Botões dedicados para Ponteiro (`MousePointer`), Mãozinha de Arrastar (`Hand`), Centralizar (`Scan`), Zoom In/Out/100%, Radar (`Compass`) e Tela Cheia (`Maximize2`/`Minimize2`), eliminando a necessidade de atalhos ou ações complexas de teclado/mouse.
- **Decisões Técnicas**:
  - `FunnelArchitectEditorView.tsx`: Funções `getNodeDimensions`, `handleMinimapPanTo`, `isDraggingMinimap` com listeners globais em `window` e estado `isHandMode`.

---

## 32. Funis & Inteligência: Novos Blocos de Vendas (WhatsApp X1, Chatbot IA, Meta Ads), Auto-Organização por Estágios & Copiar/Colar (Ctrl+C/V/D)
- **Data da Integração**: 26/08/2026
- **Funcionalidades**:
  1. **Novos Blocos Especializados de Vendas & WhatsApp**:
     - *WhatsApp & Atendimento*: `whatsapp_x1` (Atendimento Humano X1 / Closer), `whatsapp_bot` (Chatbot IA / Typebot), `whatsapp_group` (Grupo VIP de Lançamento / Ofertas), `live_chat` (Chat ao Vivo no Site).
     - *Tráfego & Origens*: `meta_ads` (Meta Ads / Facebook & Instagram Ads), `influencer_partner` (Parcerias & Influenciadores), `native_ads` (Tráfego Nativo Taboola/Outbrain).
     - *Páginas & Etapas Web*: `application_page` (Página de Aplicação / Formulário High Ticket), `upsell_page` (Página Dedicada de Upsell 1-Click OTO), `bridge_page` (Página Ponte / Link da Bio), `member_area` (Área de Membros / Portal do Aluno).
     - *Ofertas & Monetização*: `tripwire_offer` (Oferta Tripwire / Ativação), `bundle_offer` (Combo / Kit Promocional).
     - *Automação & CRM*: `tag_lead` (Adicionar Tag / Lead Scoring), `pix_recovery` (Recuperação Pix Imediata).
     - *Pós-Venda & CS*: `referral_program` (Programa Indique e Ganhe), `testimonial_request` (Coleta de Prova Social).
  2. **Auto-Organização Semântica por Estágios da Jornada (Smart Stage Layout)**:
     - Algoritmo que classifica qualquer combinação de blocos na lousa em sua fase natural da jornada (0: Estratégia, 1: Tráfego, 2: Captura, 3: Nutrição/VSL, 4: Vendas/Demo, 5: Fechamento/WhatsApp X1/Checkout, 6: Bumps/Upsells/Recuperação, 7: Jurídico/Assinatura, 8: Pós-Venda/CS).
     - Distribuição automática em colunas ordenadas horizontalmente da esquerda para a direita (`START_X + colIndex * 340`) e alinhamento vertical harmônico e simétrico para múltiplos blocos no mesmo estágio (`CENTER_Y + (nodeIdx * 145) - totalH/2`), sem exigir conexões manuais prévias.
  3. **Sistema de Copiar & Colar e Duplicação (Ctrl+C / Ctrl+V / Ctrl+D & Barra Flutuante)**:
     - Selecionar blocos (com seleção de área ou clique individual) e copiar para a área de transferência (`Ctrl + C`).
     - Colar com `Ctrl + V` duplicando os blocos com deslocamento inteligente (+50px X/Y), novos IDs e recriação automática das conexões internas existentes entre os blocos clonados.
     - Duplicação imediata com `Ctrl + D` ou botão "Duplicar" / "Copiar" na barra flutuante de seleção em grupo.
- **Decisões Técnicas**:
  - `shared/types.ts`: Atualização do union `FunnelNodeSubType`.
  - `src/domains/crm/constants/funnelTemplates.ts`: Inclusão dos novos blocos no `FUNNEL_BLOCK_CATALOG` com guias estratégicos completos (`strategicGuide`), taxas de conversão e checklists.
  - `FunnelArchitectEditorView.tsx`: Funções `handleAutoLayout` refeita com `SUBTYPE_STAGE_MAP`, `handleCopySelection`, `handlePasteSelection`, `handleDuplicateSelection` e posicionamento do `useEffect` de atalhos de teclado após todas as declarações de funções de ação, eliminando erros de Temporal Dead Zone (TDZ).

---

## 33. Funis & Precisão Espacial: Ancoragem Pixel-Perfect da Ferramenta de Seleção por Área & Modos de Dock
- **Data da Integração**: 26/08/2026
- **Funcionalidades**:
  1. **Correção do Offset da Seleção por Área (Marquee Box)**:
     - Identificado que o cálculo de coordenadas do mouse utilizava diretamente `(e.clientX - pan.x) / zoom` sem descontar o `boundingClientRect` do elemento canvas (`rect.left` = 288px da barra lateral e `rect.top` = 64px do cabeçalho).
     - Criada a função unificada `getCanvasCoordinates(clientX, clientY)` que desconta rigorosamente os offsets do layout:
       $$\text{worldX} = \frac{(e.\text{clientX} - \text{rect.left}) - \text{pan.x}}{\text{zoom}}, \quad \text{worldY} = \frac{(e.\text{clientY} - \text{rect.top}) - \text{pan.y}}{\text{zoom}}$$
     - O retângulo de seleção agora nasce exatamente embaixo da ponta do cursor do mouse, com precisão sub-pixel em qualquer nível de zoom ou pan.
  2. **Unificação de Coordenadas de Toda a Lousa**:
     - Aplicado `getCanvasCoordinates` em todos os manipuladores de arraste: Seleção em Área, Arraste de Grupo de Nós, Criação e Redimensionamento de Molduras, Inserção Centralizada de Novos Blocos e Pan.
  3. **Aprimoramento dos Modos de Interação no Dock Inferior**:
     - Botões dedicados no dock para alternar entre Modo Ponteiro (`MousePointer`), Modo Seleção por Área (`BoxSelect`) e Modo Mãozinha (`Hand`).
- **Decisões Técnicas**:
  - `FunnelArchitectEditorView.tsx`: Implementado `getCanvasCoordinates` com `useCallback` e sincronizado nos listeners `handleMouseDown`, `handleWindowMouseMove`, `handleFrameMouseDown`, `handleFrameResizeMouseDown`, `handleNodeMouseDown` e `handleAddBlock`.

---

## 34. Estratégia Comercial & Arquitetura: Roadmap Oficial de Direct Response & Vendas Consultivas no WhatsApp (X1 / Closers)
- **Data da Integração**: 26/08/2026
- **Funcionalidades & Especificações**:
  1. **Documento de Engenharia & Estratégia**: Criado `docs/ROADMAP_DIRECT_RESPONSE_WHATSAPP.md` mapeando a infraestrutura de VPS (Docker, Traefik SSL, Evolution API / Baileys, Redis) e os 8 pilares indispensáveis para operações de infoprodutos, perpétuo, lançamentos e high-ticket.
  2. **Pilares Mapeados**:
     - *Pilar 1 (WhatsApp CRM Inbox)*: Multiatendimento, gaveta 360° do lead com UTMs e histórico, disparo de áudios nativos push-to-talk e geração de Pix 1-clique.
     - *Pilar 2 (Recovery Hub)*: Receptor de webhooks de plataformas digitais (Kiwify, Hotmart, Eduzz, Braip, Cakto, Asaas) com fila de urgência (Pix 0-10 min, cartão recusado e abandono).
     - *Pilar 3 (Roleta de Leads)*: Distribuição Round-Robin equitativa com trava de SLA de primeiro contato.
     - *Pilar 4 (Rastreamento & ROAS no WhatsApp)*: Links `wa.me` com tags de criativos e atribuição de receita por anúncio.
     - *Pilar 5 (Playbook do Closer)*: Scripts de quebra de objeções, ancoragem de preço e provas sociais.
     - *Pilar 6 (LTV & Back-end)*: Linha do tempo de compras e réguas de upsell pós-compra.
     - *Pilar 7 (Leaderboard Comerciais)*: Ranking ao vivo de faturamento, FRT e comissões.
     - *Pilar 8 (Follow-up Humanizado)*: Sequências com pausas randômicas e auto-cancelamento quando o lead responde.
- **Decisões Técnicas**:
  - Documentação centralizada em `docs/ROADMAP_DIRECT_RESPONSE_WHATSAPP.md` e referenciada no `README.md`.

---

## 35. Funis & Jornada do Cliente: Mapeamento de Experiência, Sub-Funis Vinculados e Raio-X Interativo
- **Data da Integração**: 26/08/2026
- **Funcionalidades**:
  1. **Expansão da Lousa para Jornada do Cliente (Customer Journey Mapping)**:
     - Adicionada a categoria `journey` no editor com blocos focados na psicologia e experiência do comprador:
       - `linked_funnel`: Macro-bloco de Sub-Funil Vinculado que conecta etapas da jornada a funis operacionais detalhados.
       - `pain_point`: Ponto de Dor / Problema Inicial do lead.
       - `hesitation_doubt`: Hesitação, Medo e Objeção Silenciosa.
       - `aha_moment`: Momento 'Aha!' (Ativação Rápida e Quick Win).
       - `friction_risk`: Ponto de Fricção e Alerta de Risco de Churn.
       - `delight_touch`: Toque de Encantamento e Fidelização.
       - `customer_emotion`: Termômetro Emocional do cliente (🤩 Encantado, 😄 Confiante, 😐 Neutro, 🤔 Inseguro, 😡 Frustrado).
  2. **Arquitetura de Sub-Funis Vinculados & Modal Raio-X**:
     - No card de `linked_funnel`, exibição de badge de etapas mapeadas, indicador de categoria e botões de ação:
       - Botão *Raio-X* (`Eye`): Abre modal interativo de pré-visualização completa com métricas de receita, etapas, conexões e tráfego sem sair da tela da jornada.
       - Botão *Abrir* (`ExternalLink`): Abre o funil em uma nova aba do navegador.
     - Inspetor lateral com dropdown de seleção de todos os funis da organização (`availableFunnels`) e campos de sentimento e responsável pelo ponto de contato (`touchpointOwner`).
  3. **Templates Oficiais & Filtros de Categoria**:
     - Novo template pré-construído: *"Jornada do Cliente: Do Lead Frio ao Fã & High-Ticket"* (`template-customer-journey-full`).
     - Adicionado filtro de categoria `🧭 Jornada do Cliente` em `FunnelArchitectListView.tsx`.
- **Decisões Técnicas**:
  - `shared/types.ts`: Atualização de `FunnelNodeType`, `FunnelCategory`, `FunnelNodeSubType` e propriedades `linkedFunnelId`, `linkedFunnelTitle`, `emotionLevel`, `touchpointOwner` em `FunnelNode`.
  - `src/domains/crm/constants/funnelTemplates.ts`: Inclusão dos 7 novos blocos de jornada no `FUNNEL_BLOCK_CATALOG` e novo template em `MARKET_FUNNEL_TEMPLATES`.
  - `FunnelArchitectEditorView.tsx`: Implementação do modal `previewSubFunnel`, renderizadores de cards personalizados, integração no `SUBTYPE_STAGE_MAP` e controle de inspetor.

---

## 36. Estúdio de Copywriting & Ativos de Conversão: VSL Storyline, Páginas de Venda em Dobras e Quiz com Simulador Interativo
- **Data da Integração**: 26/08/2026
- **Funcionalidades**:
  1. **Estúdio de Arquitetura de VSL (`VSLStudioEditorView.tsx`)**:
     - Timeline de blocos psicológicos para Video Sales Letters:
       - Ganchos A/B/C (Quebra de Padrão, Controvérsia, Prova Visual), Lead de Empatia, Inimigo Comum, História do Fundo do Poço, Novo Mecanismo Único, Pitch de Revelação, Empilhamento de Bônus, Quebra Cirúrgica de Objeções (Tempo, Dinheiro, Nicho), Ancoragem de Preço, Garantia Blindada e Escassez/CTA.
     - Calculadora de Ritmo & Minutagem WPM em tempo real (ex: 140 palavras/min).
     - Marcador de Ponto de Delay do Botão (liberação exata do checkout no player).
     - Exportação de roteiro de copy formatado em `.txt`.
  2. **Construtor Modular de Páginas de Vendas & Quiz (`PageQuizEditorView.tsx`)**:
     - *Modo Página de Vendas*: Montagem em dobras verticais (Hero com VSL e CTA, Espelho da Dor, Autoridade, Entregáveis, Provas Sociais, Box de Oferta, Garantia e FAQ).
     - *Modo Quiz Interativo*: Passos de diagnóstico, mini-VSLs, provas sociais, tela de carregamento com cálculo psicológico e oferta recomendada.
     - **Simulador Interativo Ao Vivo (Desktop & Mobile)**: Permite testar e avançar as perguntas do quiz na tela com animações e cálculo de progresso em tempo real.
  3. **Integração de Rotas & Hub Central**:
     - Filtros dedicados no cabeçalho de *Funis & Orquestração* (`🎬 Roteiros de VSL`, `📄 Páginas de Venda`, `🧠 Quizzes Interativos`).
     - Menu dropdown de criação com 4 opções (`Funil/Jornada`, `VSL`, `Página`, `Quiz`).
     - Links e atalhos rápidos no Inspetor do Canvas para blocos `vsl_page`, `sales_page` e `quiz_page`.
- **Decisões Técnicas**:
  - `shared/types.ts`: Adição dos tipos `VSLBlueprintData`, `VSLScriptBlock`, `PageQuizBlueprintData`, `PageQuizSection`.
  - `src/domains/crm/constants/vslPageTemplates.ts`: Catálogo de 14 blocos de VSL e templates oficiais (`DEFAULT_VSL_BLOCKS`, `DEFAULT_SALES_PAGE_SECTIONS`, `DEFAULT_QUIZ_SECTIONS`).
  - `src/app/router/AppRouter.tsx`: Rotas `/funnels/vsl/:id` e `/funnels/page-quiz/:id`.

---

## 37. Construtor Visual de Wireframe de Páginas de Venda: Canvas em Tempo Real, Layouts em Colunas e Edição In-Place
- **Data da Integração**: 26/08/2026
- **Funcionalidades**:
  1. **Quadro Central Visual com Scroll em Tempo Real (`PageQuizEditorView.tsx`)**:
     - Substituição de formulários estáticos por uma visualização WYSIWYG / Wireframe realista da página de vendas com moldura de navegador e rolagem vertical suave.
     - Alternador no topo entre visualização `🖥️ Desktop` (1200px lado a lado) e `📱 Mobile` (390px empilhado).
  2. **Motor de Disposição & Layouts em Colunas**:
     - Cada dobra possui uma barra flutuante de ferramentas rápidas para alternar entre 4 estilos de layout com 1 clique:
       - `1 Coluna Central (1_col_center)`: Super-Headline, Player VSL centralizado, Box de Preço, FAQ e CTA.
       - `2 Colunas Split 50/50 (2_col_split)`: Texto/Copy + Bullets na esquerda e Player VSL / Imagem na direita.
       - `2 Colunas Invertido (2_col_reverse)`: Imagem/Mockup na esquerda e Bullets de autoridade na direita.
       - `3 Colunas em Grade (3_col_grid)`: 3 Cards de Módulos/Entregáveis ou 3 Depoimentos de Prova Social com estrelas.
       - `Carta de Vendas (tsl_letter)`: Long-form copy estilizada com caixa de alerta e tipografia editorial de alta conversão.
  3. **Edição Direta In-Canvas & Inserção Dinâmica**:
     - Edição de títulos, subtítulos, bullets, badges e preços diretamente no próprio elemento renderizado.
     - Botão flutuante `[ + Inserir Bloco Aqui ]` entre quaisquer duas seções para encaixar novos blocos sem quebrar o fluxo.
     - Ações de mover (Cima / Baixo), duplicar e excluir dobras com feedback instantâneo.
- **Decisões Técnicas**:
  - `shared/types.ts`: Extensão de `PageQuizSection` com `layoutColumns` (`'1_col_center' | '2_col_split' | '2_col_reverse' | '3_col_grid' | 'tsl_letter'`), `bullets` e `gridCards`.
  - `src/domains/crm/constants/vslPageTemplates.ts`: Atualização das 8 dobras padrão do `DEFAULT_SALES_PAGE_SECTIONS` com layouts e cards ricos pré-configurados.

---

## 38. Motor Nativo de Exportação, Compilador de Briefings e Teleprompter Integrado
- **Data da Integração**: 26/08/2026
- **Funcionalidades**:
  1. **Compilador Nativo de Instruções & Briefing Estruturado (1-Clique)**:
     - No editor de VSL (`VSLStudioEditorView.tsx`) e de Páginas/Quiz (`PageQuizEditorView.tsx`), geração local de documentos de especificação técnica completa em `.txt`/`.md` com cópia para a área de transferência (`navigator.clipboard`) e download de arquivo.
  2. **Gerador Nativo de Código HTML + Tailwind Pronto para Publicação**:
     - Botão `[ ⚡ Baixar HTML ]` que compila as seções da página de vendas em um arquivo autônomo `pagina-de-vendas.html` com CDN Tailwind CSS, player responsivo, script nativo de delay do botão de checkout e FAQ interativo em JS puro.
  3. **Teleprompter Nativo em Tela Cheia para Gravação de VSL**:
     - Modal em tela cheia com fundo preto e tipografia gigante, rolagem automática sincronizada com WPM, controle de velocidade (1x a 6x), ajuste de fonte e linha guia do olhar do locutor.
---

## 39. Novos Blocos Visuais de Alta Conversão, Simulador Online em Tempo Real e Bloqueio de Modo
- **Data da Integração**: 26/08/2026
- **Funcionalidades**:
  1. **Novos Blocos Especializados de Página de Vendas**:
     - `image_banner`: Banner / Mockup centralizado em alta definição com legenda opcional.
     - `image_social_proof`: Mural de Prints e Notificações de Vendas (WhatsApp / Gateways) em grade 3x3 ou 2x2.
     - `cta_button_block`: Bloco dedicado de Botão de CTA pulsante com selos de segurança (100% Seguro, Acesso Imediato, 7 Dias de Garantia).
     - `urgency_timer`: Barra de escassez e urgência com cronômetro regressivo destacado.
     - `comparison_table`: Tabela comparativa direta (Mercado Tradicional ❌ vs Nosso Método ✅).
  2. **Novos Passos do Quiz Interativo**:
     - `quiz_image_choice`: Escolha visual com cards clicáveis contendo imagens e pontuação por nicho/perfil.
     - `quiz_mini_vsl`: Passo com mini-VSL de transição para aquecimento do lead antes de perguntas-chave.
     - `quiz_lead_capture`: Formulário de captura de dados (Nome + WhatsApp + E-mail) antes da revelação do resultado.
  3. **Visualizador Online da Página (`[ 🌐 Visualizar Online ]`)**:
     - Modal de tela cheia limpo (zero controles de edição) com alternador Desktop/Mobile que simula o site 100% publicado e interativo (vídeo funcional, FAQ expansível e teste de clique no CTA).
  4. **Bloqueio de Modo Baseado no Ativo**:
     - Remoção do alternador manual de modo no cabeçalho. O editor agora carrega o catálogo e layout específico (Página ou Quiz) selecionado no momento da criação ou abertura do ativo.
- **Decisões Técnicas**:
  - `shared/types.ts`: Atualização de `PageQuizSectionType` e inclusão das interfaces de suporte (`imageGallery`, `comparisonData`, `ctaData`, `leadCaptureData`).









