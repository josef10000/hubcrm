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
  createdAt: Timestamp;
}

export interface TypingIndicator {
  displayName: string;
  timestamp: Timestamp;
}
