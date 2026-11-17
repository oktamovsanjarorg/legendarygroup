DROP INDEX "students_access_code_hash_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "students_access_code_hash_uq" ON "students" USING btree ("access_code_hash");