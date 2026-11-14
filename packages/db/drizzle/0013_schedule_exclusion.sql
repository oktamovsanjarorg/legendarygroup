-- Jadval to'qnashuvi DB darajasida (FR-ORG-4, T-103). `btree_gist` — uuid/text/int tengligini
-- GiST exclusion ichida ishlatish uchun. Sanalar ikki tomondan yopiq (`[]`), NULL — cheksiz.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
-- Bir resurs (xona yoki ustoz), bir hafta kuni, kesishuvchi vaqt [start, end) va davr — rad.
ALTER TABLE "schedule_occupancy" ADD CONSTRAINT "schedule_occupancy_no_overlap"
  EXCLUDE USING gist (
    "resource_kind" WITH =,
    "resource_id" WITH =,
    "weekday" WITH =,
    int4range("start_min", "end_min") WITH &&,
    daterange("valid_from", "valid_to", '[]') WITH &&
  );
--> statement-breakpoint
-- Bir davrda guruhda bitta asosiy ustoz.
ALTER TABLE "group_teachers" ADD CONSTRAINT "group_teachers_one_main"
  EXCLUDE USING gist (
    "group_id" WITH =,
    daterange("from_date", "to_date", '[]') WITH &&
  ) WHERE ("role" = 'main');
--> statement-breakpoint
-- Bir ustoz bir guruhga bir davrda bir marta (asosiy va yordamchi bir vaqtda emas).
ALTER TABLE "group_teachers" ADD CONSTRAINT "group_teachers_no_duplicate"
  EXCLUDE USING gist (
    "group_id" WITH =,
    "teacher_id" WITH =,
    daterange("from_date", "to_date", '[]') WITH &&
  );
