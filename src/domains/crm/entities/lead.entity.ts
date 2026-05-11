import { z } from 'zod';

export const LeadStatusSchema = z.enum([
  'Novo', 
  'Em Contato', 
  'Negociação', 
  'Convertido', 
  'Perdido'
] as const);

export const LeadSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Nome muito curto"),
  whatsapp: z.string().min(8, "WhatsApp inválido"),
  email: z.string().email().optional().or(z.literal('')),
  status: LeadStatusSchema.default('Novo'),
  leadSource: z.string().optional(),
  estimatedValue: z.number().default(0),
  notes: z.string().optional(),
  niche: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  assignedTo: z.string().optional(),
  tagIds: z.array(z.string()).default([]),
  lostReason: z.string().optional(),
  nextFollowUp: z.number().optional(),
});

export type LeadEntity = z.infer<typeof LeadSchema>;

export class LeadMapper {
  static toEntity(data: any): LeadEntity {
    const result = LeadSchema.safeParse({
      ...data,
      createdAt: data.createdAt || Date.now(),
      status: data.status || 'Novo',
      estimatedValue: Number(data.estimatedValue || 0),
      tagIds: data.tagIds || [],
    });

    if (!result.success) {
      console.warn('[LeadMapper] Validation failed for lead:', data.id, result.error.format());
      return data as LeadEntity;
    }

    return result.data;
  }

  static toFirestore(entity: Partial<LeadEntity>) {
    const { id, ...data } = entity;
    return {
      ...data,
      updatedAt: Date.now(),
    };
  }
}
