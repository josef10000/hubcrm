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

export interface CustomRoleBase {
  id: string;
  name: string;
  level: number;
  permissions: AppPermission[];
  isDefault: boolean;
  createdAt: number;
}

// ── Perfil de Usuário (Base) ────────────────────────────────────────────────────

/**
 * Subset do UserProfile que a API manipula.
 * O frontend estende isso com campos adicionais (wallpaper, presence, etc.)
 */
export interface UserProfileBase {
  uid: string;
  email: string;
  displayName: string;
  orgId: string;
  role: CustomRoleBase | string; // Pode ser objeto ou string legado
  roleId?: string;
  permissions?: string[];
  createdAt: number;
  updatedAt?: number;
  jobTitle?: string;
  photoURL?: string;
  phoneNumber?: string;
  reportsTo?: string;
  birthDate?: string;
  startDate?: string;
  acceptedInviteAt?: number;
}

// ── Convites ────────────────────────────────────────────────────────────────────

export type InviteStatus = 'pending' | 'accepted' | 'expired';

export interface InvitationBase {
  id: string;
  email: string;
  orgId: string;
  role: string;
  token: string;
  status: InviteStatus;
  createdAt: number;
  expiresAt: number;
  invitedBy: string;
  acceptedBy?: string;
  acceptedAt?: number;
}

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

// ── Cliente (campos acessados pela API) ─────────────────────────────────────────

/**
 * Subset de Client que a API acessa (portal_finance, checkout, etc.)
 */
export interface ClientBase {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  whatsapp?: string;
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
  orgId?: string;
  assignedTo?: string;
  status?: string;
  plan?: string;
  billingCycle?: string;
  nextDueDate?: string;
  invoiceUrl?: string;
  siteLink?: string;
  niche?: string;
  createdAt?: any;
  publicToken?: string;
  currentDiscount?: number;
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

// ── Team Handler Payloads ───────────────────────────────────────────────────────

export interface TeamListResponse {
  success: true;
  members: UserProfileBase[];
  invites: InvitationBase[];
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
