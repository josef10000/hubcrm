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
