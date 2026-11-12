# Legendary Group — O'quv markaz boshqaruv tizimi

> Holat: **F0 — Poydevor** (T-001, T-002, T-003 tayyor). Joriy holat — [09-tasks.md](09-tasks.md).
> Bu papkadagi hujjatlar — loyihaning yagona haqiqat manbai (single source of truth).
> Har qanday kod shu hujjatlarga mos yozilishi shart. Qoida o'zgarsa — avval hujjat, keyin kod.

## Hujjatlar xaritasi

| #   | Fayl                                               | Mazmuni                                                                           |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| 00  | [00-vision.md](00-vision.md)                       | Maqsad, doira (scope), rollar, muvaffaqiyat mezonlari                             |
| 01  | [01-requirements.md](01-requirements.md)           | Funksional talablar — modullar bo'yicha                                           |
| 02  | [02-roles-permissions.md](02-roles-permissions.md) | RBAC + scope + policy, ruxsatlar katalogi, tasdiqlash so'rovlari                  |
| 03  | [03-architecture.md](03-architecture.md)           | Texnologiyalar steki, arxitektura, monorepo tuzilishi                             |
| 04  | [04-business-rules.md](04-business-rules.md)       | To'lov, jarima, oylik, davomat, chek tasdiqlash qoidalari                         |
| 05  | [05-data-model.md](05-data-model.md)               | Ma'lumotlar modeli (jadvallar, bog'lanishlar)                                     |
| 06  | [06-infrastructure.md](06-infrastructure.md)       | AWS, muhitlar, konteynerlar, CI/CD, backup, monitoring                            |
| 07  | [07-quality-security.md](07-quality-security.md)   | Testlar, kod standartlari, xavfsizlik                                             |
| 08  | [08-roadmap.md](08-roadmap.md)                     | Bosqichlar (fazalar) va milestone'lar                                             |
| 09  | [09-tasks.md](09-tasks.md)                         | Aniq vazifalar ro'yxati (ID, bog'liqlik, qabul mezonlari)                         |
| 10  | [10-open-questions.md](10-open-questions.md)       | Hali tasdiqlanmagan savollar                                                      |
| 11  | [11-ux.md](11-ux.md)                               | UI/UX printsiplari, kanallar chegarasi, ekranlar xaritasi, o'lchanadigan mezonlar |
| —   | [ux/design-system.md](ux/design-system.md)         | Tokenlar (kod: ui-core), komponentlar katalogi, ikonlar, bot shablonlari          |
| —   | [ux/screens.md](ux/screens.md)                     | Ekranlar xaritasi (ID), FR qamrovi, oqimlar, deep link'lar                        |
| 12  | [12-ai-playbook.md](12-ai-playbook.md)             | AI agent ish tartibi: prompt shablonlari, kod tuzilishi, qaror qoidalari          |
| 13  | [13-antigravity.md](13-antigravity.md)             | Antigravity (agy) uchun parallel vazifalar: ishga tushirish, qoidalar, A-1…A-4    |
| —   | [../CLAUDE.md](../CLAUDE.md)                       | Kod yozuvchi AI agentlar uchun qat'iy qoidalar                                    |
| —   | [adr/](adr/)                                       | Arxitektura qarorlari jurnali (ADR)                                               |

## Qisqacha

- **Repo:** `git@github.com:oktamovsanjarorg/legendarygroup.git` — **yagona monorepo** (barcha ilovalar, paketlar, infra va hujjatlar shu yerda). Asosiy branch: `main`.
- **Mijozlar:** Telegram bot + Telegram Mini App (Ota-ona, Ustoz), Web panel (Director, Admin). Ustoz — faqat Mini App.
- **Til:** faqat o'zbek (lotin).
- **Hajm:** 1 filial (lekin kod `branch_id` bilan kengaytirishga tayyor).
- **Stek:** TypeScript end-to-end · NestJS · PostgreSQL · Redis/BullMQ · grammY · React (Vite) · Docker · AWS · GitHub Actions.
