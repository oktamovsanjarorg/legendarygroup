import { z } from 'zod';

export const TEST_STATUSES = ['draft', 'published'] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export const TestSectionSchema = z.object({
  name: z.string().min(1).max(50),
  maxScore: z.number().int().positive(),
});
export type TestSection = z.infer<typeof TestSectionSchema>;

export const TestSectionScoreSchema = z.object({
  sectionName: z.string().min(1).max(50),
  score: z.number().int().min(0),
});
export type TestSectionScore = z.infer<typeof TestSectionScoreSchema>;

export const CreateTestRequest = z.object({
  groupId: z.string().uuid(),
  title: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxScore: z.number().int().positive(),
  sections: z.array(TestSectionSchema).optional().default([]),
});
export type CreateTestRequest = z.infer<typeof CreateTestRequest>;

export const UpdateTestRequest = z.object({
  title: z.string().min(1).max(120).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  maxScore: z.number().int().positive().optional(),
  sections: z.array(TestSectionSchema).optional(),
});
export type UpdateTestRequest = z.infer<typeof UpdateTestRequest>;

export const RecordTestResultItem = z.object({
  studentId: z.string().uuid(),
  score: z.number().int().min(0),
  sectionScores: z.array(TestSectionScoreSchema).optional().default([]),
});
export type RecordTestResultItem = z.infer<typeof RecordTestResultItem>;

export const RecordTestResultsRequest = z.object({
  results: z.array(RecordTestResultItem),
  clientMutationId: z.string().uuid().optional(),
});
export type RecordTestResultsRequest = z.infer<typeof RecordTestResultsRequest>;

export const TestSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  groupId: z.string().uuid(),
  title: z.string(),
  date: z.string(),
  maxScore: z.number().int(),
  sections: z.array(TestSectionSchema),
  status: z.enum(TEST_STATUSES),
  publishedAt: z.string().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TestItem = z.infer<typeof TestSchema>;

export const TestResultItemSchema = z.object({
  id: z.string().uuid(),
  testId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string().optional(),
  studentCode: z.number().int().optional(),
  score: z.number().int(),
  percentage: z.number(),
  sectionScores: z.array(TestSectionScoreSchema),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TestResultItem = z.infer<typeof TestResultItemSchema>;

export const TestDetailResponseSchema = TestSchema.extend({
  results: z.array(TestResultItemSchema),
});
export type TestDetailResponse = z.infer<typeof TestDetailResponseSchema>;

export const MatchedStudentImportRow = z.object({
  rowNumber: z.number().int(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  studentCode: z.number().int(),
  matchType: z.enum(['code', 'exact_name', 'fuzzy']),
  score: z.number().int().min(0),
  sectionScores: z.array(TestSectionScoreSchema),
});
export type MatchedStudentImportRow = z.infer<typeof MatchedStudentImportRow>;

export const UnmatchedStudentImportRow = z.object({
  rowNumber: z.number().int(),
  rawIdentifier: z.string(),
  reason: z.string(),
});
export type UnmatchedStudentImportRow = z.infer<typeof UnmatchedStudentImportRow>;

export const SuggestedStudentImportRow = z.object({
  rowNumber: z.number().int(),
  rawIdentifier: z.string(),
  score: z.number().int().min(0),
  sectionScores: z.array(TestSectionScoreSchema),
  suggestedStudentId: z.string().uuid(),
  suggestedStudentName: z.string(),
  suggestedStudentCode: z.number().int(),
  similarity: z.number(),
});
export type SuggestedStudentImportRow = z.infer<typeof SuggestedStudentImportRow>;

export const ImportPreviewResponseSchema = z.object({
  matched: z.array(MatchedStudentImportRow),
  unmatched: z.array(UnmatchedStudentImportRow),
  suggested: z.array(SuggestedStudentImportRow),
});
export type ImportPreviewResponse = z.infer<typeof ImportPreviewResponseSchema>;

export const ExcelImportConfirmRequest = z.object({
  results: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        score: z.number().int().min(0),
        sectionScores: z.array(TestSectionScoreSchema).optional().default([]),
      }),
    )
    .min(1),
});
export type ExcelImportConfirmRequest = z.infer<typeof ExcelImportConfirmRequest>;
