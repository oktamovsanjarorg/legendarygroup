CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_monthly_revenue" AS
SELECT 
  branch_id,
  to_char(paid_at AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM') AS period,
  count(id)::int AS payment_count,
  count(DISTINCT student_id)::int AS student_count,
  coalesce(sum(amount), 0)::bigint AS total_revenue
FROM payments
WHERE amount > 0 AND reversal_of IS NULL
GROUP BY branch_id, to_char(paid_at AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM');
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mv_monthly_revenue_uq" 
ON "mv_monthly_revenue" (branch_id, period);
