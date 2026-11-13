CREATE TABLE IF NOT EXISTS "tests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE RESTRICT,
  "group_id" uuid NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "date" date NOT NULL,
  "max_score" integer NOT NULL,
  "sections" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" text NOT NULL DEFAULT 'draft',
  "published_at" timestamp with time zone,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tests_status_check" CHECK ("status" IN ('draft', 'published')),
  CONSTRAINT "tests_max_score_check" CHECK ("max_score" > 0)
);

CREATE INDEX IF NOT EXISTS "tests_group_idx" ON "tests" ("group_id");
CREATE INDEX IF NOT EXISTS "tests_branch_idx" ON "tests" ("branch_id");
CREATE INDEX IF NOT EXISTS "tests_date_idx" ON "tests" ("date");

CREATE TABLE IF NOT EXISTS "test_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "test_id" uuid NOT NULL REFERENCES "tests"("id") ON DELETE CASCADE,
  "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "score" integer NOT NULL,
  "section_scores" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "version" integer NOT NULL DEFAULT 1,
  "client_mutation_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "test_results_score_check" CHECK ("score" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "test_results_test_student_idx" ON "test_results" ("test_id", "student_id");
CREATE INDEX IF NOT EXISTS "test_results_test_idx" ON "test_results" ("test_id");
CREATE INDEX IF NOT EXISTS "test_results_student_idx" ON "test_results" ("student_id");

CREATE TABLE IF NOT EXISTS "imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE RESTRICT,
  "kind" text NOT NULL DEFAULT 'test_results',
  "file_id" uuid REFERENCES "files"("id") ON DELETE SET NULL,
  "mapping" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'completed',
  "report" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "imports_branch_idx" ON "imports" ("branch_id");
CREATE INDEX IF NOT EXISTS "imports_created_by_idx" ON "imports" ("created_by");

GRANT SELECT, INSERT, UPDATE, DELETE ON "tests" TO lg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "test_results" TO lg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "imports" TO lg_app;
