-- Enrollment kesishuvlari DB darajasida (T-106, btree_gist — 0013 da yoqilgan).
-- Bir o'quvchi bir guruhda bir davrda bir marta (ko'chirib qaytsa — yangi davr).
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_no_overlap"
  EXCLUDE USING gist (
    "student_id" WITH =,
    "group_id" WITH =,
    daterange("start_date", "end_date", '[]') WITH &&
  );
--> statement-breakpoint
-- Bir enrollment'da kesishuvchi muzlatish yo'q (BR-9).
ALTER TABLE "enrollment_freezes" ADD CONSTRAINT "enrollment_freezes_no_overlap"
  EXCLUDE USING gist (
    "enrollment_id" WITH =,
    daterange("from_date", "to_date", '[]') WITH &&
  );
