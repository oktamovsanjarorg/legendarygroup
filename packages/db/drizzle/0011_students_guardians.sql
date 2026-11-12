CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardians_phone_e164_check" CHECK ("guardians"."phone" ~ '^\+[1-9][0-9]{6,14}$')
);
--> statement-breakpoint
CREATE TABLE "student_guardians" (
	"student_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"relation" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"notify" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_guardians_student_id_guardian_id_pk" PRIMARY KEY("student_id","guardian_id"),
	CONSTRAINT "student_guardians_relation_check" CHECK ("student_guardians"."relation" IN ('father', 'mother', 'guardian', 'other'))
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"code" integer GENERATED ALWAYS AS IDENTITY (sequence name "students_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 10001 CACHE 1),
	"full_name" text NOT NULL,
	"search_name" text NOT NULL,
	"birth_date" date,
	"gender" text,
	"phone" text,
	"school" text,
	"grade" text,
	"source" text,
	"notes" text,
	"photo_file_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_code_unique" UNIQUE("code"),
	CONSTRAINT "students_gender_check" CHECK ("students"."gender" IN ('male', 'female')),
	CONSTRAINT "students_source_check" CHECK ("students"."source" IN ('instagram', 'telegram', 'referral', 'banner', 'website', 'other')),
	CONSTRAINT "students_phone_e164_check" CHECK ("students"."phone" ~ '^\+[1-9][0-9]{6,14}$')
);
--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_photo_file_id_files_id_fk" FOREIGN KEY ("photo_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guardians_phone_uq" ON "guardians" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "guardians_user_id_uq" ON "guardians" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guardians_branch_id_idx" ON "guardians" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "student_guardians_guardian_id_idx" ON "student_guardians" USING btree ("guardian_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_guardians_one_primary_uq" ON "student_guardians" USING btree ("student_id") WHERE "student_guardians"."is_primary";--> statement-breakpoint
CREATE INDEX "students_branch_id_idx" ON "students" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "students_photo_file_id_idx" ON "students" USING btree ("photo_file_id");--> statement-breakpoint
CREATE INDEX "students_created_at_id_idx" ON "students" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "students_search_name_trgm_idx" ON "students" USING gin ("search_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "students_phone_idx" ON "students" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "students_dup_idx" ON "students" USING btree ("search_name","birth_date");