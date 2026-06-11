import { z } from 'zod';

// 🚀 RE-EXPORT DE TODOS OS TIPOS COMPARTILHADOS
export * from '../shared/types';
export type { UserRole, Expense, AuditLogEntry, CustomRole, Client, UserProfile, ContractTemplate, UserContract, BrandAssets, BrandAssetLink, GrowthAsset, GrowthAssetType } from '../shared/types';

// ESQUEMAS DE VALIDAÇÃO (Frontend-only / Shared validation logic)
export const clientSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail é obrigatório para notificações e faturamento").min(1, "E-mail é obrigatório"),
  cpfCnpj: z.string().refine(val => !val || val.replace(/\D/g, '').length === 11 || val.replace(/\D/g, '').length === 14, "CPF/CNPJ deve ter 11 ou 14 dígitos").optional().or(z.literal('')),
  whatsapp: z.string().refine(val => !val || val.replace(/\D/g, '').length >= 10, "WhatsApp deve ter pelo menos 10 dígitos").optional().or(z.literal('')),
});

// Tipos auxiliares que podem ter extensões específicas do frontend se necessário no futuro
export interface OnboardingQuestion {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'select' | 'file';
  options?: string;
  required: boolean;
}
