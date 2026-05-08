# 🔌 HubCRM - Documentação de APIs Externas

Este documento elenca todas as APIs externas integradas ao sistema HubCRM, explicando sua funcionalidade, contexto de uso e status de integração.

---

## 🛠️ Infraestrutura e Core

### 1. Firebase (Google)
- **Contexto**: Core do Sistema.
- **Uso**: 
  - **Authentication**: Gerenciamento de login, persistência de sessão e convites de membros.
  - **Firestore**: Banco de dados NoSQL em tempo real para leads, clientes, tarefas e chats.
- **Status**: Ativo (Essencial).

### 2. Sentry.io
- **Contexto**: Monitoramento de Erros.
- **Uso**: Captura de bugs em tempo real no front-end para facilitar o debug e garantir estabilidade.
- **Status**: Ativo.

---

## 🖼️ Armazenamento de Ativos (Assets)

### 3. Cloudinary
- **Contexto**: Gestão de Mídias e Documentos.
- **Uso**: 
  - Upload de PDFs da **Nexus Digital Library**.
  - Upload de fotos de perfil de colaboradores e clientes.
  - Otimização automática de imagens via CDN.
- **Status**: Ativo (Novo padrão).

### 4. ImgBB
- **Contexto**: Hospedagem de Imagens (Legado).
- **Uso**: Utilizado anteriormente para uploads rápidos. Está sendo gradualmente substituído pelo Cloudinary para maior estabilidade e centralização.
- **Status**: Em fase de migração para Cloudinary.

---

## 🗺️ Geolocalização e Dados Governamentais

### 5. Brasil API
- **Contexto**: Enriquecimento de Dados.
- **Uso**: 
  - Busca de endereço por **CEP**.
  - Consulta de dados de empresas via **CNPJ**.
  - Listagem de feriados nacionais para o **Calendário**.
- **Status**: Ativo.

### 6. ViaCEP
- **Contexto**: Localização.
- **Uso**: API secundária de fallback para busca de endereços via CEP.
- **Status**: Ativo (Redundância).

### 7. Nominatim (OpenStreetMap)
- **Contexto**: Mapas.
- **Uso**: Geocodificação (converter endereço em coordenadas) para o **ClientMapView**.
- **Status**: Ativo.

---

## 📚 Produtividade e Ferramentas

### 8. Google Books API
- **Contexto**: Nexus Digital Library.
- **Uso**: Preenchimento automático de metadados (capa, autor, data, descrição) ao catalogar novos livros.
- **Status**: Ativo.

### 9. Giphy API
- **Contexto**: Comunicação Social.
- **Uso**: Busca e inserção de GIFs animados nas janelas de chat interno.
- **Status**: Ativo.

### 10. ZenQuotes (via AllOrigins)
- **Contexto**: My Corner Widget.
- **Uso**: Gera frases motivacionais aleatórias no painel de produtividade do usuário.
- **Status**: Ativo.

---

## 🔒 Segurança e Rastreabilidade

### 11. Ipify
- **Contexto**: Segurança.
- **Uso**: Captura o IP do usuário no momento da assinatura de contratos e acesso ao portal para fins de auditoria e segurança.
- **Status**: Ativo.

---

## 🔗 Serviços de Terceiros (Links Diretos)

- **WhatsApp (wa.me)**: Integração direta para contato rápido com leads e clientes via link.
- **Google Drive / Dropbox**: Armazenamento externo para arquivos pesados (PDFs > 10MB) na biblioteca.
- **Registro.br**: Link de indicação para clientes no portal de onboarding.

---

> [!NOTE]
> Todas as APIs listadas são utilizadas em seus **Planos Gratuitos** ou "Community Tier", respeitando os limites de quota de cada provedor para garantir o funcionamento do HubCRM sem custos fixos de API.
