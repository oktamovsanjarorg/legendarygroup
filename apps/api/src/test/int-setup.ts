import { Logger } from '@nestjs/common';
import { loadRootEnv } from '@lg/db';

// Integratsiya testlari: lokalda ildiz `.env` (DB/Redis manzili), CI'da — muhit o'zgaruvchilari.
loadRootEnv();
// Kutilgan xatolar (500 testlari) logni to'ldirmasin.
Logger.overrideLogger(false);
