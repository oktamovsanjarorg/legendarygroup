import { z } from 'zod';

export const FEEDBACK_TYPES = ['bug', 'suggestion', 'general'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_PLATFORMS = ['web', 'miniapp', 'bot'] as const;
export type FeedbackPlatform = (typeof FEEDBACK_PLATFORMS)[number];

export const CreateFeedbackSchema = z.object({
  type: z.enum(FEEDBACK_TYPES).default('general'),
  text: z.string().trim().min(5).max(2000),
  fileId: z.string().uuid().optional().nullable(),
  screen: z.string().trim().max(100).optional().nullable(),
  appVersion: z.string().trim().max(50).optional().nullable(),
  platform: z.enum(FEEDBACK_PLATFORMS).default('web'),
  clientContext: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>;

export const FeedbackResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.literal('received'),
  message: z.string(),
  createdAt: z.string(),
});

export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;
