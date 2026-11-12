-- Yagona filial (05 konvensiyasi, T-102). ID — `@lg/contracts` `DEFAULT_BRANCH_ID`;
-- biznes jadvallarning `branch_id` standarti shu qatorga ishora qiladi. Qayta ishga tushirishga xavfsiz.
INSERT INTO "branches" ("id", "name")
VALUES ('01900000-0000-7000-8000-000000000001', 'Legendary Group')
ON CONFLICT ("id") DO NOTHING;
