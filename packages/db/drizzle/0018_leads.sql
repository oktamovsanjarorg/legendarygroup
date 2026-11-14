CREATE TABLE "lead_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lead_id" uuid NOT NULL,
	"status" text NOT NULL,
	"actor_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_events_status_check" CHECK ("lead_events"."status" IN ('new', 'contacted', 'trial', 'won', 'lost'))
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"full_name" text NOT NULL,
	"search_name" text NOT NULL,
	"phone" text NOT NULL,
	"course_id" uuid,
	"source" text,
	"status" text DEFAULT 'new' NOT NULL,
	"assigned_to" uuid,
	"notes" text,
	"lost_reason" text,
	"trial_lesson_id" uuid,
	"student_id" uuid,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_status_check" CHECK ("leads"."status" IN ('new', 'contacted', 'trial', 'won', 'lost')),
	CONSTRAINT "leads_source_check" CHECK ("leads"."source" IN ('instagram', 'telegram', 'referral', 'banner', 'website', 'other')),
	CONSTRAINT "leads_won_student_check" CHECK (("leads"."status" = 'won') = ("leads"."student_id" IS NOT NULL)),
	CONSTRAINT "leads_lost_reason_check" CHECK ("leads"."status" <> 'lost' OR "leads"."lost_reason" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_trial_lesson_id_lessons_id_fk" FOREIGN KEY ("trial_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_events_lead_id_idx" ON "lead_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_events_actor_id_idx" ON "lead_events" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_open_phone_uq" ON "leads" USING btree ("phone") WHERE "leads"."status" IN ('new', 'contacted', 'trial');--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status","status_changed_at");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_course_id_idx" ON "leads" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "leads_assigned_to_idx" ON "leads" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "leads_trial_lesson_id_idx" ON "leads" USING btree ("trial_lesson_id");--> statement-breakpoint
CREATE INDEX "leads_student_id_idx" ON "leads" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "leads_search_name_trgm_idx" ON "leads" USING gin ("search_name" gin_trgm_ops);