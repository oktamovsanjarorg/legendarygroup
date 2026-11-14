CREATE TABLE IF NOT EXISTS "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grades_kind_check" CHECK ("grades"."kind" IN ('homework', 'activity')),
	CONSTRAINT "grades_value_check" CHECK ("grades"."value" >= 0 AND "grades"."value" <= 100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teacher_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"lesson_id" uuid,
	"text" text NOT NULL,
	"visibility" text DEFAULT 'guardian' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_comments_visibility_check" CHECK ("teacher_comments"."visibility" IN ('guardian', 'internal'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grades" ADD CONSTRAINT "grades_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grades" ADD CONSTRAINT "grades_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_comments" ADD CONSTRAINT "teacher_comments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_comments" ADD CONSTRAINT "teacher_comments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_comments" ADD CONSTRAINT "teacher_comments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_comments" ADD CONSTRAINT "teacher_comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "grades_lesson_student_kind_idx" ON "grades" USING btree ("lesson_id","student_id","kind");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grades_lesson_idx" ON "grades" USING btree ("lesson_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grades_student_idx" ON "grades" USING btree ("student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_comments_student_idx" ON "teacher_comments" USING btree ("student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_comments_group_idx" ON "teacher_comments" USING btree ("group_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_comments_lesson_idx" ON "teacher_comments" USING btree ("lesson_id");
