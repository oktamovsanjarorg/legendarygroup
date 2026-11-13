CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"recipient" text NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"job_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"failed_reason" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_type_check" CHECK ("notifications"."type" IN ('attendance_absent','attendance_late','attendance_correction','billing_invoice_created','billing_payment_confirmed','billing_reminder','grade_recorded','test_results_published','announcement')),
	CONSTRAINT "notifications_channel_check" CHECK ("notifications"."channel" IN ('telegram','sms','push')),
	CONSTRAINT "notifications_status_check" CHECK ("notifications"."status" IN ('queued','sent','failed','blocked'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_type_pk" PRIMARY KEY("user_id","type"),
	CONSTRAINT "notification_preferences_type_check" CHECK ("notification_preferences"."type" IN ('attendance_absent','attendance_late','attendance_correction','billing_invoice_created','billing_payment_confirmed','billing_reminder','grade_recorded','test_results_published','announcement'))
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_branch_id_idx" ON "notifications" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_status_created_idx" ON "notifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_dedupe_key_idx" ON "notifications" USING btree ("dedupe_key");
