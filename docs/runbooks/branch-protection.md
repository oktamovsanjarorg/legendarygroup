# Branch Protection Qoidalari (`main`)

> Ushbu hujjat Legendary Group omboridagi `main` tarmog'ini himoya qilish qoidalarini belgilaydi.
> Talablar: [06-infrastructure.md](../06-infrastructure.md) §4 va [07-quality-security.md](../07-quality-security.md).

---

## 1. Asosiy maqsad

`main` tarmog'i har doim ishlab turgan, barcha testlardan o'tgan va xavfsiz holatda bo'lishi shart. To'g'ridan-to'g'ri `git push origin main` qat'iyan taqiqlanadi.

---

## 2. GitHub Branch Protection sozlamalari

GitHub repository sozlamalarida (`Settings` -> `Branches` -> `Branch protection rules`) `main` uchun quyidagi qoidalar o'rnatiladi:

1. **Require a pull request before merging:**
   - Har qanday o'zgarish alohida `feat/*`, `fix/*`, `chore/*` tarmog'ida ochilib, Pull Request (PR) orqali kiritiladi.
   - Kamida 1 ta tasdiq (review approval: inson yoki boshqa AI agent).
   - Yangi commit qo'shilganda eski approvallar bekor bo'lishi (`Dismiss stale pull request approvals when new commits are pushed`).

2. **Require status checks to pass before merging (Status checks):**
   - Barcha CI tekshiruvlari yashil bo'lishi shart (`Strict: Require branches to be up to date before merging`):
     - `Lint, Typecheck & Unit Tests`
     - `Integration Tests`
     - `Docker Build Check`

3. **Require linear history:**
   - Git tarixi chiziqli bo'lishi kerak (`Squash and merge` yoki `Rebase and merge`).
   - Merge commitlar orqali tarmoqlanishlarga yo'l qo'yilmaydi.

4. **Require conversation resolution:**
   - PR dagi barcha muhokamalar va AI review izohlari to'liq yopilmaguncha (resolved) merge qilish mumkin emas.

5. **Do not allow bypassing the above settings:**
   - Hech kimga (shu jumladan administratorlarga ham) ushbu qoidalarni chetlab o'tishga ruxsat berilmaydi (`Include administrators`).

---

## 3. Favqulodda holatlar (Break-glass)

Insident paytida (masalan, production blocker) o'zgarishlar faqat quyidagi tartibda kiritiladi:

1. `fix/hotfix-*` tarmog'i ochiladi;
2. Minimal tuzatish kiritiladi va avval muammoni ko'rsatuvchi test yoziladi;
3. PR ochilib, CI tekshiruvlari yashil bo'lgach tezkor merge qilinadi.
