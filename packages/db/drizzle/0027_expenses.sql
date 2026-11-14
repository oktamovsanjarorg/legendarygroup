CREATE TABLE IF NOT EXISTS "expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE RESTRICT,
  "category" text NOT NULL,
  "amount" bigint NOT NULL,
  "date" date NOT NULL,
  "note" text,
  "file_id" uuid REFERENCES "files"("id") ON DELETE SET NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "expenses_category_check" CHECK ("category" IN ('rent', 'utilities', 'marketing', 'salary', 'supplies', 'maintenance', 'other')),
  CONSTRAINT "expenses_amount_positive_chk" CHECK ("amount" > 0)
);

CREATE INDEX IF NOT EXISTS "expenses_branch_date_idx" ON "expenses" ("branch_id", "date");
CREATE INDEX IF NOT EXISTS "expenses_category_date_idx" ON "expenses" ("category", "date");
