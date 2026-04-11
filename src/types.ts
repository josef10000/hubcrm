import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail é obrigatório para notificações e faturamento").min(1, "E-mail é obrigatório"),
  cpfCnpj: z.string().refine(val => !val || val.replace(/\D/g, '').length === 11 || val.replace(/\D/g, '').length === 14, "CPF/CNPJ deve ter 11 ou 14 dígitos").optional().or(z.literal('')),
  whatsapp: z.string().refine(val => !val || val.replace(/\D/g, '').length >= 10, "WhatsApp deve ter pelo menos 10 dígitos").optional().or(z.literal('')),
});

export type PlanType = string;
export type SiteStatus = 'Em Desenvolvimento' | 'Ativo' | 'Inadimplente' | 'Cancelado';

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
  type: 'pdf' | 'text';
  content: string;
  status: 'pending' | 'signed';
  createdAt: number;
  signedAt?: number;
  signedIp?: string;
  signedUserAgent?: string;
  signatureName?: string;
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
  createdAt: number;
}

export interface Client {
  id: string; 
  name: string; 
  whatsapp: string; 
  plan: PlanType;
  offerId?: string;
  planPrice?: number;
  setupPrice?: number;
  siteLink?: string;
  status: SiteStatus;
  createdAt: number;
  niche?: string;
  notes?: string;
  logs?: ClientLog[];
  attachments?: ClientAttachment[];
  stages?: ClientStage[];
  contracts?: ClientContract[];
  cpfCnpj?: string;
  email?: string;
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
  invoiceUrl?: string;
  paymentStatus?: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'N/A';
  nextDueDate?: string;
  billingType?: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'UNDEFINED';
  billingCycle?: 'MONTHLY' | 'YEARLY';
  firstPaymentDate?: string;
  recurringPaymentDay?: number;
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
  isCombo?: boolean;
  maxInstallments?: number;
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
}

export interface OnboardingQuestion {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'select' | 'file';
  options?: string;
  required: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: number;
  category: string;
  clientId?: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface TransactionCategory {
  id: string;
  name: string;
  type: TransactionType;
  color?: string;
  isCustom?: boolean;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: number; // Data de Emissão/Competência
  paymentDate?: number; // Data de Pagamento/Caixa real
  type: TransactionType;
  status: TransactionStatus;
  categoryId: string;
  clientId?: string;
  bankAccountId?: string; // Para conta bancária (ex: Inter vs Itaú vs PagSeguro)
  referenceId?: string; // Útil para cruzar com Asaas ou OFX
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

export type LeadStatus = 'Novo' | 'Em Contato' | 'Proposta Enviada' | 'Negociação' | 'Convertido' | 'Perdido';

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
}

export interface SupportRequest {
  id: string;
  clientId: string;
  clientName: string;
  category: string;
  message: string;
  status: 'aberto' | 'em_analise' | 'concluido';
  createdAt: any;
  reply?: string;
  repliedAt?: any;
}

export type UserRole = 
  | 'Administrador' 
  | 'Gerente' 
  | 'People & Culture' 
  | 'Customer Success' 
  | 'Suporte Técnico' 
  | 'Onboarding Specialist' 
  | 'SDR' 
  | 'Executive' 
  | 'FinOps' 
  | 'Controladoria' 
  | 'Revenue Operations' 
  | 'Gestor de Faturamento' 
  | 'Só Leitura';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  orgId: string;
  role: UserRole;
  createdAt: number;
  jobTitle?: string;
  bio?: string;
  photoURL?: string;
  phoneNumber?: string;
  instagram?: string;
  linkedin?: string;
  reportsTo?: string; // UID do superior imediato
  birthDate?: string; // Formato YYYY-MM-DD
}

export interface Organization {
  id: string;
  name: string;
  adminId: string;
  createdAt: number;
}

export interface Invitation {
  id: string;
  email: string;
  orgId: string;
  role: UserRole;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: number;
  expiresAt: number;
}

