import { Logger } from '@nestjs/common';

// Unit testlar `.env`ga va tashqi servislarga bog'liq emas; kutilgan xato loglari o'chirilgan.
Logger.overrideLogger(false);
