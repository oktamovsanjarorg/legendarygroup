import { z } from 'zod';

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['low', 'normal', 'high'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const CreateTicketSchema = z.object({
  studentId: z.string().uuid().optional().nullable(),
  subject: z.string().min(3).max(200),
  message: z.string().min(5).max(3000),
  priority: z.enum(TICKET_PRIORITIES).default('normal'),
});
export type CreateTicketRequest = z.infer<typeof CreateTicketSchema>;

export const CreateTicketMessageSchema = z.object({
  text: z.string().min(1).max(3000),
  fileUrl: z.string().url().optional().nullable(),
});
export type CreateTicketMessageRequest = z.infer<typeof CreateTicketMessageSchema>;

export const UpdateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
});
export type UpdateTicketRequest = z.infer<typeof UpdateTicketSchema>;

export const TicketMessageItemSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string(),
  authorRole: z.string(),
  text: z.string(),
  fileUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type TicketMessageItem = z.infer<typeof TicketMessageItemSchema>;

export const TicketItemSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string(),
  authorPhone: z.string().nullable(),
  studentId: z.string().uuid().nullable(),
  studentName: z.string().nullable(),
  subject: z.string(),
  status: z.enum(TICKET_STATUSES),
  priority: z.enum(TICKET_PRIORITIES),
  assignedTo: z.string().uuid().nullable(),
  assignedToName: z.string().nullable(),
  lastMessageAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TicketItem = z.infer<typeof TicketItemSchema>;

export const TicketDetailSchema = TicketItemSchema.extend({
  messages: z.array(TicketMessageItemSchema),
});
export type TicketDetail = z.infer<typeof TicketDetailSchema>;

export const ListTicketsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
});
export type ListTicketsQuery = z.infer<typeof ListTicketsQuerySchema>;
