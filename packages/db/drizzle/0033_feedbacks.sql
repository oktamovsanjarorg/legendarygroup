CREATE TABLE IF NOT EXISTS "feedbacks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"type" text DEFAULT 'general' NOT NULL,
	"text" text NOT NULL,
	"file_id" uuid,
	"screen" text,
	"app_version" text,
	"platform" text DEFAULT 'web' NOT NULL,
	"request_id" text,
	"client_context" jsonb,
	"status" text DEFAULT 'received' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedbacks_type_check" CHECK ("feedbacks"."type" IN ('bug','suggestion','general')),
	CONSTRAINT "feedbacks_platform_check" CHECK ("feedbacks"."platform" IN ('web','miniapp','bot'))
);
--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedbacks_user_id_idx" ON "feedbacks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedbacks_created_at_idx" ON "feedbacks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedbacks_type_idx" ON "feedbacks" USING btree ("type");
