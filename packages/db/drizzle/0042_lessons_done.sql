-- Davomati bor dars — o'tgan (`done`): jadval o'zgarganda o'chirilmasin (T-151).
UPDATE "lessons" SET "status" = 'done', "updated_at" = now()
WHERE "status" = 'scheduled'
  AND EXISTS (SELECT 1 FROM "attendance" a WHERE a."lesson_id" = "lessons"."id");
