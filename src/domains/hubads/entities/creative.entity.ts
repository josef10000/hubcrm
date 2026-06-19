import { z } from 'zod';

export const CreativeTypeSchema = z.enum([
  'image',
  'video',
  'carousel',
  'text',
  'reference'
] as const);

export const CreativeCategorySchema = z.enum([
  'headline',
  'copy',
  'visual',
  'cta',
  'landing_page',
  'full_ad'
] as const);

export const CreativeStatusSchema = z.enum([
  'draft',
  'approved',
  'active',
  'paused',
  'archived'
] as const);

export const CreativeOriginSchema = z.enum([
  'own',
  'competitor',
  'inspiration'
] as const);

export const CreativeScoreSchema = z.enum([
  'success',
  'average',
  'failure',
  'pending'
] as const);

export const CreativeSchema = z.object({
  id: z.string(),
  title: z.string().min(2, "Título muito curto"),
  type: CreativeTypeSchema.default('image'),
  category: CreativeCategorySchema.default('full_ad'),
  platform: z.array(z.string()).default([]),
  status: CreativeStatusSchema.default('draft'),
  origin: CreativeOriginSchema.default('own'),
  mediaUrls: z.array(z.string()).default([]),
  headline: z.string().optional().or(z.literal('')),
  copyText: z.string().optional().or(z.literal('')),
  ctaText: z.string().optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  trackingCode: z.string(),
  investment: z.number().default(0),
  impressions: z.number().default(0),
  clicks: z.number().default(0),
  conversions: z.number().default(0),
  revenue: z.number().default(0),
  score: CreativeScoreSchema.default('pending'),
  notes: z.string().optional().or(z.literal('')),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  campaignName: z.string().optional().or(z.literal('')),
});

export type CreativeEntity = z.infer<typeof CreativeSchema>;

export class CreativeMapper {
  static toEntity(data: any): CreativeEntity {
    const result = CreativeSchema.safeParse({
      ...data,
      type: data.type || 'image',
      category: data.category || 'full_ad',
      platform: data.platform || [],
      status: data.status || 'draft',
      origin: data.origin || 'own',
      mediaUrls: data.mediaUrls || [],
      tags: data.tags || [],
      investment: Number(data.investment || 0),
      impressions: Number(data.impressions || 0),
      clicks: Number(data.clicks || 0),
      conversions: Number(data.conversions || 0),
      revenue: Number(data.revenue || 0),
      score: data.score || 'pending',
      createdAt: data.createdAt || Date.now(),
    });

    if (!result.success) {
      console.warn('[CreativeMapper] Validation failed for creative:', data.id, result.error.format());
      return data as CreativeEntity;
    }

    return result.data;
  }

  static toFirestore(entity: Partial<CreativeEntity>) {
    const { id, ...data } = entity;
    return {
      ...data,
      updatedAt: Date.now(),
    };
  }
}
