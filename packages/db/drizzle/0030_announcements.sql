CREATE TABLE IF NOT EXISTS "announcements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"file_url" text,
	"file_type" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"blocked_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcements_target_type_check" CHECK ("announcements"."target_type" IN ('all','course','group','debtors')),
	CONSTRAINT "announcements_status_check" CHECK ("announcements"."status" IN ('draft','scheduled','processing','completed','failed','cancelled'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcement_recipients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"announcement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_id" uuid,
	"recipient_name" text NOT NULL,
	"recipient_phone" text,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp with time zone,
	"failed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_recipients_status_check" CHECK ("announcement_recipients"."status" IN ('queued','sent','failed','blocked'))
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_recipients" ADD CONSTRAINT "announcement_recipients_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_recipients" ADD CONSTRAINT "announcement_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_recipients" ADD CONSTRAINT "announcement_recipients_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_branch_id_idx" ON "announcements" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_author_id_idx" ON "announcements" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_created_idx" ON "announcements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_recipients_announcement_id_idx" ON "announcement_recipients" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_recipients_user_id_idx" ON "announcement_recipients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_recipients_status_idx" ON "announcement_recipients" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "announcement_recipients_unique_user_idx" ON "announcement_recipients" USING btree ("announcement_id","user_id");
