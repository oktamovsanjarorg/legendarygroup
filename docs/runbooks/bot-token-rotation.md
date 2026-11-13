# Runbook: Telegram Bot Tokenini Almashtirish (T-506)

Ushbu runbook Telegram bot tokeni sizib chiqqanda (compromise) yoki rejali almashtirish (rotation) vaqtida uzilishsiz yangilash tartibini belgilaydi.

---

## 1. Qachon almashtiriladi?

- Bot tokeni tasodifan git repozitoriyga, loglarga yoki begona shaxslarga tushib qolganda (favqulodda).
- Xavfsizlik siyosati bo'yicha rejali (har 90 yoki 180 kunda).
- Bot boshqaruvchisi o'zgarganda.

---

## 2. Almashtirish qadamlari

### 1-qadam: BotFather orqali yangi token olish

1. Telegramda [@BotFather](https://t.me/BotFather) botini oching.
2. `/mybots` buyrug'ini yuboring va Legendary Group botini tanlang.
3. **API Token** bo'limiga kiring.
4. **Revoke current token** tugmasini bosing. Yangi token darhol ekranda chiqadi (nusxalab oling).

### 2-qadam: Server konfiguratsiyasini yangilash

Serverda `/etc/lg/prod.env` faylidagi qiymatni yangilang:

```bash
sudo sed -i 's/^TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN="YANGI_TOKEN"/' /etc/lg/prod.env
```

_(AWS SSM Parameter Store ishlatilsa: `aws ssm put-parameter --name "/lg/prod/TELEGRAM_BOT_TOKEN" --value "YANGI_TOKEN" --type "SecureString" --overwrite`)_

### 3-qadam: Bot servisini qayta ishga tushirish

Faqat bot servisini rolling usulida yangilang:

```bash
docker compose --env-file /etc/lg/prod.env -f compose.prod.yml up -d --no-deps bot
```

### 4-qadam: Tekshirish (Verification)

1. Bot loglarini ko'ring:
   ```bash
   docker compose --env-file /etc/lg/prod.env -f compose.prod.yml logs --tail 30 bot
   ```
2. Telegramda botga `/start` va `/help` yuborib ko'ring.
3. Menyu tugmasi (Mini App) to'g'ri ochilayotganini tekshiring.
