-- Dars darajasidagi to'qnashuvlar (T-104, 05 §indekslar; btree_gist — 0013 da yoqilgan).
-- Vaqt — Toshkent mahalliy vaqti (`date + time` → timestamp; DST yo'q), `[start, end)`.
-- Bekor qilingan darslar resurs band qilmaydi.
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_room_no_overlap"
  EXCLUDE USING gist (
    "room_id" WITH =,
    tsrange("date" + "start_time", "date" + "end_time", '[)') WITH &&
  ) WHERE ("status" <> 'cancelled');
--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_teacher_no_overlap"
  EXCLUDE USING gist (
    "teacher_id" WITH =,
    tsrange("date" + "start_time", "date" + "end_time", '[)') WITH &&
  ) WHERE ("status" <> 'cancelled');
--> statement-breakpoint
-- Bir guruhda bir vaqtda ikki dars yo'q (qo'shimcha/qoplovchi dars ham).
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_group_no_overlap"
  EXCLUDE USING gist (
    "group_id" WITH =,
    tsrange("date" + "start_time", "date" + "end_time", '[)') WITH &&
  ) WHERE ("status" <> 'cancelled');
