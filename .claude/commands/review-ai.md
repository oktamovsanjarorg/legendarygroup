---
description: Boshqa AI (Gemini va h.k.) yozgan kodni hujjatlarga moslik va sifat bo'yicha tekshirib tuzatish
argument-hint: "[fayl/papka yoki bo'sh — joriy diff]"
---

Tekshiriladigan joy: $ARGUMENTS (bo'sh bo'lsa — `git status` va `git diff` dagi o'zgarishlar).

1. `CLAUDE.md` va `docs/12-ai-playbook.md` (§6, §7) ni o'qi.
2. Kod qaysi vazifaga tegishli ekanini aniqla (`docs/09-tasks.md`) va uning AC, FR/BR, `docs/02` matritsasi, `docs/05` jadvallari bilan solishtir.
3. Barcha fayllarni to'liq o'qi. Avval `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int` ishlat — haqiqiy holatni bil.
4. Topilmalarni og'irligi bo'yicha tartibla: hujjatga zidlik → xavfsizlik/ma'lumot yaxlitligi → idempotentlik → ishlash tezligi → tuzilish/hajm.
5. Tuzat. Har tuzatish test bilan tasdiqlansin (xato uchun avval qizil test).
6. Yangi turdagi xato topilsa — `docs/12-ai-playbook.md` §7 jadvaliga qator qo'sh.
7. Yakunda: topilmalar ro'yxati (fayl:qator, nima edi → nima bo'ldi), testlar natijasi.
