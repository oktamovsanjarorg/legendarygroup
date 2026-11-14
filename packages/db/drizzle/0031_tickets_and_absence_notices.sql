CREATE TABLE IF NOT EXISTS "tickets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"author_id" uuid NOT NULL,
	"student_id" uuid,
	"subject" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assigned_to" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_status_check" CHECK ("tickets"."status" IN ('open','in_progress','resolved','closed')),
	CONSTRAINT "tickets_priority_check" CHECK ("tickets"."priority" IN ('low','normal','high'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"text" text NOT NULL,
	"file_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "absence_notices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"student_id" uuid NOT NULL,
	"guardian_user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "absence_notices_status_check" CHECK ("absence_notices"."status" IN ('pending','acknowledged','applied','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_notices" ADD CONSTRAINT "absence_notices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_notices" ADD CONSTRAINT "absence_notices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_notices" ADD CONSTRAINT "absence_notices_guardian_user_id_users_id_fk" FOREIGN KEY ("guardian_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_branch_id_idx" ON "tickets" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_author_id_idx" ON "tickets" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_student_id_idx" ON "tickets" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_assigned_to_idx" ON "tickets" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_status_priority_idx" ON "tickets" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_last_message_idx" ON "tickets" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_messages_ticket_id_idx" ON "ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_messages_author_id_idx" ON "ticket_messages" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "absence_notices_branch_id_idx" ON "absence_notices" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "absence_notices_student_date_idx" ON "absence_notices" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "absence_notices_guardian_idx" ON "absence_notices" USING btree ("guardian_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "absence_notices_status_idx" ON "absence_notices" USING btree ("status");
