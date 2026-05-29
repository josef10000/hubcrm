/**
 * Shared Types — Contratos compartilhados entre API (Node.js/Vercel) e Frontend (React)
 * 
 * REGRA: Nunca importe módulos específicos de ambiente aqui (React, firebase-admin, etc.)
 * Apenas tipos puros e interfaces.
 */

// ── Permissões ──────────────────────────────────────────────────────────────────

export type AppPermission = 
  | 'VIEW_DASHBOARD'
  | 'MANAGE_LEADS'
  | 'MANAGE_CLIENTS'
  | 'MANAGE_FINANCE'
  | 'MANAGE_TEAM'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_WIKI'
  | 'MANAGE_SUPPORT'
  | 'VIEW_REPORTS';

export interface CustomRole {
  id: string;
  name: string;
  level: number;
  permissions: AppPermission[];
  isDefault: boolean;
  createdAt: number;
}

// Para compatibilidade legada
export type CustomRoleBase = CustomRole;
export type UserRole = CustomRole;

// ── Auditoria ───────────────────────────────────────────────────────────────────

export type AuditTargetType = 'lead' | 'client' | 'contract' | 'transaction' | 'role' | 'team';

export interface AuditLogEntry {
  orgId: string;
  userId: string;
  userName: string;
  action: string;
  targetId: string;
  targetType: AuditTargetType;
  details: string;
  metadata?: Record<string, any>;
  timestamp?: number;
}

// ── Perfil de Usuário ───────────────────────────────────────────────────────────

export interface OnboardingTask {
  id: string;
  task: string;
  completed: boolean;
  completedAt?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  orgId: string;
  role: CustomRole | string; 
  roleId?: string;
  permissions?: string[];
  createdAt: number;
  updatedAt?: number;
  jobTitle?: string;
  bio?: string;
  photoURL?: string;
  phoneNumber?: string;
  instagram?: string;
  linkedin?: string;
  reportsTo?: string;
  birthDate?: string; 
  startDate?: string;
  onboardingTasks?: OnboardingTask[];
  pdiCategories?: { id: string; title: string; actions: { id: string; description: string; completed: boolean; completedAt?: number; }[]; }[];
  onboardingTemplateId?: string;
  lastEnpsResponse?: number;
  viewedWikiArticles?: string[];
  readAlerts?: string[];
  acceptedInviteAt?: number;

  // People & Culture Ecosystem
  inventory?: ToolAsset[];
  skills?: SkillMatrix;
  careerTimeline?: CareerMilestone[];
  feedbacks?: FeedbackItem[];
  moodLogs?: MoodLog[];
  lastBirthdayEmailYear?: number;
  pdiItems?: PDIItem[];

  // Personalization & Well-being
  wallpaperUrl?: string;
  soundTheme?: 'none' | 'zen' | 'tech';
  avatarFrame?: 'none' | 'neon' | 'gold' | 'floral' | 'cyberpunk' | 'ruby' | 'ocean' | 'dark' | 'rainbow' | 'silver';
  myCorner?: {
    phrase: string;
    links: { title: string; url: string }[];
    notes: string;
  };

  // Presence System
  presenceStatus?: 'online' | 'away' | 'offline' | 'lunch' | 'meeting';
  isManualStatus?: boolean;
  lastSeen?: number;

  // Contract & Work Schedule Systems
  contractType?: 'CLT' | 'PJ';
  workSchedule?: {
    daysOfWeek: number[]; // 0 = Domingo, 1 = Segunda, etc.
    entryTime: string;    // "HH:MM"
    exitTime: string;     // "HH:MM"
  };

  // Library Integration
  readingProgress?: Record<string, { currentPage: number; totalPages: number }>;

  // Arena Gamification & Economy
  arenaCredits?: number;
  unlockedTitles?: string[];
  activeTitle?: string;
  unlockedFrames?: string[];
  department?: string;
  claimedReadingClubs?: string[];
}

export type UserProfileBase = UserProfile;

// ── CRM: Clientes ───────────────────────────────────────────────────────────────

export type SiteStatus = 'Em Desenvolvimento' | 'Ativo' | 'Inadimplente' | 'Cancelado';
export type PlanType = string;

export interface ClientLog {
  id: string;
  text: string;
  date: number;
}

export interface EmailHistoryEntry {
  id: string;
  type: 'WELCOME' | 'INVOICE' | 'OVERDUE' | 'RECEIPT' | 'WELCOME_SUBSCRIPTION' | 'WELCOME_LINK';
  status: 'sent' | 'failed';
  sentAt: number;
  recipient: string;
  subject: string;
}

export interface ClientAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: number;
}

export interface ClientStage {
  id: string;
  name: string;
  completed: boolean;
  approvedAt?: number | null;
  link?: string;
  description?: string;
}

export interface ClientCredential {
  id: string;
  url: string;
  username: string;
  password?: string;
  notes?: string;
  createdAt: number;
}

export interface ClientContract {
  id: string;
  title?: string;
  type: 'pdf' | 'text';
  content: string;
  status: 'pending' | 'signed';
  createdAt: number;
  signedAt?: number;
  signedIp?: string;
  signedUserAgent?: string;
  signatureName?: string;
}

export interface ClientPlan {
  id: string;
  offerId: string;
  name: string;
  type: 'SUBSCRIPTION' | 'SINGLE';
  price: number;
  status: 'Ativo' | 'Em Desenvolvimento' | 'Inadimplente' | 'Cancelado' | 'Pendente';
  asaasSubscriptionId?: string;
  asaasPaymentId?: string;
  invoiceUrl?: string;
  nextDueDate?: string;
  createdAt: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  status: SiteStatus;
  plan: string;
  offerId?: string;
  planPrice: number;
  setupPrice: number;
  billingCycle?: 'MONTHLY' | 'YEARLY';
  billingType?: 'CREDIT_CARD' | 'PIX' | 'BOLETO' | 'UNDEFINED';
  isCombo?: boolean;
  maxInstallments?: number;
  firstPaymentDate?: string;
  recurringPaymentDay?: number;
  welcomeEmailSent?: boolean;
  sentEvents?: string[];
  plans?: ClientPlan[];
  attachments?: ClientAttachment[];
  stages?: ClientStage[];
  contracts?: ClientContract[];
  cpfCnpj?: string;
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
  invoiceUrl?: string;
  paymentStatus?: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'N/A';
  nextDueDate?: string;
  deliveryDate?: string;
  onboardingAnswers?: Record<string, string>;
  referralCode?: string;
  referredBy?: string;
  referralBalance?: number;
  referralCount?: number;
  referralsByMonth?: Record<string, number>;
  referralRewardType?: 'commission' | 'discount';
  currentDiscount?: number;
  referralConfirmed?: boolean;
  npsScore?: number;
  npsComment?: string;
  npsSubmittedAt?: any;
  comboRenewalDate?: string;
  leadSource?: 'Indicação' | 'Google Ads' | 'Tráfego Orgânico' | 'Prospecção Manual' | 'Instagram' | 'WhatsApp Direto' | 'Parceiro';
  customMonthlyPrice?: number;
  customSetupPrice?: number;
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  asaasNotificationsEnabled?: boolean;
  emailHistory?: EmailHistoryEntry[];
  assignedTo?: string;
  tagIds?: string[];
  updatedAt?: number;
  createdAt: number | any;
  siteLink?: string;
  niche?: string;
  notes?: string;
  logs?: ClientLog[];
  lastContactAt?: number;
  publicToken?: string;
  isCourtesy?: boolean;
  orgId?: string;
}

export type ClientBase = Client;

/** @deprecated Use Transaction with type 'EXPENSE' instead */
export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: number;
  category: string;
  clientId?: string;
  offerId?: string;
}

// ── CRM: Leads ─────────────────────────────────────────────────────────────────

export type LeadStatus = 'Novo' | 'Em Contato' | 'Negociação' | 'Convertido' | 'Perdido';

export interface LeadActivity {
  id: string;
  type: 'note' | 'call' | 'message' | 'meeting' | 'status_change';
  text: string;
  date: number;
  userName: string;
}

export interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  cpfCnpj?: string;
  status: LeadStatus;
  leadSource?: string;
  estimatedValue?: number;
  notes?: string;
  plan?: PlanType;
  niche?: string;
  createdAt: number;
  updatedAt?: number;
  convertedClientId?: string;
  lostReason?: string;
  assignedTo?: string;
  activities?: LeadActivity[];
  nextFollowUp?: number;
  tagIds?: string[];
  orgId?: string;
}

// ── Financeiro: Transações ─────────────────────────────────────────────────────

export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type TransactionGroup = 
  | 'Receita Bruta' 
  | 'Deduções' 
  | 'CMV' 
  | 'Despesas Operacionais' 
  | 'Despesas Não-Operacionais'
  | 'Impostos'
  | 'Investimentos';

export interface TransactionCategory {
  id: string;
  name: string;
  type: TransactionType;
  group?: TransactionGroup;
  color?: string;
  isCustom?: boolean;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  netAmount?: number;
  gatewayFee?: number;
  taxAmount?: number;
  date: number;
  paymentDate?: number;
  type: TransactionType;
  status: TransactionStatus;
  categoryId: string;
  categoryName?: string;
  clientId?: string;
  offerId?: string;
  bankAccountId?: string;
  referenceId?: string;
  recurring?: boolean;
  notes?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: 'MONTHLY' | 'YEARLY';
  year: number;
  month?: number;
}

export interface Offer {
  id: string;
  name: string;
  type: 'SUBSCRIPTION' | 'SINGLE';
  price: number;
  setupPrice?: number;
  maxInstallments?: number;
  description?: string;
  order?: number;
  displayContext?: 'CHECKOUT' | 'PORTAL' | 'BOTH';
  active: boolean;
  commissionValue?: number;
  isMostHired?: boolean;
  details?: string;
  createdAt: number;
}

export interface CommissionEntry {
  id: string;
  clientId: string;
  clientName: string;
  userId: string; 
  userName: string;
  amount: number;
  date: number;
  status: 'PENDING' | 'PAID';
  offerName: string;
  paymentId?: string;
}

// ── Suporte e Wiki ─────────────────────────────────────────────────────────────

export interface SupportRequest {
  id: string;
  clientId: string;
  clientName: string;
  category: string;
  message: string;
  status: 'aberto' | 'em_analise' | 'concluido';
  createdAt: any;
  priority?: 'baixa' | 'media' | 'alta';
  assignedTo?: string;
  assignedName?: string;
  reply?: string;
  repliedAt?: any;
  csatScore?: number;
  csatComment?: string;
  csatAt?: any;
  slaDeadline?: any;
  origin?: 'portal' | 'whatsapp' | 'interno';
  whatsappContext?: string;
  imageUrl?: string;
}

export interface WikiComment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: number;
  likedBy: string[];
}

export type WikiCategory = 'RH' | 'Vendas' | 'Técnico' | 'Atendimento' | 'Suporte' | 'Geral';

export interface WikiArticle {
  id: string;
  title: string;
  content: string;
  categories: WikiCategory[];
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  viewCount: number;
  stars: string[];
  allowedRoles?: CustomRole[];
  allowedUserIds?: string[];
  imageUrl?: string;
  isPopular?: boolean;
  relatedBookId?: string;
}

// ── Pessoas & Cultura (Sub-entidades) ───────────────────────────────────────────

export interface ToolAsset {
  id: string;
  name: string;
  category: 'Notebook' | 'Monitor' | 'Celular' | 'Cadeira' | 'Periférico' | 'Outro';
  serialNumber?: string;
  condition: 'Novo' | 'Bom' | 'Desgastado' | 'Danificado';
  assignedAt: number;
}

export interface Skill {
  name: string;
  level: number; 
}

export interface SkillMatrix {
  hard: Skill[];
  soft: Skill[];
}

export interface CareerMilestone {
  id: string;
  type: 'hired' | 'promotion' | 'milestone' | 'certification';
  title: string;
  date: number;
  description?: string;
}

export interface FeedbackItem {
  id: string;
  fromId: string;
  fromName: string;
  type: 'kudo' | 'feedback';
  text: string;
  date: number;
  isPrivate: boolean;
  tags?: string[];
}

export interface FeedbackRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  message?: string;
  status: 'pending' | 'completed' | 'declined';
  createdAt: number;
  completedAt?: number;
}

export interface MoodLog {
  id: string;
  score: number;
  date: number;
  emoji: string;
}

export interface PDIItem {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  completedAt?: number;
  dueDate?: number;
  category?: string;
}

// ── OKRs e Metas ───────────────────────────────────────────────────────────────

export interface KeyResult {
  id: string;
  title: string;
  initialValue: number;
  currentValue: number;
  targetValue: number;
  metric: string;
  autoUpdateSource?: 'transactions' | 'clients' | 'none';
}

export interface Objective {
  id: string;
  title: string;
  ownerId: string;
  type: 'company' | 'department' | 'individual';
  progress: number;
  period: string;
  keyResults: KeyResult[];
  createdAt: number;
  updatedAt?: number;
}

// ── Organização e Sistema ───────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  adminId: string;
  createdAt: number;
}

export type InviteStatus = 'pending' | 'accepted' | 'expired';

export interface Invitation {
  id: string;
  email: string;
  orgId: string;
  role: CustomRole | string;
  token: string;
  status: InviteStatus;
  createdAt: number;
  expiresAt: number;
  invitedBy: string;
  acceptedBy?: string;
  acceptedAt?: number;
}

export type InvitationBase = Invitation;

export interface BusinessAlert {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'cron';
  targetRoles: CustomRole[];
  userId?: string;
  orgId: string;
  createdAt: number;
  link?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

// ── Contratos de Resposta da API ────────────────────────────────────────────────

export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  count?: number;
}

export interface ApiErrorResponse {
  success?: false;
  error: string;
  code?: string;
  status?: number;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface TeamListResponse {
  success: true;
  members: UserProfile[];
  invites: Invitation[];
}

export interface TeamInvitePayload {
  email: string;
  role: string;
  collaboratorName: string;
}

export interface TeamRemovePayload {
  targetUid: string;
  deleteAllData: boolean;
}

export interface TeamUpdateProfilePayload {
  targetUid: string;
  profileData: {
    jobTitle?: string;
    roleId?: string;
    reportsTo?: string | null;
    birthDate?: string | null;
  };
}

export interface BroadcastPayload {
  uids: string[];
  hasButton: boolean;
  buttonUrl?: string;
}

// ── Torneios Eliminatórios (Hub Arena) ──────────────────────────────────────────

export interface TournamentMatch {
  matchId: string | null;
  p1: string | null;
  p1Name?: string;
  p2: string | null;
  p2Name?: string;
  winnerId?: string | null;
}

export interface TournamentBracket {
  quarterfinals?: TournamentMatch[];
  semifinals: TournamentMatch[];
  final: TournamentMatch;
}

export interface Tournament {
  id: string;
  name: string;
  gameType: 'chess' | 'checkers' | 'connect4' | 'ludo';
  status: 'registration' | 'active' | 'finished';
  maxPlayers: 4 | 8;
  participants: string[];
  bracket: TournamentBracket;
  winnerId?: string | null;
  orgId: string;
  createdAt: number;
}
