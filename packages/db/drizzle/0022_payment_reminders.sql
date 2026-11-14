CREATE TABLE "payment_reminders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"student_id" uuid NOT NULL,
	"guardian_id" uuid,
	"invoice_id" uuid,
	"type" text NOT NULL,
	"debt_amount" bigint NOT NULL,
	"overdue_days" integer DEFAULT 0 NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_reminders_student_id_idx" ON "payment_reminders" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "payment_reminders_sent_at_idx" ON "payment_reminders" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "payment_reminders_branch_id_idx" ON "payment_reminders" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "payment_reminders_type_idx" ON "payment_reminders" USING btree ("type");--> statement-breakpoint
CREATE TRIGGER payment_reminders_immutability
  BEFORE UPDATE OR DELETE ON payment_reminders
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
