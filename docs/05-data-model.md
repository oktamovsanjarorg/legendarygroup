# 05 — Ma'lumotlar modeli

> Konvensiyalar: jadval nomlari `snake_case` ko'plik; PK `id uuid` (UUIDv7 — vaqt bo'yicha tartiblangan);
> har jadvalda `created_at`, `updated_at` (`timestamptz`), biznes jadvallarda `deleted_at` (soft delete) va
> `branch_id` (hozir bitta qiymat, kelajak uchun). Pul — `bigint` (so'm). Enumlar — Postgres enum emas,
> `text` + CHECK (migratsiya oson).

## ER diagramma (qisqa)

```
users ─┬─< user_roles >── roles ──< role_permissions
       ├── staff_profiles (ustoz/admin)
       └── guardians ──< student_guardians >── students
                                                 │
courses ──< groups >── rooms                     │
              │ └──< group_teachers >── users    │
              ├──< schedule_slots                │
              ├──< lessons ──< attendance >──────┤
              │        └──< grades >─────────────┤
              ├──< tests ──< test_results >──────┤
              └──< enrollments >─────────────────┘
                        │
invoices ──< invoice_lines >── enrollments
payments ──< payment_allocations >── invoice_lines
payment_submissions (ota-ona cheki) ──► payments
ledger_entries (students balansi — haqiqat manbai)
receipts ── payments
teacher_contracts ──< payroll_runs ──< payroll_items
expenses, files, notifications, outbox_events, audit_logs, settings, holidays, leads
```

## Jadvallar

### Identifikatsiya

| Jadval                      | Asosiy maydonlar                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`                     | id, full_name, phone (unique, E.164), telegram_id (unique, null), telegram_username, password_hash (null — faqat xodimlar), totp_secret (shifrlangan), status (active/blocked), last_login_at, permissions_version (int) |
| `roles`                     | id, code (`director`/`admin`/`teacher`/`guardian`), name                                                                                                                                                                 |
| `permissions`               | code (PK, masalan `payment.confirm`), description                                                                                                                                                                        |
| `role_permissions`          | role_id, permission_code                                                                                                                                                                                                 |
| `user_roles`                | user_id, role_id                                                                                                                                                                                                         |
| `user_permission_overrides` | user_id, permission_code, granted (bool) — faqat delegatsiya qilinadigan ruxsatlar                                                                                                                                       |
| `approval_requests`         | id, type (discount/reversal/refund/attendance_edit), payload (jsonb), reason, requested_by, status (pending/approved/rejected/expired), decided_by, decided_at, decision_note, expires_at                                |
| `sessions`                  | id, user_id, active_role, refresh_token_hash, family_id, device, ip, expires_at, revoked_at                                                                                                                              |

### Tashkiliy

| Jadval           | Asosiy maydonlar                                                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `courses`        | id, name, description, default_monthly_price, lesson_duration_min, grade_scale                                                                                                                                               |
| `rooms`          | id, name, capacity                                                                                                                                                                                                           |
| `groups`         | id, course_id, name, room_id, monthly_price, max_students, start_date, end_date, status, grading_config (jsonb), penalty_config (jsonb, null = global)                                                                       |
| `group_teachers` | group_id, teacher_id, role (main/assistant), from_date, to_date (o'rinbosar — `lessons.teacher_id` asosiy ustozdan farq qilganda; scope shu darsga beriladi)                                                                 |
| `schedule_slots` | id, group_id, weekday (1–7), start_time, end_time, valid_from, valid_to                                                                                                                                                      |
| `lessons`        | id, group_id, date, start_time, end_time, time_range (`tstzrange`, generated), room_id (guruhdan meros, o'zgartirish mumkin), teacher_id (haqiqiy o'tgan), status (scheduled/done/cancelled), cancel_reason, is_extra, topic |
| `holidays`       | date, name                                                                                                                                                                                                                   |

### O'quvchilar

| Jadval               | Asosiy maydonlar                                                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `students`           | id, code (unique, inson o'qiy oladigan ketma-ket raqam, masalan `10234` — Excel import, qidiruv va telefonda aytish uchun), full_name, birth_date, gender, phone, school, grade, source, notes, photo_file_id, status (active/archived) |
| `guardians`          | id, user_id, full_name, phone, relation                                                                                                                                                                                                 |
| `student_guardians`  | student_id, guardian_id, is_primary, notify (bool)                                                                                                                                                                                      |
| `enrollments`        | id, student_id, group_id, start_date, end_date, end_reason, discount_percent, status (active/frozen/left/finished)                                                                                                                      |
| `enrollment_freezes` | id, enrollment_id, from_date, to_date, reason, approved_by                                                                                                                                                                              |
| `leads`              | id, full_name, phone, course_id, source, status, trial_lesson_id, assigned_to, notes                                                                                                                                                    |

### Davomat va natijalar

| Jadval             | Asosiy maydonlar                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `attendance`       | id, lesson_id, student_id, status, late_minutes, note, marked_by, marked_at, client_mutation_id (idempotentlik) — unique(lesson_id, student_id) |
| `absence_notices`  | id, student_id, date, reason, created_by (ota-ona), status                                                                                      |
| `grades`           | id, lesson_id, student_id, kind (homework/activity), value, created_by                                                                          |
| `teacher_comments` | id, student_id, group_id, lesson_id (null), text, visibility (guardian/internal), created_by                                                    |
| `tests`            | id, group_id, name, date, max_score, sections (jsonb), published_at                                                                             |
| `test_results`     | id, test_id, student_id, score, section_scores (jsonb), version                                                                                 |
| `imports`          | id, kind (test_results), file_id, mapping (jsonb), status, report (jsonb), created_by                                                           |

### Billing (ledger)

| Jadval                | Asosiy maydonlar                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invoices`            | id, student_id, period (YYYY-MM), due_date, total, status (open/paid/partially_paid/void) — **unique(student_id, period)**: oy o'rtasidagi yangi enrollment yangi invoice emas, mavjud invoice'ga qator qo'shadi                                                                                                                                                                        |
| `invoice_lines`       | id, invoice_id, enrollment_id, kind (tuition/penalty/credit/discount), amount, description                                                                                                                                                                                                                                                                                              |
| `payments`            | id, student_id, amount, method, paid_at, received_by, submission_id (null), status (posted/reversed), reversal_of (null), idempotency_key                                                                                                                                                                                                                                               |
| `payment_allocations` | payment_id, invoice_line_id, amount                                                                                                                                                                                                                                                                                                                                                     |
| `payment_submissions` | id, student_id, guardian_id, amount_claimed, comment, file_id, image_phash, status (pending/confirmed/rejected), reviewed_by, reviewed_at, reject_reason, payment_id                                                                                                                                                                                                                    |
| `receipts`            | id, number (unique), payment_id, pdf_file_id, status (valid/cancelled), verify_token                                                                                                                                                                                                                                                                                                    |
| `ledger_entries`      | id, student_id, entry_type (invoice/payment/discount/penalty/refund/reversal/credit), amount, ref_table, ref_id, occurred_at — **faqat INSERT**. **Ishora qoidasi:** `amount > 0` — o'quvchi qarzi oshadi (invoice, jarima, refund); `amount < 0` — qarz kamayadi (to'lov, chegirma, kredit). `Σ amount > 0` → qarz, `< 0` → avans. UI'da ota-onaga "Balans" = `−Σ amount` ko'rsatiladi |
| `cash_closings`       | id, date, expected_cash, counted_cash, diff, closed_by, note                                                                                                                                                                                                                                                                                                                            |

### Moliya va oylik

| Jadval              | Asosiy maydonlar                                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `teacher_contracts` | id, teacher_id, group_id (null = umumiy), type (fixed/percent/mixed), fixed_amount, percent (numeric(5,2)), per_lesson_rate, base (collected/accrued), valid_from, valid_to |
| `payroll_runs`      | id, period, status (draft/approved/paid), approved_by, approved_at                                                                                                          |
| `payroll_items`     | id, run_id, teacher_id, kind (fixed/percent/per_lesson/bonus/penalty/advance), amount, details (jsonb), note                                                                |
| `teacher_advances`  | id, teacher_id, amount, given_at, deducted_in_run_id                                                                                                                        |
| `expenses`          | id, category, amount, date, note, file_id, created_by                                                                                                                       |

### Tizim

| Jadval                                | Asosiy maydonlar                                                                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `files`                               | id, s3_key, mime, size, sha256, uploaded_by, purpose                                                                                               |
| `notifications`                       | id, user_id, channel (telegram), template, payload (jsonb), status (queued/sent/failed/blocked), sent_at, error                                    |
| `notification_prefs`                  | user_id, type, enabled                                                                                                                             |
| `announcements`                       | id, text, file_id, audience (jsonb), created_by, stats (jsonb)                                                                                     |
| `support_tickets` / `ticket_messages` | ota-ona murojaatlari                                                                                                                               |
| `outbox_events`                       | id, type, payload, created_at, processed_at, attempts                                                                                              |
| `audit_logs`                          | id, actor_id, action, entity, entity_id, before (jsonb), after (jsonb), ip, user_agent, at — **faqat INSERT**, DB rolida UPDATE/DELETE taqiqlangan |
| `settings`                            | key, value (jsonb), updated_by                                                                                                                     |
| `feature_flags`                       | key, enabled, rules (jsonb)                                                                                                                        |

## Indekslar va cheklovlar (asosiylari)

- `attendance (lesson_id, student_id)` UNIQUE; `lessons (group_id, date)`.
- `ledger_entries (student_id, occurred_at)`.
- `payments (idempotency_key)` UNIQUE.
- `receipts (number)` UNIQUE, sequence `receipt_seq_{yil}`.
- Jadval to'qnashuvi: `lessons` uchun ikkita exclusion constraint (btree_gist) — `(room_id WITH =, time_range WITH &&)` va `(teacher_id WITH =, time_range WITH &&)`, faqat `status <> 'cancelled'` qatorlar uchun.
- `students (code)` UNIQUE, sequence'dan.
- `users (phone)` UNIQUE, `users (telegram_id)` UNIQUE.

## Migratsiya qoidalari

1. Faqat oldinga (forward-only), har migratsiya **orqaga mos** (expand → migrate → contract): avval ustun qo'shiladi, kod ikkalasini qo'llab-quvvatlaydi, keyingi relizda eski olib tashlanadi.
2. Katta jadvalga indeks — `CONCURRENTLY`.
3. Har migratsiya CI'da toza DB'da va prod snapshot nusxasida (staging) sinovdan o'tadi.
