ALTER TABLE "roles" DROP CONSTRAINT "roles_code_check";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_active_role_check";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_role_check";--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "access_code_hash" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "access_code_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "students_user_id_uq" ON "students" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "students_access_code_hash_idx" ON "students" USING btree ("access_code_hash");--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_code_check" CHECK ("roles"."code" IN ('director', 'admin', 'teacher', 'guardian', 'student'));--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_active_role_check" CHECK ("sessions"."active_role" IN ('director', 'admin', 'teacher', 'guardian', 'student'));--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_role_check" CHECK ("audit_logs"."actor_role" IN ('director', 'admin', 'teacher', 'guardian', 'student'));