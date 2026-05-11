import { z } from 'zod';

export const ProposalStatusSchema = z.enum(['draft', 'sent', 'viewed', 'approved', 'rejected', 'expired']);

export const ProposalItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  quantity: z.number().default(1),
  isOptional: z.boolean().default(false),
  isSelected: z.boolean().default(true),
});

export const ProposalSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  leadName: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: ProposalStatusSchema.default('draft'),
  items: z.array(ProposalItemSchema),
  totalAmount: z.number(),
  createdAt: z.date().or(z.any()), // Aceita Timestamp do Firestore
  expiresAt: z.date().optional(),
  viewedAt: z.date().optional(),
  approvedAt: z.date().optional(),
  acceptanceMetadata: z.object({
    ip: z.string().optional(),
    userAgent: z.string().optional(),
  }).optional(),
  createdBy: z.string(),
  orgId: z.string(),
  checkoutUrl: z.string().nullable().optional(),
});

export type Proposal = z.infer<typeof ProposalSchema>;
export type ProposalItem = z.infer<typeof ProposalItemSchema>;
