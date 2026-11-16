import type { PublicCourse, PublicSettings } from '@lg/contracts';
import { formatPhone } from '@lg/i18n';
import { checkLead, type SiteTexts, toCourseCard } from '../lib/site.js';

// Apex'da `/api/public/*` va `/api/settings/public` Caddy orqali API'ga — bir xil origin, CORS yo'q.
const getJson = async <T>(path: string): Promise<T> => {
  const res = await fetch(path, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
};

const $ = <T extends Element>(sel: string): T | null => document.querySelector<T>(sel);

function renderCourses(courses: PublicCourse[], t: SiteTexts) {
  const list = $<HTMLUListElement>('#courses');
  const tpl = $<HTMLTemplateElement>('#course-tpl');
  const select = $<HTMLSelectElement>('#lead select[name="courseId"]');
  const status = $<HTMLElement>('#courses-status');
  if (!list || !tpl || !status) return;
  if (courses.length === 0) {
    status.textContent = status.dataset['empty'] ?? '';
    return;
  }
  status.hidden = true;
  for (const c of courses.map((x) => toCourseCard(x, t))) {
    const node = tpl.content.cloneNode(true);
    if (!(node instanceof DocumentFragment)) continue;
    const set = (f: string, v: string) => {
      const el = node.querySelector(`[data-f="${f}"]`);
      if (el) el.textContent = v;
    };
    set('name', c.name);
    set('description', c.description ?? '');
    set('meta', c.meta.join(' · '));
    set('price', c.price);
    node.querySelector('[data-f="enroll"]')?.addEventListener('click', () => {
      if (select) select.value = c.id;
    });
    list.append(node);
    select?.append(new Option(c.name, c.id));
  }
}

function renderContacts(p: PublicSettings) {
  const phone = $<HTMLAnchorElement>('#c-phone');
  const bot = $<HTMLAnchorElement>('#c-bot');
  const address = $<HTMLElement>('#c-address');
  const { name, phone: tel, address: addr } = p.centerInfo;
  if (phone) Object.assign(phone, { textContent: formatPhone(tel), href: `tel:${tel}` });
  if (bot) Object.assign(bot, { textContent: p.botUrl.replace('https://', ''), href: p.botUrl });
  if (address) address.textContent = addr;
  // schema.org: kontaktlar sozlamalardan (W-29) — Google JS'ni bajarib o'qiydi.
  const ld = $<HTMLScriptElement>('#ld');
  if (ld?.textContent) {
    const data: Record<string, unknown> = JSON.parse(ld.textContent);
    ld.textContent = JSON.stringify({
      ...data,
      name,
      telephone: tel,
      address: addr,
      sameAs: [p.botUrl],
    });
  }
}

function initLeadForm(t: SiteTexts) {
  const form = $<HTMLFormElement>('#lead');
  const err = $<HTMLElement>('#lead-error');
  const ok = $<HTMLElement>('#lead-ok');
  const msg = $<HTMLTemplateElement>('#lead-texts')?.dataset ?? {};
  const button = form?.querySelector('button');
  if (!form || !err || !ok || !button) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (k: string) => String(new FormData(form).get(k) ?? '');
    const check = checkLead(
      {
        fullName: v('fullName'),
        phone: v('phone'),
        courseId: v('courseId'),
        comment: v('comment'),
        website: v('website'),
      },
      t,
    );
    const fail = (text: string) =>
      Object.assign(err, {
        textContent: text,
        hidden: false,
        className: err.className.replace('hidden', ''),
      });
    if (!check.ok) {
      fail(check.error);
      form.querySelector<HTMLInputElement>(`[name="${check.field}"]`)?.focus();
      return;
    }
    Object.assign(button, { disabled: true, textContent: msg['sending'] ?? '' });
    try {
      const res = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(check.body),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.hidden = true;
      ok.classList.remove('hidden');
    } catch {
      fail(msg['error'] ?? '');
      Object.assign(button, { disabled: false, textContent: msg['submit'] ?? '' });
    }
  });
}

export function init() {
  const raw = $<HTMLFormElement>('#lead')?.dataset['texts'];
  if (!raw) return;
  const t: SiteTexts = JSON.parse(raw);
  initLeadForm(t);
  getJson<PublicCourse[]>('/api/public/courses')
    .then((c) => renderCourses(c, t))
    .catch(() => {
      const status = $<HTMLElement>('#courses-status');
      if (status) status.textContent = status.dataset['error'] ?? '';
    });
  getJson<PublicSettings>('/api/settings/public')
    .then(renderContacts)
    .catch(() => undefined);
}
