import { formatMoney, webMessages as t } from '@lg/i18n';
import { Badge, Button, Card } from '@lg/ui-web';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  GraduationCap,
  LogIn,
  Phone,
  Users,
} from 'lucide-react';
import type { LandingCourseItem } from './types.js';
import { LeadForm, type LeadInput } from './w35-lead-form.js';

export type { LeadInput };

const L = t.landing;
/** Havola tugma ko'rinishida (ichma-ich interaktiv element yo'q — a11y). */
const linkBtn =
  'inline-flex h-11 items-center justify-center gap-2 rounded-md px-6 text-sm font-semibold transition-colors';

function SiteHeader({ onLoginClick }: { onLoginClick?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/90 px-6 py-3.5 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-text">
          LG
        </div>
        <div>
          <p className="text-base font-bold leading-none text-text">{L.brand}</p>
          <span className="text-[10px] text-text-muted">{L.tagline}</span>
        </div>
      </div>
      <nav className="hidden items-center gap-6 text-sm font-medium text-text-muted md:flex">
        <a href="#courses" className="hover:text-text">
          {L.menu.courses}
        </a>
        <a href="#advantages" className="hover:text-text">
          {L.menu.advantages}
        </a>
        <a href="#enroll" className="hover:text-text">
          {L.menu.contact}
        </a>
      </nav>
      <Button variant="secondary" onClick={onLoginClick}>
        <LogIn className="size-4" aria-hidden />
        {L.menu.login}
      </Button>
    </header>
  );
}

const STATS: { icon: LucideIcon; value: string; label: string; tone: string }[] = [
  { icon: Users, value: L.stats.studentsCount, label: L.stats.studentsLabel, tone: 'text-primary' },
  { icon: Award, value: L.stats.resultsRate, label: L.stats.resultsLabel, tone: 'text-success' },
  {
    icon: GraduationCap,
    value: L.stats.teachersCount,
    label: L.stats.teachersLabel,
    tone: 'text-primary',
  },
  { icon: Calendar, value: L.stats.yearsCount, label: L.stats.yearsLabel, tone: 'text-text' },
];

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 text-center">
      <Badge tone="info" className="mb-4 px-3 py-1 text-xs">
        {L.hero.badge}
      </Badge>
      <h1 className="text-3xl font-extrabold tracking-tight text-text md:text-5xl">
        {L.hero.title}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base text-text-muted">{L.hero.description}</p>
      <div className="mt-8 flex justify-center gap-4">
        <a href="#enroll" className={`${linkBtn} bg-primary text-primary-text hover:opacity-90`}>
          {L.hero.cta}
          <ArrowRight className="size-4" aria-hidden />
        </a>
        <a href="#courses" className={`${linkBtn} bg-surface text-text hover:bg-surface-alt`}>
          {L.hero.viewCourses}
        </a>
      </div>
      <div className="mt-14 grid grid-cols-2 gap-4 border-y border-border py-8 text-left md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label}>
            <div className={`flex items-center gap-2 font-semibold ${s.tone}`}>
              <s.icon className="size-4" aria-hidden />
              <span className="text-2xl font-bold">{s.value}</span>
            </div>
            <p className="mt-1 text-xs text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CourseCard({ c }: { c: LandingCourseItem }) {
  return (
    <Card className="relative flex flex-col justify-between p-6">
      {c.popular && (
        <Badge tone="warning" className="absolute right-4 top-4">
          {L.coursesSection.popular}
        </Badge>
      )}
      <div>
        <h3 className="text-lg font-bold text-text">{c.title}</h3>
        <p className="mt-2 text-sm text-text-muted">{c.description}</p>
      </div>
      <div className="mt-6 flex items-baseline justify-between border-t border-border pt-4">
        <div>
          <span className="block text-xs text-text-muted">
            {L.coursesSection.duration.replace('{months}', String(c.durationMonths))}
          </span>
          <span className="text-xl font-bold text-text">{formatMoney(c.pricePerMonth)}</span>
          <span className="text-xs text-text-muted"> / {L.coursesSection.pricePerMonth}</span>
        </div>
        <a href="#enroll" className="text-sm font-semibold text-link hover:underline">
          {L.coursesSection.enroll}
        </a>
      </div>
    </Card>
  );
}

function Courses({ courses }: { courses: readonly LandingCourseItem[] }) {
  return (
    <section id="courses" className="bg-surface-alt/40 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-text">{L.coursesSection.title}</h2>
          <p className="mt-1 text-sm text-text-muted">{L.coursesSection.subtitle}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {courses.map((c) => (
            <CourseCard key={c.id} c={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

const ADVANTAGES: { icon: LucideIcon; title: string; desc: string; tone: string }[] = [
  {
    icon: BookOpen,
    title: L.advantagesSection.item1Title,
    desc: L.advantagesSection.item1Desc,
    tone: 'bg-primary/10 text-primary',
  },
  {
    icon: Users,
    title: L.advantagesSection.item2Title,
    desc: L.advantagesSection.item2Desc,
    tone: 'bg-success-bg text-success',
  },
  {
    icon: Award,
    title: L.advantagesSection.item3Title,
    desc: L.advantagesSection.item3Desc,
    tone: 'bg-warning-bg text-warning',
  },
];

function Advantages() {
  return (
    <section id="advantages" className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-text">{L.advantagesSection.title}</h2>
          <p className="mt-1 text-sm text-text-muted">{L.advantagesSection.subtitle}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {ADVANTAGES.map((a) => (
            <Card key={a.title} className="p-6">
              <div className={`mb-4 flex size-10 items-center justify-center rounded-lg ${a.tone}`}>
                <a.icon className="size-5" aria-hidden />
              </div>
              <h3 className="font-semibold text-text">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{a.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg px-6 py-8 text-xs text-text-muted">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
        <div>
          <p className="font-semibold text-text">{L.brand}</p>
          <p className="mt-1">{L.footer.address}</p>
          <p className="mt-0.5 flex items-center gap-1.5">
            <Phone className="size-3" aria-hidden />
            {L.footer.phone}
          </p>
        </div>
        <p>
          © 2026 {L.brand}. {L.footer.rights}
        </p>
      </div>
    </footer>
  );
}

interface Props {
  courses: readonly LandingCourseItem[];
  onSubmitLead?: (data: LeadInput) => void;
  onLoginClick?: () => void;
}

/** W-35 Landing (FR-SYS-4): ommaviy sayt — kurslar va lid formasi (WebFrame'siz). */
export function LandingView({ courses, onSubmitLead, onLoginClick }: Props) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <SiteHeader onLoginClick={onLoginClick} />
      <main>
        <Hero />
        <Courses courses={courses} />
        <Advantages />
        <LeadForm courses={courses} onSubmitLead={onSubmitLead} />
      </main>
      <SiteFooter />
    </div>
  );
}
