import { z } from 'zod';

/**
 * Shared Schemas — Validações Zod compartilhadas entre API e Frontend
 */

// ── Team Handlers ───────────────────────────────────────────────────────────────

export const teamInviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.string().min(1, 'Role é obrigatória'),
  collaboratorName: z.string().min(2, 'Nome muito curto')
});

export const teamRemoveSchema = z.object({
  targetUid: z.string().min(1),
  deleteAllData: z.boolean().default(false)
});

export const teamUpdateProfileSchema = z.object({
  targetUid: z.string().min(1),
  profileData: z.object({
    jobTitle: z.string().optional(),
    roleId: z.string().optional(),
    reportsTo: z.string().nullable().optional(),
    birthDate: z.string().nullable().optional()
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
  asaasCustomerId: z.string().min(1)
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
