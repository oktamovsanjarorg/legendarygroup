CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"levels" text[] DEFAULT '{}'::text[] NOT NULL,
	"default_monthly_price" bigint NOT NULL,
	"lesson_duration_min" integer NOT NULL,
	"duration_months" integer,
	"grade_scale" text DEFAULT '0_5' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_grade_scale_check" CHECK ("courses"."grade_scale" IN ('0_5', '0_100')),
	CONSTRAINT "courses_price_check" CHECK ("courses"."default_monthly_price" >= 0),
	CONSTRAINT "courses_lesson_duration_check" CHECK ("courses"."lesson_duration_min" BETWEEN 15 AND 480),
	CONSTRAINT "courses_duration_months_check" CHECK ("courses"."duration_months" BETWEEN 1 AND 60)
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid DEFAULT '01900000-0000-7000-8000-000000000001' NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_capacity_check" CHECK ("rooms"."capacity" BETWEEN 1 AND 500)
);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courses_branch_id_idx" ON "courses" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_branch_name_active_uq" ON "courses" USING btree ("branch_id",lower("name")) WHERE "courses"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "rooms_branch_id_idx" ON "rooms" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_branch_name_active_uq" ON "rooms" USING btree ("branch_id",lower("name")) WHERE "rooms"."archived_at" IS NULL;