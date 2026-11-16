import { siteMessages as s, webMessages } from '@lg/i18n';
import type { SiteTexts } from './site.js';

/** Build paytida (Astro frontmatter) — client'ga JSON sifatida beriladi. */
export const SITE_TEXTS: SiteTexts = {
  duration: webMessages.landing.coursesSection.duration,
  lessonMinutes: s.lessonMinutes,
  nameRequired: s.nameRequired,
  phoneInvalid: s.phoneInvalid,
};
