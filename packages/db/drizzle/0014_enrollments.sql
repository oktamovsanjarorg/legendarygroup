CREATE TABLE "enrollment_freezes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"reason" text NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollment_freezes_dates_check" CHECK ("enrollment_freezes"."to_date" >= "enrollment_freezes"."from_date")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"end_reason" text,
	"end_note" text,
	"discount_percent" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_end_reason_check" CHECK ("enrollments"."end_reason" IN ('left', 'transferred', 'finished')),
	CONSTRAINT "enrollments_dates_check" CHECK ("enrollments"."end_date" IS NULL OR "enrollments"."end_date" >= "enrollments"."start_date"),
	CONSTRAINT "enrollments_end_pair_check" CHECK (("enrollments"."end_date" IS NULL) = ("enrollments"."end_reason" IS NULL)),
	CONSTRAINT "enrollments_discount_check" CHECK ("enrollments"."discount_percent" IS NULL OR "enrollments"."discount_percent" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "enrollment_freezes" ADD CONSTRAINT "enrollment_freezes_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_freezes" ADD CONSTRAINT "enrollment_freezes_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrollment_freezes_enrollment_id_idx" ON "enrollment_freezes" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "enrollment_freezes_approved_by_idx" ON "enrollment_freezes" USING btree ("approved_by");--> statement-breakpoint
CREATE INDEX "enrollments_student_id_idx" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_group_id_idx" ON "enrollments" USING btree ("group_id");