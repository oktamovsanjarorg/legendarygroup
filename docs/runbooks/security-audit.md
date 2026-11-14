# Runbook: Xavfsizlik Auditi va Zaifliklarni Tekshirish (T-505)

Ushbu runbook platformaning xavfsizlik holatini davriy tekshirish, OWASP ZAP skanerini ishga tushirish va yangi zaifliklarni bartaraf etish tartibini belgilaydi.

---

## 1. Xavfsizlik skanerini ishga tushirish (OWASP ZAP)

Lokal yoki staging muhitida dinamik dasturiy xavfsizlik sinovini (DAST) o'tkazish:

```bash
# Mahalliy API va web marshrutlarni skanerlash
./scripts/zap-scan.sh http://localhost:3000

# Yoki staging domenini skanerlash
./scripts/zap-scan.sh https://staging.example.uz
```

Skanerlash natijalari `docs/security/reports/` katalogida HTML va Markdown formatida saqlanadi.

---

## 2. CI/CD Xavfsizlik Nazorati

Har bir Pull Request'da avtomatik tarzda:

1. **pnpm audit:** uchinchi tomon paketlaridagi ma'lum zaifliklar (CVE) tekshiriladi.
2. **ESLint xavfsizlik qoidalari:** nozik paketlar importi chegaralari (`eslint-plugin-boundaries`) buzilmasligi ta'minlanadi.
3. **RBAC coverage test:** barcha endpointlarda `@RequirePermission` yoki `@Public()` mavjudligi tekshiriladi (`T-008`).
4. **UX & FR coverage test:** barcha talablar tegishli ruxsatlar bilan himoyalanganligi kafolatlanadi.
