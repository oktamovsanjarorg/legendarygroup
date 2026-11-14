-- audit_logs — faqat INSERT (05-data-model.md, 07-quality-security.md).
-- Ikki qatlam:
--   1) Grant: ilova `lg_app` guruh roli orqali ishlaydi; unda UPDATE/DELETE/TRUNCATE yo'q.
--      Staging/prod login foydalanuvchisi: `GRANT lg_app TO <login>` (T-012).
--   2) Trigger: jadval egasi/superuser uchun ham taqiq (himoya chuqurligi).
-- `forbid_mutation()` umumiy — keyin ledger_entries, payments, receipts ham shu bilan himoyalanadi.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lg_app') THEN
    CREATE ROLE lg_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO lg_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lg_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lg_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lg_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO lg_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "audit_logs" FROM lg_app, PUBLIC;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% jadvali o''zgarmas: % taqiqlangan', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update_delete
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
