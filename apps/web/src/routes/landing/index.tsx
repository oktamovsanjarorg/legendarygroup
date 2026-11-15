import type { PublicCourse, PublicSettings } from '@lg/contracts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../../api/client.js';
import type { LandingCourseItem } from '../../screens/f3/types.js';
import { LandingView, type LeadInput } from '../../screens/f3/w35-landing.js';

export const toLandingCourse = (c: PublicCourse): LandingCourseItem => ({
  id: c.id,
  title: c.name,
  description: c.description,
  durationMonths: c.durationMonths,
  pricePerMonth: BigInt(c.defaultMonthlyPrice),
});

/** `PublicLeadRequest`: body — obyekt (client o'zi JSON qiladi), kurs — `courseId`. */
export const leadBody = (v: LeadInput) => ({
  fullName: v.name,
  phone: v.phone,
  courseId: v.courseId || null,
  comment: v.comment?.trim() || null,
});

/** W-35 Landing (FR-SYS-4, T-503): faol kurslar va markaz kontaktlari — API'dan. */
export function LandingPage() {
  const navigate = useNavigate();
  const courses = useQuery({
    queryKey: ['public', 'courses'],
    queryFn: () => api.request<PublicCourse[]>('/public/courses'),
  });
  const settings = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => api.request<PublicSettings>('/settings/public'),
  });
  const c = settings.data?.centerInfo;
  return (
    <LandingView
      courses={(courses.data ?? []).map(toLandingCourse)}
      center={c ? { name: c.name, phone: c.phone, address: c.address } : null}
      onSubmitLead={async (v) => {
        await api.request('/public/leads', { method: 'POST', body: leadBody(v) });
      }}
      onLoginClick={() => void navigate({ to: '/login' })}
    />
  );
}
