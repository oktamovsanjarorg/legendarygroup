# ADR 0002 — Ledger asosidagi billing

- **Holat:** Qabul qilingan · 2026-11-10

## Kontekst

To'lovlar, chegirmalar, jarimalar, storno, refund, avans — "balans" maydonini to'g'ridan-to'g'ri o'zgartirish
yillar davomida nomuvofiqlik va nizolarga olib keladi ("qayerdan bu summa?").

## Qaror

- O'quvchi balansi `ledger_entries` (faqat INSERT) yig'indisi. Har yozuv manbaga (`ref_table`, `ref_id`) bog'langan.
- Tuzatish — faqat teskari yozuv (storno). Hech narsa o'chirilmaydi.
- Tezlik uchun hisoblangan balans keshi bo'lishi mumkin, lekin har kuni ledger bilan solishtiriladi (farq bo'lsa alert).

## Oqibatlar

- (+) To'liq tarix, har tiyin izohlanadi, audit oson.
- (+) Har qanday sanadagi balansni qayta hisoblash mumkin.
- (−) So'rovlar biroz murakkab — `packages/domain` va repository qatlamida yashiriladi.
