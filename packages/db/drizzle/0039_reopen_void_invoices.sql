-- Q-96 xatosi: bekor (void) hisobga keyin yozilgan qator to'lovga ko'rinmasdi.
-- Summasi bor hisob bekor bo'la olmaydi; holat keyingi pul amalida qayta hisoblanadi.
UPDATE "invoices" SET "status" = 'open', "updated_at" = now() WHERE "status" = 'void' AND "total" > 0;
