import { z } from 'zod';
import { SiteStatus } from '../../../types';

export const ClientSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido").min(1, "E-mail é obrigatório"),
  whatsapp: z.string().optional().or(z.literal('')),
  cpfCnpj: z.string().optional().or(z.literal('')),
  status: z.enum(['Em Desenvolvimento', 'Ativo', 'Inadimplente', 'Cancelado', 'Pendente'] as const).default('Pendente'),
  plan: z.string().default('Personalizado'),
  planPrice: z.number().default(0),
  setupPrice: z.number().default(0),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  assignedTo: z.string().optional(),
  tagIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
  niche: z.string().optional(),
  paymentStatus: z.enum(['PENDING', 'RECEIVED', 'OVERDUE', 'N/A'] as const).default('N/A'),
  lastContactAt: z.number().optional(),
  asaasCustomerId: z.string().optional(),
  invoiceUrl: z.string().optional(),
  paymentLink: z.string().optional(),
  bankSlipUrl: z.string().optional(),
  nextDueDate: z.string().optional(),
  totalAmount: z.number().optional(),
  welcomeEmailSent: z.boolean().optional(),
}).passthrough();

export type ClientEntity = z.infer<typeof ClientSchema>;

export class ClientMapper {
  static toEntity(data: any): ClientEntity {
    const result = ClientSchema.safeParse({
      ...data,
      // Garante que campos obrigatórios tenham defaults se vierem zoados do Firestore
      createdAt: data.createdAt || Date.now(),
      status: data.status || 'Pendente',
      planPrice: Number(data.planPrice || 0),
      setupPrice: Number(data.setupPrice || 0),
      tagIds: data.tagIds || [],
    });

    if (!result.success) {
      console.warn('[ClientMapper] Validation failed for client:', data.id, result.error.format());
      // Retorna o dado parcial ou lança erro dependendo da estratégia. 
      // Para resiliência, vamos retornar o que temos mas logar o erro.
      return data as ClientEntity; 
    }

    return result.data;
  }

  static toFirestore(entity: Partial<ClientEntity>) {
    const { id, ...data } = entity;
    return {
      ...data,
      updatedAt: Date.now(),
    };
  }
}
