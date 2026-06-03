import { z } from 'zod';

/**
 * Shared Schemas — Validações Zod compartilhadas entre API e Frontend
 */

// ── Team Handlers ───────────────────────────────────────────────────────────────

export const teamInviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.string().min(1, 'Role é obrigatória'),
  collaboratorName: z.string().min(2, 'Nome muito curto'),
  templateId: z.string().optional()
});

export const teamRemoveSchema = z.object({
  targetUid: z.string().min(1),
  deleteAllData: z.boolean().default(false)
});

export const teamUpdateProfileSchema = z.object({
  targetUid: z.string().min(1),
  profileData: z.object({
    displayName: z.string().optional(),
    bio: z.string().optional(),
    phoneNumber: z.string().optional(),
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
    photoURL: z.string().optional(),
    startDate: z.string().optional(),
    jobTitle: z.string().optional(),
    roleId: z.string().optional(),
    reportsTo: z.string().nullable().optional(),
    birthDate: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    contractType: z.enum(['PJ', 'CLT']).optional(),
    workSchedule: z.object({
      daysOfWeek: z.array(z.number()),
      entryTime: z.string(),
      exitTime: z.string()
    }).optional(),
    salary: z.number().optional(),
    healthInsurance: z.number().optional(),
    mealVoucher: z.number().optional(),
    transportVoucher: z.number().optional(),
    homeOfficeAux: z.number().optional(),
    pixKeyType: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']).nullable().optional(),
    pixKey: z.string().nullable().optional(),
    bankAccount: z.object({
      bankCode: z.string(),
      bankName: z.string().optional(),
      agency: z.string(),
      account: z.string(),
      accountDigit: z.string(),
      accountType: z.enum(['CHECKING', 'SAVINGS']),
      holderName: z.string(),
      holderCpfCnpj: z.string()
    }).nullable().optional(),
    benefitDeductions: z.object({
      healthInsuranceCopay: z.number().optional(),
      mealVoucherDiscount: z.number().optional(),
      transportVoucherDiscount: z.number().optional()
    }).nullable().optional(),
    resignationDetails: z.object({
      resignationDate: z.string(),
      reason: z.enum(['dismissal_without_cause', 'dismissal_with_cause', 'employee_resignation', 'pj_termination']),
      noticeType: z.enum(['worked', 'indemnified', 'none']),
      penaltyPercentage: z.number().optional()
    }).nullable().optional()
  })
});

export const broadcastSchema = z.object({
  uids: z.array(z.string()).min(1, 'Selecione pelo menos um destinatário'),
  hasButton: z.boolean().default(false),
  buttonUrl: z.string().url().optional().or(z.literal(''))
});

// ── Finance Handlers ─────────────────────────────────────────────────────────────

export const portalFinanceSchema = z.object({
  orgId: z.string().min(1),
  clientId: z.string().min(1),
  token: z.string().min(32, 'Token de segurança inválido ou ausente')
});

// ── Helper para validação segura na API ──────────────────────────────────────────

/**
 * Valida os dados e retorna um erro formatado se falhar.
 * Útil para handlers da Vercel.
 */
export function validateSchema<T>(schema: z.Schema<T>, data: any) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMsg = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    return { success: false as const, error: errorMsg };
  }
  return { success: true as const, data: result.data };
}
