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
  clientId?: string;
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

  // Financial / Compensation (visível apenas para Admin/RH)
  salary?: number;           // Salário base ou pró-labore
  healthInsurance?: number;  // Plano de saúde
  mealVoucher?: number;      // Vale-refeição
  transportVoucher?: number; // Vale-transporte
  homeOfficeAux?: number;    // Auxílio home-office
  benefitDeductions?: {
    healthInsuranceCopay?: number;
    mealVoucherDiscount?: number;
    transportVoucherDiscount?: number;
  };
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  pixKey?: string;
  bankAccount?: {
    bankCode: string;
    bankName?: string;
    agency: string;
    account: string;
    accountDigit: string;
    accountType: 'CHECKING' | 'SAVINGS';
    holderName: string;
    holderCpfCnpj: string;
  };
  resignationDetails?: {
    resignationDate: string;
    reason: 'dismissal_without_cause' | 'dismissal_with_cause' | 'employee_resignation' | 'pj_termination';
    noticeType: 'worked' | 'indemnified' | 'none';
    penaltyPercentage?: number;
  };

  // Ecossistema de Contratos Digitais (Legal)
  contracts?: UserContract[];

  // Library Integration
  readingProgress?: Record<string, { currentPage: number; totalPages: number }>;

  // Arena Gamification & Economy
  arenaCredits?: number;
  unlockedTitles?: string[];
  activeTitle?: string;
  unlockedFrames?: string[];
  department?: string;
  claimedReadingClubs?: string[];
  lastTriviaCompletedDate?: string;
}

export interface UserContract {
  id: string;                 // ID único do contrato gerado
  templateId: string;         // ID do template de origem
  title: string;              // Título do documento
  bodyText: string;           // Texto final gerado (com as variáveis resolvidas)
  status: 'pending' | 'signed';
  createdAt: number;          // Data de envio
  signedAt?: number;          // Data da assinatura
  ip?: string;                // IP registrado no client
  userAgent?: string;         // Dispositivo/Browser
  signatureText?: string;     // Nome completo digitado
  cpfCnpj?: string;           // Documento inserido pelo usuário
  rg?: string;                // RG inserido pelo usuário
  hash?: string;              // Hash de segurança SHA-256 do texto + metadados
  type?: 'work_clt' | 'work_pj' | 'asset_term'; // Tipo do documento (CLT, PJ vs Termo)
  assetId?: string;           // ID do ativo patrimonial vinculado (se for termo)
}

export interface ContractTemplate {
  id: string;
  title: string;              // Ex: "Contrato de Prestação de Serviços PJ"
  bodyText: string;           // Conteúdo em Markdown com tags dinâmicas
  associatedRoleId?: string;  // Vinculado a um cargo específico (opcional)
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  type?: 'work_clt' | 'work_pj' | 'asset_term'; // Tipo do modelo (CLT, PJ vs Termo)
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
  productType?: 'portal_hub' | 'saas_cobranca' | 'outros';
  integrationCode?: string;
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
  portalLinked?: boolean;
  portalEmail?: string;
  portalUserUid?: string;
  portalLinkedAt?: any;
  portalActivationCode?: string;
  brandAssets?: BrandAssets;
  companyName?: string;
  company?: string;
  phone?: string;
  isAvulso?: boolean;
  onboardingCompleted?: boolean;
}

export interface BrandAssetLogo {
  name: string;
  url: string;
}

export interface BrandAssetLink {
  title: string;
  url: string;
}

export interface BrandAssets {
  logoUrl?: string;
  logos?: BrandAssetLogo[];
  colors?: string[]; // Array de strings HEX
  typography?: string;
  customCanvaLinks?: BrandAssetLink[];
}

export type GrowthAssetType = 'video' | 'pdf' | 'script' | 'template' | 'audio';

export interface GrowthAsset {
  id: string;
  title: string;
  type: GrowthAssetType;
  url: string; // link do youtube, drive, canva, etc.
  content?: string; // para textos de scripts de vendas
  category: string;
  createdAt?: number;
  updatedAt?: number;
}

export type ClientBase = Client;

export interface ArticleBlock {
  type: 'paragraph' | 'heading' | 'quote' | 'cta';
  text?: string;
  ctaText?: string;
  ctaAction?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: 'Gestão' | 'Vendas' | 'Finanças' | 'Marketing' | 'Geral';
  imageUrl: string;
  publishedAt: string;
  readTime: string;
  likes: number;
  views: number;
  author: {
    name: string;
    role: string;
    avatarUrl: string;
  };
  blocks: ArticleBlock[];
  createdAt: any;
  status?: 'draft' | 'published';
  featured?: boolean;
  audioUrl?: string;
}


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

export interface OrderBump {
  id: string;
  title: string;
  description: string;
  price: number;
  highlightTag?: string;
  linkedOfferId?: string;
  active?: boolean;
}

export interface ICP {
  id: string;
  name: string;
  targetType?: 'B2B' | 'B2C';
  niche?: string;
  companySize?: string;
  decisionMakerRole?: string;
  avgTicket?: number;
  ageGroup?: string;
  gender?: string;
  incomeRange?: string;
  lifestyleInterests?: string[];
  painPoints?: string[];
  desires?: string[];
  objections?: string[];
  channels?: string[];
  pitchNotes?: string;
  linkedOfferIds?: string[];
  active?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface TestimonialItem {
  id: string;
  name: string;
  roleCompany?: string;
  avatarUrl?: string;
  rating?: number;
  comment: string;
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
  logoUrl?: string;
  accentColor?: string;
  benefits?: string[];
  customContractText?: string;
  hasPortalAccess?: boolean;
  guaranteeText?: string;
  testimonials?: TestimonialItem[];
  orderBumps?: OrderBump[];
  icpId?: string;
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
  category: 'Notebook' | 'Monitor' | 'Celular' | 'Cadeira' | 'Periférico' | 'Outro' | 'Hardware' | 'Software' | 'Acesso';
  serialNumber?: string;
  condition: 'Novo' | 'Bom' | 'Desgastado' | 'Danificado';
  assignedAt: number;
  purchaseDate?: string;
  specifications?: string;
  assetCode?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToJobTitle?: string;
  status?: 'Em uso' | 'Devolvido' | 'Manutenção' | 'Estoque';
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
  templateId?: string; // ID do template de contrato atrelado a este convite
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

// ── Laboratório de Ofertas ──────────────────────────────────────────────────────

export type OfferStatus = 'draft' | 'validating' | 'active' | 'archived';

export interface OfferBlueprint {
  id?: string;
  title: string;
  catchyName?: string;
  status: OfferStatus;
  productId: string;
  icpId: string;
  
  promise: string;
  mechanism: string;
  deliverables: string;
  bonuses: string;
  guarantee: string;
  pricingAnchoring: string;
  scratchpad: string;

  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

// ── Funis & Orquestração de Processos ──────────────────────────────────────────

export type FunnelCategory = 'perpetual' | 'launch' | 'organic' | 'high_ticket' | 'community' | 'b2b' | 'cs' | 'journey' | 'vsl_script' | 'sales_page' | 'quiz_funnel' | 'custom';
export type FunnelStatus = 'draft' | 'building' | 'active' | 'archived';

// ── 🎬 ESTÚDIO DE ARQUITETURA DE VSL (ROTEIROS & STORYLINE) ─────────────────────

export type VSLBlockType = 
  | 'hook_a' | 'hook_b' | 'hook_c'
  | 'lead_empathy'
  | 'enemy_myth'
  | 'hero_story'
  | 'unique_mechanism'
  | 'epiphany_method'
  | 'offer_pitch'
  | 'bonus_stack'
  | 'objection_crusher'
  | 'price_anchor'
  | 'guarantee_dual'
  | 'urgency_cta';

export interface VSLScriptBlock {
  id: string;
  type: VSLBlockType;
  title: string;
  notes?: string;
  scriptText: string;
  bulletPoints?: string[];
  isPitchPoint?: boolean; // Ponto em que a oferta é revelada (botão de delay)
  targetDurationSeconds?: number;
  wordCount?: number;
}

export interface VSLBlueprintData {
  targetWPM: number; // Padrão: 140 palavras por minuto
  totalWords: number;
  estimatedDurationSeconds: number;
  pitchDelaySeconds: number;
  blocks: VSLScriptBlock[];
}

// ── 📄 CONSTRUTOR MODULAR DE PÁGINAS & QUIZ INTERATIVO ─────────────────────────

export type PageQuizSectionType = 
  | 'hero_vsl'
  | 'pain_mirror'
  | 'authority_bio'
  | 'mechanism_info'
  | 'module_grid'
  | 'social_proof_wall'
  | 'bonus_cards'
  | 'pricing_box'
  | 'guarantee_seal'
  | 'faq_accordion'
  | 'image_banner'
  | 'image_social_proof'
  | 'cta_button_block'
  | 'urgency_timer'
  | 'comparison_table'
  | 'quiz_question'
  | 'quiz_image_choice'
  | 'quiz_mini_vsl'
  | 'quiz_social_proof'
  | 'quiz_lead_capture'
  | 'quiz_diagnostic_loading'
  | 'quiz_result_pitch'
  | 'custom_html';

export interface QuizOptionItem {
  id: string;
  label: string;
  sublabel?: string;
  iconName?: string;
  imageUrl?: string;
  score?: number;
  nextSectionId?: string;
}

export interface TestimonialItem {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  quote: string;
  rating?: number;
  mediaType?: 'text' | 'image' | 'video';
  mediaUrl?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface GridCardItem {
  id: string;
  title: string;
  description: string;
  badge?: string;
  iconName?: string;
  imageUrl?: string;
}

export interface PageQuizSection {
  id: string;
  type: PageQuizSectionType;
  layoutColumns?: '1_col_center' | '2_col_split' | '2_col_reverse' | '3_col_grid' | 'tsl_letter';
  title: string;
  subtitle?: string;
  badge?: string;
  
  // Conteúdo de Mídia & Visual
  headline?: string;
  bodyText?: string;
  bullets?: string[];
  videoUrl?: string;
  videoDelaySeconds?: number;
  imageUrl?: string;
  imageCaption?: string;
  buttonText?: string;
  buttonLink?: string;
  
  // Elementos Estruturais
  gridCards?: GridCardItem[];
  imageGallery?: { id: string; title: string; imageUrl?: string; caption?: string }[];
  comparisonData?: {
    competitorTitle: string;
    competitorItems: string[];
    ourTitle: string;
    ourItems: string[];
  };
  ctaData?: {
    subtext?: string;
    urgencyTimer?: string;
    acceptedPayments?: string[];
  };
  leadCaptureData?: {
    submitButtonText: string;
    requireName?: boolean;
    requirePhone?: boolean;
    requireEmail?: boolean;
  };
  quizQuestion?: {
    questionType: 'single_choice' | 'multi_choice' | 'image_choice' | 'scale_1_10';
    options: QuizOptionItem[];
  };
  testimonials?: TestimonialItem[];
  faqItems?: FAQItem[];
  pricingData?: {
    regularPrice?: number;
    offerPrice: number;
    installments?: string;
    checkoutUrl?: string;
    guaranteeDays?: number;
    bonusList?: string[];
  };
}

export interface PageQuizBlueprintData {
  mode: 'sales_page' | 'quiz_funnel';
  targetOfferId?: string;
  themeColor?: string;
  sections: PageQuizSection[];
}

export interface FunnelBlueprint {
  id?: string;
  title: string;
  description?: string;
  category: FunnelCategory;
  status: FunnelStatus;
  routingStyle?: 'bezier' | 'orthogonal';
  
  nodes: FunnelNode[];
  connections: FunnelConnection[];
  frames?: FunnelFrame[];

  // Ativos de Conversão Específicos
  vslData?: VSLBlueprintData;
  pageQuizData?: PageQuizBlueprintData;
  
  // Simulador de Tráfego
  metrics?: {
    initialTraffic: number;
    projectedRevenue: number;
    projectedROI: number;
    bottleneckNodeIds?: string[];
  };
  
  orgId: string;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type FunnelNodeType = 'traffic' | 'page' | 'offer' | 'automation' | 'b2b' | 'cs' | 'hr' | 'icp' | 'note' | 'journey';

export type FunnelNodeSubType = 
  // Inteligência & ICPs do CRM
  | 'icp_persona'
  // Anotações & Post-its
  | 'sticky_note'
  // 🧭 Jornada do Cliente & Psicologia do Comprador
  | 'linked_funnel' | 'pain_point' | 'hesitation_doubt' | 'aha_moment' | 'friction_risk' | 'delight_touch' | 'customer_emotion'
  // Tráfego & Atração
  | 'pinterest' | 'tiktok' | 'instagram' | 'youtube' | 'google_seo' | 'whatsapp' | 'meta_ads' | 'influencer_partner' | 'native_ads' | 'partners'
  // Páginas & Etapas Web
  | 'blog_site' | 'quiz_page' | 'quiz_vsl_page' | 'vsl_page' | 'sales_page' | 'capture_page' | 'static_page' | 'webinar_page' | 'advertorial' | 'checkout' | 'thank_you_page' | 'application_page' | 'upsell_page' | 'bridge_page' | 'member_area'
  // Ofertas & Monetização Própria
  | 'lead_magnet' | 'front_end' | 'order_bump' | 'upsell' | 'downsell' | 'subscription' | 'high_ticket' | 'tripwire_offer' | 'bundle_offer'
  // Afiliação & Lojas Parceiras
  | 'affiliate_amazon' | 'affiliate_shopee' | 'affiliate_mercadolivre' | 'affiliate_product'
  // E-mail, WhatsApp & Automações Multicanal
  | 'email_seq' | 'email_broadcast' | 'delay_timer' | 'condition_branch' | 'whatsapp_auto' | 'whatsapp_x1' | 'whatsapp_bot' | 'whatsapp_group' | 'live_chat' | 'sms_transactional' | 'voice_bot' | 'remarketing' | 'tag_lead' | 'pix_recovery'
  // Vendas B2B & Negociação Corporativa
  | 'b2b_meeting' | 'b2b_qualification' | 'b2b_proposal' | 'contract_signing' | 'corporate_invoice'
  // Pós-Venda, Sucesso do Cliente (CS) & Retenção
  | 'client_onboarding' | 'support_ticket' | 'nps_survey' | 'contract_renewal' | 'referral_program' | 'testimonial_request'
  // RH & Processos Internos
  | 'hr_recruitment' | 'team_training';

export interface FunnelChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface FunnelFrame {
  id: string;
  title: string;
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple' | 'slate';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FunnelNode {
  id: string;
  type: FunnelNodeType;
  subType: FunnelNodeSubType;
  label: string;
  subtitle?: string;
  x: number;
  y: number;
  
  // Inteligência & ICP
  icpId?: string;            // Vínculo com Perfil ICP real do CRM
  noteColor?: string;        // Cor do Post-it ('yellow' | 'blue' | 'pink' | 'green' | 'purple')
  
  // 🧭 Jornada do Cliente & Sub-Funil Vinculado
  linkedFunnelId?: string;    // ID do Funil Operacional Vinculado (Sub-funil)
  linkedFunnelTitle?: string; // Título em cache do funil vinculado
  emotionLevel?: 'happy' | 'neutral' | 'frustrated' | 'delighted' | 'hesitant'; // Sentimento do cliente na etapa
  touchpointOwner?: string;  // Responsável pelo ponto de contato (ex: "Closer", "Suporte", "Tráfego")

  // Estratégia e Negócio
  offerId?: string;          // Conexão com Produto/Oferta real do CRM (Opcional)
  creativeId?: string;       // Conexão com Criativo do HubAds
  price?: number;            // Valor do produto em R$
  costPerClick?: number;     // Custo estimado do clique (para tráfego pago)
  conversionRate?: number;   // % esperada de conversão
  status?: 'idea' | 'in_progress' | 'ready' | 'live';
  
  // Afiliação & Links Externos
  affiliateLink?: string;    // Link de Afiliado (Shopee, Amazon, Mercado Livre, Hotmart, etc.)
  commissionRate?: number;   // Taxa de comissão do afiliado (%)
  
  // Execução
  url?: string;
  notes?: string;
  checklist?: FunnelChecklistItem[];
}

export interface FunnelConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'animated';
  intent?: 'conversion' | 'recovery' | 'loop' | 'upsell' | 'neutral';
  color?: string;
}

export interface FunnelBlueprint {
  id?: string;
  title: string;
  description?: string;
  category: FunnelCategory;
  status: FunnelStatus;
  routingStyle?: 'bezier' | 'orthogonal';
  
  nodes: FunnelNode[];
  connections: FunnelConnection[];
  frames?: FunnelFrame[];
  
  // Simulador de Tráfego
  metrics?: {
    initialTraffic: number;
    projectedRevenue: number;
    projectedROI: number;
    bottleneckNodeIds?: string[];
  };
  
  orgId: string;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

