ALTER TABLE "idempotency_keys" DROP CONSTRAINT "idempotency_keys_key_route_pk";--> statement-breakpoint
ALTER TABLE "idempotency_keys" ALTER COLUMN "response_status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_scope_uq" UNIQUE NULLS NOT DISTINCT("key","route","user_id");