CREATE TABLE IF NOT EXISTS "guardian_link_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"telegram_id" bigint NOT NULL,
	"telegram_username" text,
	"phone" text NOT NULL,
	"full_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"resolved_guardian_id" uuid,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardian_link_requests_status_check" CHECK ("guardian_link_requests"."status" IN ('pending','approved','rejected')),
	CONSTRAINT "guardian_link_requests_phone_e164_check" CHECK ("guardian_link_requests"."phone" ~ '^\+[1-9][0-9]{6,14}$')
);
--> statement-breakpoint
ALTER TABLE "guardian_link_requests" ADD CONSTRAINT "guardian_link_requests_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_link_requests" ADD CONSTRAINT "guardian_link_requests_resolved_guardian_id_guardians_id_fk" FOREIGN KEY ("resolved_guardian_id") REFERENCES "public"."guardians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_link_requests" ADD CONSTRAINT "guardian_link_requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardian_link_requests_telegram_id_idx" ON "guardian_link_requests" USING btree ("telegram_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardian_link_requests_phone_idx" ON "guardian_link_requests" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardian_link_requests_status_idx" ON "guardian_link_requests" USING btree ("status");
