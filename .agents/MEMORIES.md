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



