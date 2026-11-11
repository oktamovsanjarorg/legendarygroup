# 05 — Ma'lumotlar modeli

> Konvensiyalar: jadval nomlari `snake_case` ko'plik; PK `id uuid` (UUIDv7 — vaqt bo'yicha tartiblangan, ilovada generatsiya);
> har jadvalda `created_at`, `updated_at` (`timestamptz`) — o'zgarmas jadvallarda (`ledger_entries`, `audit_logs`, `payments`, `receipts`, `receipt_cancellations`) faqat `created_at`/`at`;
> biznes jadvallarda `archived_at timestamptz null` (soft delete = arxivlash; fizik DELETE yo'q) va `branch_id` (FK → `branches`, hozir bitta qator; jadval T-102 da birinchi biznes jadvallar bilan yaratiladi).
> Pul — `bigint` (so'm). Foiz: chegirma — butun son 0–100; ustoz foizi — `percent_bp int` (bazis punkt, 1% = 100) — float/numeric pul hisobida yo'q. Enumlar — Postgres enum emas, `text` + CHECK (qiymatlar `@lg/contracts`dan; kichik harf snake_case). Telefon — E.164 (CHECK).

## ER diagramma (qisqa)

```
users ─┬─< user_roles >── roles ──< role_permissions
       ├── staff_profiles (xodim: lavozim, ishga kirgan/bo'shagan sana)
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

| Jadval                      | Asosiy maydonlar                                                                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                     | id, full_name, phone (unique, E.164), telegram_id (unique, null), telegram_username, password_hash (null — faqat xodimlar), totp_secret (shifrlangan), status (active/blocked), last_login_at, permissions_version (int)                                                                        |
| `roles`                     | id, code (`director`/`admin`/`teacher`/`guardian`), name                                                                                                                                                                                                                                        |
| `permissions`               | code (PK, masalan `payment.review`), description                                                                                                                                                                                                                                                |
| `role_permissions`          | role_id, permission_code                                                                                                                                                                                                                                                                        |
| `user_roles`                | user_id, role_id                                                                                                                                                                                                                                                                                |
| `user_permission_overrides` | user_id, permission_code, granted (bool) — faqat delegatsiya qilinadigan ruxsatlar                                                                                                                                                                                                              |
| `approval_requests`         | id, type (discount/reversal/refund/attendance_edit), payload (jsonb), reason, requested_by, status (pending/approved/rejected/expired), decided_by, decided_at, decision_note, expires_at                                                                                                       |
| `sessions`                  | id, user_id, active_role, refresh_token_hash, family_id, device, ip, expires_at, revoked_at — **faqat web panel** (Mini App: initData → 15 daq access token, refresh yo'q; muddati o'tsa joriy initData bilan qayta almashtiriladi, `auth_date` ≤ 24 soat)                                      |
| `user_backup_codes`         | user_id, code_hash, used_at — TOTP zaxira kodlari (T-006)                                                                                                                                                                                                                                       |
| `staff_profiles`            | user_id (PK), position, hired_at, left_at, note (T-101)                                                                                                                                                                                                                                         |
| `staff_invites`             | id, user_id, token_hash, expires_at (24 soat), used_at — xodim/Director sozlash havolasi (parol + TOTP)                                                                                                                                                                                         |
| `idempotency_keys`          | key, user_id, route, request_hash, response_status (null — bajarilmoqda), response_body (jsonb), created_at, expires_at (24 soat) — UNIQUE (key, route, user_id) NULLS NOT DISTINCT; `Idempotency-Key` interceptor'i (T-004, ADR 0004); bir xil kalit + boshqa body → 422, bajarilayotgan → 409 |

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

| Jadval               | Asosiy maydonlar                                                                                                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `students`           | id, code (unique, sequence'dan, inson o'qiy oladigan raqam, masalan `10234` — Excel import, qidiruv va telefonda aytish uchun), full_name, birth_date, gender, phone, school, grade, source, notes, photo_file_id, archived_at (null = faol) |
| `guardians`          | id, user_id (null — bot orqali bog'lanmaguncha; FR-AUTH-1 da to'ldiriladi va `user_roles`ga `guardian` qo'shiladi), full_name, phone (unique, E.164 — bog'lash kaliti)                                                                       |
| `student_guardians`  | student_id, guardian_id, relation (ota/ona/vasiy/boshqa), is_primary, notify (bool) — PK(student_id, guardian_id)                                                                                                                            |
| `enrollments`        | id, student_id, group_id, start_date, end_date, end_reason, discount_percent (int 0–100, null), status (active/frozen/left/finished)                                                                                                         |
| `enrollment_freezes` | id, enrollment_id, from_date, to_date, reason, approved_by                                                                                                                                                                                   |
| `leads`              | id, full_name, phone, course_id, source, status, trial_lesson_id, assigned_to, notes                                                                                                                                                         |

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

| Jadval                  | Asosiy maydonlar                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invoices`              | id, student_id, period (YYYY-MM), due_date, total, status (open/paid/partially_paid/void) — **unique(student_id, period)**: oy o'rtasidagi yangi enrollment yangi invoice emas, mavjud invoice'ga qator qo'shadi                                                                                                                                                                        |
| `invoice_lines`         | id, invoice_id, enrollment_id, kind (tuition/penalty/credit/discount), amount, description                                                                                                                                                                                                                                                                                              |
| `payments`              | id, student_id, amount (> 0 to'lov, < 0 storno), method, paid_at, received_by, submission_id (null), reversal_of (null — storno qatori asl to'lovga ishora qiladi; bitta to'lovga bitta storno: unique), idempotency_key (unique) — **faqat INSERT**, holat ustuni yo'q: "bekor qilingan" = unga ishora qiluvchi storno qatori bor                                                      |
| `payment_allocations`   | payment_id, invoice_line_id, amount                                                                                                                                                                                                                                                                                                                                                     |
| `payment_submissions`   | id, student_id, guardian_id, amount_claimed, comment, file_id, image_phash, status (pending_review/confirmed/rejected), review_locked_by, review_locked_until, reviewed_by, reviewed_at, reject_reason, payment_id                                                                                                                                                                      |
| `receipts`              | id, number (unique), payment_id (unique), pdf_file_id, verify_token (unique, tasodifiy 128 bit) — **faqat INSERT**                                                                                                                                                                                                                                                                      |
| `receipt_cancellations` | receipt_id (PK), reversal_payment_id, reason, created_by, created_at — **faqat INSERT**                                                                                                                                                                                                                                                                                                 |
| `receipt_counters`      | year (PK), last (int) — BR-19 raqamlash                                                                                                                                                                                                                                                                                                                                                 |
| `ledger_entries`        | id, student_id, entry_type (invoice/payment/discount/penalty/refund/reversal/credit), amount, ref_table, ref_id, occurred_at — **faqat INSERT**. **Ishora qoidasi:** `amount > 0` — o'quvchi qarzi oshadi (invoice, jarima, refund); `amount < 0` — qarz kamayadi (to'lov, chegirma, kredit). `Σ amount > 0` → qarz, `< 0` → avans. UI'da ota-onaga "Balans" = `−Σ amount` ko'rsatiladi |
| `cash_closings`         | id, date, expected_cash, counted_cash, diff, closed_by, note                                                                                                                                                                                                                                                                                                                            |

### Moliya va oylik

| Jadval              | Asosiy maydonlar                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `teacher_contracts` | id, teacher_id, group_id (null = umumiy), type (fixed/percent/mixed), fixed_amount (bigint), percent_bp (int, 0–10000), per_lesson_rate (bigint), base (collected/accrued), valid_from, valid_to |
| `payroll_runs`      | id, period, status (draft/approved/paid), approved_by, approved_at                                                                                                                               |
| `payroll_items`     | id, run_id, teacher_id, kind (fixed/percent/per_lesson/bonus/penalty/advance), amount, details (jsonb), note                                                                                     |
| `teacher_advances`  | id, teacher_id, amount, given_at, deducted_in_run_id                                                                                                                                             |
| `expenses`          | id, category, amount, date, note, file_id, created_by                                                                                                                                            |

### Tizim

| Jadval                                | Asosiy maydonlar                                                                                                                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `files`                               | id, s3_key, mime, size, sha256, uploaded_by, purpose                                                                                                                                                                                    |
| `notifications`                       | id, user_id, channel (telegram), template, payload (jsonb), status (queued/sent/failed/blocked), sent_at, error                                                                                                                         |
| `notification_prefs`                  | user_id, type, enabled                                                                                                                                                                                                                  |
| `announcements`                       | id, text, file_id, audience (jsonb), created_by, stats (jsonb)                                                                                                                                                                          |
| `support_tickets` / `ticket_messages` | ota-ona murojaatlari                                                                                                                                                                                                                    |
| `outbox_events`                       | id, type, payload, created_at, processed_at, attempts — T-005 qo'shadi: next_attempt_at, last_error, failed_at (dead-letter)                                                                                                            |
| `audit_logs`                          | id, actor_id, actor_role, action (`entity.verb`), entity, entity_id, before (jsonb), after (jsonb), ip, user_agent, request_id, at — **faqat INSERT**: `lg_app` DB rolida UPDATE/DELETE/TRUNCATE grant yo'q + trigger (migratsiya 0001) |
| `settings`                            | key, value (jsonb), updated_by                                                                                                                                                                                                          |
| `feature_flags`                       | key, enabled, rules (jsonb)                                                                                                                                                                                                             |

## Indekslar va cheklovlar (asosiylari)

- `attendance (lesson_id, student_id)` UNIQUE; `lessons (group_id, date)`.
- `ledger_entries (student_id, occurred_at)`.
- `payments (idempotency_key)` UNIQUE.
- `receipts (number)` UNIQUE, raqam `receipt_counters` orqali (BR-19).
- Jadval to'qnashuvi: `lessons` uchun ikkita exclusion constraint (btree_gist) — `(room_id WITH =, time_range WITH &&)` va `(teacher_id WITH =, time_range WITH &&)`, faqat `status <> 'cancelled'` qatorlar uchun.
- `students (code)` UNIQUE, sequence'dan.
- `users (phone)` UNIQUE, `users (telegram_id)` UNIQUE.

## Migratsiya qoidalari

1. Faqat oldinga (forward-only), har migratsiya **orqaga mos** (expand → migrate → contract): avval ustun qo'shiladi, kod ikkalasini qo'llab-quvvatlaydi, keyingi relizda eski olib tashlanadi.
2. Katta jadvalga indeks — `CONCURRENTLY`.
3. Har migratsiya CI'da toza DB'da va prod snapshot nusxasida (staging) sinovdan o'tadi.
