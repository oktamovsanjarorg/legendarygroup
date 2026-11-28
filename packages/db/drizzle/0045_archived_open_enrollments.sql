-- T-179: Q-93 (guruhda turgan o'quvchi arxivlanmaydi) deploy qilinishidan oldin arxivlangan
-- o'quvchining a'zoligi ochiq qolgan — u guruh ro'yxati, davomat va baholashda ko'rinadi, oy
-- boshida unga hisob yozilardi. A'zolik arxiv kuni (Asia/Tashkent) bilan yopiladi — ilovadagi
-- `EnrollmentsService.close` bilan bir xil: arxivdan keyin boshlanadigan muzlatish o'chadi,
-- kesishgani qisqaradi; audit `enrollment.end`. Arxiv kunidan keyingi oyga hisob qatori bo'lsa —
-- tegilmaydi (pul tarafi qo'lda hal qilinadi). Idempotent: qayta ishga tushsa, qator qolmaydi.
WITH "fix" AS (
  SELECT e."id",
         e."student_id",
         e."group_id",
         e."start_date",
         e."end_date" AS "old_end_date",
         e."end_reason" AS "old_end_reason",
         GREATEST(e."start_date", (s."archived_at" AT TIME ZONE 'Asia/Tashkent')::date) AS "new_end_date"
  FROM "enrollments" e
  JOIN "students" s ON s."id" = e."student_id"
  WHERE s."archived_at" IS NOT NULL
    AND (e."end_date" IS NULL
         OR e."end_date" > GREATEST(e."start_date", (s."archived_at" AT TIME ZONE 'Asia/Tashkent')::date))
    AND NOT EXISTS (
      SELECT 1
      FROM "invoice_lines" il
      JOIN "invoices" i ON i."id" = il."invoice_id"
      WHERE il."enrollment_id" = e."id"
        AND i."period" > to_char((s."archived_at" AT TIME ZONE 'Asia/Tashkent')::date, 'YYYY-MM')
    )
),
"freezes_dropped" AS (
  DELETE FROM "enrollment_freezes" f
  USING "fix" t
  WHERE f."enrollment_id" = t."id" AND f."from_date" > t."new_end_date"
  RETURNING f."id"
),
"freezes_trimmed" AS (
  UPDATE "enrollment_freezes" f
  SET "to_date" = t."new_end_date", "updated_at" = now()
  FROM "fix" t
  WHERE f."enrollment_id" = t."id"
    AND f."from_date" <= t."new_end_date"
    AND f."to_date" > t."new_end_date"
  RETURNING f."id"
),
"closed" AS (
  UPDATE "enrollments" e
  SET "end_date" = t."new_end_date",
      "end_reason" = 'left',
      "end_note" = 'Oʻquvchi arxivlangan — aʼzolik avtomatik yopildi (T-179)',
      "updated_at" = now()
  FROM "fix" t
  WHERE e."id" = t."id"
  RETURNING e."id"
)
INSERT INTO "audit_logs" ("id", "action", "entity", "entity_id", "before", "after", "at")
SELECT uuidv7(),
       'enrollment.end',
       'enrollment',
       t."id"::text,
       jsonb_build_object('studentId', t."student_id", 'groupId', t."group_id",
                          'startDate', t."start_date", 'endDate', t."old_end_date",
                          'endReason', t."old_end_reason"),
       jsonb_build_object('studentId', t."student_id", 'groupId', t."group_id",
                          'startDate', t."start_date", 'endDate', t."new_end_date",
                          'endReason', 'left', 'via', 'migration', 'task', 'T-179'),
       now()
FROM "fix" t
JOIN "closed" c ON c."id" = t."id";
