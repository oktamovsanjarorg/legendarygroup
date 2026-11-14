CREATE TABLE "holidays" (
	"date" date PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"slot_id" uuid,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"room_id" uuid,
	"teacher_id" uuid,
	"is_substitute" boolean DEFAULT false NOT NULL,
	"room_overridden" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"kind" text DEFAULT 'regular' NOT NULL,
	"cancel_reason" text,
	"cancel_source" text,
	"cancelled_at" timestamp with time zone,
	"compensation" text,
	"makeup_for_lesson_id" uuid,
	"topic" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_status_check" CHECK ("lessons"."status" IN ('scheduled', 'done', 'cancelled')),
	CONSTRAINT "lessons_kind_check" CHECK ("lessons"."kind" IN ('regular', 'extra', 'makeup')),
	CONSTRAINT "lessons_cancel_source_check" CHECK ("lessons"."cancel_source" IN ('manual', 'holiday')),
	CONSTRAINT "lessons_compensation_check" CHECK ("lessons"."compensation" IN ('credit', 'makeup')),
	CONSTRAINT "lessons_time_check" CHECK ("lessons"."end_time" > "lessons"."start_time"),
	CONSTRAINT "lessons_cancel_pair_check" CHECK (("lessons"."status" = 'cancelled') = ("lessons"."cancel_source" IS NOT NULL AND "lessons"."cancelled_at" IS NOT NULL)),
	CONSTRAINT "lessons_compensation_cancelled_check" CHECK ("lessons"."compensation" IS NULL OR "lessons"."status" = 'cancelled'),
	CONSTRAINT "lessons_makeup_pair_check" CHECK (("lessons"."kind" = 'makeup') = ("lessons"."makeup_for_lesson_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_slot_id_schedule_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."schedule_slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_makeup_for_lesson_id_lessons_id_fk" FOREIGN KEY ("makeup_for_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_group_date_start_uq" ON "lessons" USING btree ("group_id","date","start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_makeup_for_uq" ON "lessons" USING btree ("makeup_for_lesson_id");--> statement-breakpoint
CREATE INDEX "lessons_date_idx" ON "lessons" USING btree ("date");--> statement-breakpoint
CREATE INDEX "lessons_teacher_date_idx" ON "lessons" USING btree ("teacher_id","date");--> statement-breakpoint
CREATE INDEX "lessons_room_date_idx" ON "lessons" USING btree ("room_id","date");--> statement-breakpoint
CREATE INDEX "lessons_slot_id_idx" ON "lessons" USING btree ("slot_id");