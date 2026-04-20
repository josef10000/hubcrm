# 💬 Hub Chat Module Documentation (v4.3.3)

O **Hub Chat** é o ecossistema de comunicação em tempo real proprietário da Hub Symples, integrado nativamente ao Hub Central. Ele elimina a necessidade de ferramentas externas para a operação diária, unindo produtividade, governança e agilidade.

---

## 🚀 Novas Funcionalidades (Productivity Hub)

A versão **4.3.3** transformou o chat em uma central de comando operacional:

### 1. ✅ Aprovações Nativas (Approval Cards)
Em vez de pedidos de autorização perdidos em texto, agora é possível enviar "Cards de Aprovação" estruturados.
- **Uso Comum:** Pedidos de desconto, autorização de reembolso, folgas ou exceções em contratos.
- **Integração:** O clique em "Aprovar" ou "Rejeitar" atualiza o banco de dados e pode disparar automações no CRM (ex: liberar desconto em um Lead).

### 2. ⭐ Mensagens Salvas (Bookmarks)
Funcionalidade de "favoritar" mensagens para consulta rápida ou referência futura.
- **Acesso:** Itens salvos ficam disponíveis em uma aba dedicada na barra lateral ("Itens Salvos").
- **Persistence:** Sincronização em tempo real entre todos os dispositivos do usuário.

### 3. 🔗 Pré-visualização Inteligente (Rich Previews)
Ao colar um link interno do Hub CRM (ex: link de um Lead, Fatura ou Contrato), o chat gera automaticamente um card de visualização.
- **Dados Exibidos:** Título do registro, status atual, valor e imagem (se houver).
- **Agilidade:** Permite entender o contexto do link sem precisar sair da janela de chat.

### 4. 📌 Mensagens Fixadas 2.0 (Pinned Messages)
Sistema de avisos no topo do chat com alta fidelidade.
- **Reatividade Real-time:** Não requer recarregamento (F5) para aparecer.
- **Empilhamento:** Suporte para múltiplas mensagens fixadas exibidas de forma organizada (stacked).

### 5. 😎 Jumbo Emojis
Detecção automática de mensagens contendo apenas um emoji.
- **Visual:** O emoji é renderizado em tamanho gigante (`4xl`), facilitando reações visuais rápidas e maior expressividade.

---

## 🎨 Escala Oficial de Design (UI/UX)

O Chat segue rigorosamente a **Tabela de Escala Oficial** do Hub Central para garantir consistência visual:

| Elemento | Tamanho (px) | Classe Tailwind |
|---|---|---|
| **Grid / Gap** | 4px / 8px / 16px | `gap-1`, `gap-2`, `gap-4` |
| **Metadados** | 11px a 12px | `text-xs` |
| **Corpo (Padrão)** | 14px | `text-sm` |
| **Subtítulos** | 16px | `text-base semibold` |
| **Títulos** | 18px a 20px | `text-lg bold` |
| **Ícones Cabeçalho**| 24px | `w-6 h-6` |
| **Ícones secundários**| 16-20px | `w-4 h-4` / `w-5 h-5` |
| **Avatares** | 36px | `w-9 h-9` |

---

## 🛠️ Detalhes Técnicos

### Arquitetura de Dados (Firebase)
O chat utiliza o Firestore para persistência e atualizações em tempo real:
- `/organizations/{orgId}/chats/{chatId}`: Metadados do chat e lista de pins.
- `/messages`: Sub-coleção com o histórico de conversas.
- `/users/{userId}/bookmarks`: Sub-coleção privada para itens salvos.

### Hooks Customizados
- `useChat`: Gerencia mensagens, envio, reações, pins e aprovações.
- `useBookmarks`: Gerencia a persistência e visualização de favoritos do usuário logado.

### Segurança (Firestore Rules)
Regras granulares garantem que:
1. Apenas membros do chat leiam as mensagens.
2. Apenas administradores ou remetentes editem/excluam dados.
3. Bookmarks sejam estritamente privados ao proprietário.

---

## 🔐 Governança
Todas as interações são auditáveis e associadas ao cargo (`role`) do colaborador no CRM, mantendo a integridade da comunicação corporativa.
