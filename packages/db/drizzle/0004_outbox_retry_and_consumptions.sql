CREATE TABLE "outbox_consumptions" (
	"consumer" text NOT NULL,
	"event_id" uuid NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_consumptions_consumer_event_id_pk" PRIMARY KEY("consumer","event_id")
);
--> statement-breakpoint
DROP INDEX "outbox_events_pending_idx";--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbox_consumptions" ADD CONSTRAINT "outbox_consumptions_event_id_outbox_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."outbox_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_consumptions_event_idx" ON "outbox_consumptions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "outbox_events_due_idx" ON "outbox_events" USING btree ("next_attempt_at") WHERE "outbox_events"."processed_at" IS NULL AND "outbox_events"."failed_at" IS NULL;