import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { MOCK_LANDING_COURSES } from '../../screens/f3/mock-analytics.js';
import { LandingView, type LeadInput } from '../../screens/f3/w35-landing.js';

/** W-35 Landing (FR-SYS-4, T-503): Kurslar, afzalliklar va lid qabul qilish formasi. */
export function LandingPage() {
  const navigate = useNavigate();
  const [courses] = useState(MOCK_LANDING_COURSES);

  const handleSubmitLead = async (input: LeadInput) => {
    await api.request('/public/leads', {
      method: 'POST',
      body: JSON.stringify({
        fullName: input.name,
        phone: input.phone,
        source: 'landing',
        preferredCourseId: input.courseId || undefined,
      }),
    });
  };

  const handleLoginClick = () => {
    void navigate({ to: '/login' });
  };

  return (
    <LandingView
      courses={courses}
      onSubmitLead={handleSubmitLead}
      onLoginClick={handleLoginClick}
    />
  );
}
