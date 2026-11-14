CREATE TABLE "cash_closings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"date" date NOT NULL,
	"expected_cash" bigint NOT NULL,
	"counted_cash" bigint NOT NULL,
	"diff" bigint NOT NULL,
	"closed_by" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cash_closings_branch_date_uq" ON "cash_closings" USING btree ("branch_id","date");--> statement-breakpoint
CREATE INDEX "cash_closings_branch_id_idx" ON "cash_closings" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "cash_closings_date_idx" ON "cash_closings" USING btree ("date");