---
description: Backlog vazifasini (T-XXX) playbook bo'yicha boshidan oxirigacha bajarish
argument-hint: T-XXX
---

Vazifa: $ARGUMENTS

1. `CLAUDE.md` va `docs/12-ai-playbook.md` ni o'qi (allaqachon kontekstda bo'lsa — qayta o'qima).
2. `docs/09-tasks.md` dan $ARGUMENTS ni top: AC, "Aniqlik" qatorlari, "Bog'liq" vazifalar ✅ ekanini tekshir (UI bo'lsa T-009 va T-017c ham). Bog'liqlik tayyor bo'lmasa — qaysi biri ekanini aytib to'xta.
3. Tegishli `FR-*`/`BR-*`, `docs/02`, `docs/05`, `docs/10` (standart takliflar) va UI bo'lsa `docs/11` ni o'qi.
4. Vazifani 🟨 qil. Qisqa reja yoz (fayllar ≤ 300 qator, jadvallar, endpoint'lar, ruxsatlar, testlar) va darhol bajarishga o't — tasdiq kutma.
5. Playbook §1 tsikli: avval testlar → kod → `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int`.
6. Noaniqlik — playbook §2 zinapoyasi; savol berma, qarorni PR tavsifiga / ADR / `10-open-questions.md`ga yoz.
7. Playbook §6 ro'yxati bo'yicha o'zingni tekshir, hujjatlarni yangila, vazifani ✅ qil.
8. Yakunda: nima qilindi, testlar natijasi, qabul qilingan taxminlar, egasidan kerak bo'ladigan narsalar (agar bo'lsa). Commit/PR — faqat so'ralsa.
