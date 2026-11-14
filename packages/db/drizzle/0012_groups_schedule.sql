CREATE TABLE "group_teachers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"role" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_teachers_role_check" CHECK ("group_teachers"."role" IN ('main', 'assistant')),
	CONSTRAINT "group_teachers_dates_check" CHECK ("group_teachers"."to_date" IS NULL OR "group_teachers"."to_date" >= "group_teachers"."from_date")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"course_id" uuid NOT NULL,
	"name" text NOT NULL,
	"room_id" uuid,
	"monthly_price" bigint NOT NULL,
	"max_students" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" text DEFAULT 'forming' NOT NULL,
	"grading_config" jsonb NOT NULL,
	"penalty_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_status_check" CHECK ("groups"."status" IN ('forming', 'active', 'paused', 'finished')),
	CONSTRAINT "groups_price_check" CHECK ("groups"."monthly_price" >= 0),
	CONSTRAINT "groups_max_students_check" CHECK ("groups"."max_students" BETWEEN 1 AND 500),
	CONSTRAINT "groups_dates_check" CHECK ("groups"."end_date" IS NULL OR "groups"."end_date" >= "groups"."start_date")
);
--> statement-breakpoint
CREATE TABLE "schedule_occupancy" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"resource_kind" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_min" integer NOT NULL,
	"end_min" integer NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	CONSTRAINT "schedule_occupancy_kind_check" CHECK ("schedule_occupancy"."resource_kind" IN ('room', 'teacher')),
	CONSTRAINT "schedule_occupancy_minutes_check" CHECK ("schedule_occupancy"."end_min" > "schedule_occupancy"."start_min")
);
--> statement-breakpoint
CREATE TABLE "schedule_slots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_slots_weekday_check" CHECK ("schedule_slots"."weekday" BETWEEN 1 AND 7),
	CONSTRAINT "schedule_slots_time_check" CHECK ("schedule_slots"."end_time" > "schedule_slots"."start_time"),
	CONSTRAINT "schedule_slots_dates_check" CHECK ("schedule_slots"."valid_to" IS NULL OR "schedule_slots"."valid_to" >= "schedule_slots"."valid_from")
);
--> statement-breakpoint
ALTER TABLE "group_teachers" ADD CONSTRAINT "group_teachers_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_teachers" ADD CONSTRAINT "group_teachers_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_occupancy" ADD CONSTRAINT "schedule_occupancy_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_occupancy" ADD CONSTRAINT "schedule_occupancy_slot_id_schedule_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."schedule_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_teachers_group_id_idx" ON "group_teachers" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_teachers_teacher_id_idx" ON "group_teachers" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "groups_branch_id_idx" ON "groups" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "groups_course_id_idx" ON "groups" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "groups_room_id_idx" ON "groups" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "groups_status_idx" ON "groups" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_branch_name_current_uq" ON "groups" USING btree ("branch_id",lower("name")) WHERE "groups"."status" <> 'finished';--> statement-breakpoint
CREATE INDEX "schedule_occupancy_group_id_idx" ON "schedule_occupancy" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "schedule_occupancy_slot_id_idx" ON "schedule_occupancy" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "schedule_slots_group_id_idx" ON "schedule_slots" USING btree ("group_id");