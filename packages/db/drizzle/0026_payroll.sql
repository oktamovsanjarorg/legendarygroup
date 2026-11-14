CREATE TABLE IF NOT EXISTS "teacher_contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE RESTRICT,
  "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "group_id" uuid REFERENCES "groups"("id") ON DELETE SET NULL,
  "type" text NOT NULL,
  "fixed_amount" bigint DEFAULT 0 NOT NULL,
  "percent_bp" integer DEFAULT 0 NOT NULL,
  "per_lesson_rate" bigint DEFAULT 0 NOT NULL,
  "base" text DEFAULT 'collected' NOT NULL,
  "valid_from" date NOT NULL,
  "valid_to" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "teacher_contracts_type_check" CHECK ("type" IN ('fixed', 'percent', 'mixed')),
  CONSTRAINT "teacher_contracts_base_check" CHECK ("base" IN ('collected', 'accrued')),
  CONSTRAINT "teacher_contracts_percent_check" CHECK ("percent_bp" >= 0 AND "percent_bp" <= 10000)
);

CREATE INDEX IF NOT EXISTS "teacher_contracts_teacher_idx" ON "teacher_contracts" ("teacher_id");
CREATE INDEX IF NOT EXISTS "teacher_contracts_branch_idx" ON "teacher_contracts" ("branch_id");

CREATE TABLE IF NOT EXISTS "payroll_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE RESTRICT,
  "period" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "total_amount" bigint DEFAULT 0 NOT NULL,
  "approved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at" timestamp with time zone,
  "paid_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payroll_runs_status_check" CHECK ("status" IN ('draft', 'approved', 'paid'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "payroll_runs_branch_period_idx" ON "payroll_runs" ("branch_id", "period");
CREATE INDEX IF NOT EXISTS "payroll_runs_period_idx" ON "payroll_runs" ("period");

CREATE TABLE IF NOT EXISTS "payroll_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id" uuid NOT NULL REFERENCES "payroll_runs"("id") ON DELETE CASCADE,
  "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "kind" text NOT NULL,
  "amount" bigint NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payroll_items_kind_check" CHECK ("kind" IN ('fixed', 'percent', 'per_lesson', 'bonus', 'penalty', 'advance', 'adjustment'))
);

CREATE INDEX IF NOT EXISTS "payroll_items_run_idx" ON "payroll_items" ("run_id");
CREATE INDEX IF NOT EXISTS "payroll_items_teacher_idx" ON "payroll_items" ("teacher_id");

CREATE TABLE IF NOT EXISTS "teacher_advances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE RESTRICT,
  "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" bigint NOT NULL,
  "given_at" date NOT NULL,
  "deducted_in_run_id" uuid REFERENCES "payroll_runs"("id") ON DELETE SET NULL,
  "note" text,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "teacher_advances_amount_check" CHECK ("amount" > 0)
);

CREATE INDEX IF NOT EXISTS "teacher_advances_teacher_idx" ON "teacher_advances" ("teacher_id");
CREATE INDEX IF NOT EXISTS "teacher_advances_deducted_idx" ON "teacher_advances" ("deducted_in_run_id");

GRANT SELECT, INSERT, UPDATE, DELETE ON "teacher_contracts" TO lg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "payroll_runs" TO lg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "payroll_items" TO lg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "teacher_advances" TO lg_app;
