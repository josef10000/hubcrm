import { Timestamp } from 'firebase/firestore';

export interface Chat {
  id: string;
  name: string;                       // "Equipe Comercial", "Meu Espaço", "José ↔ Maria"
  type: "group" | "self" | "direct";  // Grupo, Anotações Privadas, Conversa 1:1
  orgId: string;                      // Isolamento multi-tenant
  members: string[];                  // UIDs permitidos (máx ~40)
  adminIds: string[];                 // Quem pode editar nome, adicionar/remover membros
  avatarUrl?: string;                 // Foto do grupo (opcional)

  // === DENORMALIZAÇÃO DE PERFORMANCE ===
  lastMessage: {
    text: string;
    senderId: string;
    senderName: string;
    createdAt: Timestamp;
  } | null;

  // Contador de mensagens não lidas POR USUÁRIO
  unreadCount: { [uid: string]: number };

  // Contador ESPECÍFICO de menções (@) por usuário
  unreadMentions: { [uid: string]: number };

  // Último timestamp lido por usuário
  lastRead: { [uid: string]: Timestamp };

  // Mensagens Fixadas (Array de IDs)
  pinnedMessages?: string[];

  createdAt: Timestamp;
  updatedAt: Timestamp;               // Usado para orderBy na listagem
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;                 
  senderPhotoURL?: string;            
  attachments: string[];              // URLs do ImgBB
  mentions: string[];                 // UIDs marcados (SEMPRE array)
  replyTo?: {                         // Resposta a outra mensagem
    messageId: string;
    text: string;
    senderName: string;
  } | null;
  reactions?: {                       // Reações: emoji -> array de UIDs
    [emoji: string]: string[];
  };
  isDeleted?: boolean;                // Flag para mensagens apagadas
  isEdited?: boolean;                 // Flag para mensagens editadas
  readBy?: string[];                  // Lista de UIDs que leram esta mensagem
  mentionAll?: boolean;               // Se @todos foi usado
  type?: "text" | "poll" | "approval" | "system" | "rich_link"; // Tipo da mensagem
  poll?: {                            // Dados da enquete
    question: string;
    options: {
      id: string;
      text: string;
      votes: string[];                // UIDs dos votantes
    }[];
  };
  approval?: {                        // Pedidos de Aprovação
    question: string;
    status: 'pending' | 'approved' | 'rejected';
    type: 'discount' | 'holiday' | 'expense' | 'other';
    targetId?: string;                // ID do Lead, Proposta, etc.
    value?: any;                      // Valor do desconto, data da folga, etc.
    processedBy?: string;             // UID de quem aprovou/rejeitou
    processedAt?: Timestamp;
  };
  richPreview?: {                     // Preview de Link Interno
    title: string;
    description: string;
    image?: string;
    status?: string;
    value?: string;
    url: string;
  };
  createdAt: Timestamp;
}

export interface MessageBookmark {
  id: string;
  messageId: string;
  chatId: string;
  text: string;
  senderName: string;
  senderPhotoURL?: string;
  category?: string;                  // Ex: "Regra", "Financeiro"
  categoryColor?: string;             // HEX ou Tailwind color
  savedAt: Timestamp;
}

export interface TypingIndicator {
  displayName: string;
  timestamp: Timestamp;
}
