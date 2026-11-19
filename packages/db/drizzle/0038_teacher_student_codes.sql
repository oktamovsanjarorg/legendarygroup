CREATE TABLE "teacher_student_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"teacher_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"code" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_student_codes_code_check" CHECK ("teacher_student_codes"."code" BETWEEN 1 AND 999)
);
--> statement-breakpoint
ALTER TABLE "teacher_student_codes" ADD CONSTRAINT "teacher_student_codes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_student_codes" ADD CONSTRAINT "teacher_student_codes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_student_codes_teacher_code_uq" ON "teacher_student_codes" USING btree ("teacher_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_student_codes_teacher_student_uq" ON "teacher_student_codes" USING btree ("teacher_id","student_id");--> statement-breakpoint
CREATE INDEX "teacher_student_codes_student_id_idx" ON "teacher_student_codes" USING btree ("student_id");