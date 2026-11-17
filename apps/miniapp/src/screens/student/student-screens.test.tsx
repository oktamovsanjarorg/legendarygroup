import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudentProfileView } from './profile.js';
import { StudentResultsView } from './results.js';
import { StudentTodayView } from './today.js';

afterEach(cleanup);

const wrap = (wa: FakeWebApp, ui: ReactNode) =>
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);

const mockLesson = {
  id: 'l1',
  group: { id: 'g1', name: 'IELTS 7.0 (A)' },
  date: '2026-11-18',
  startTime: '14:00',
  endTime: '15:30',
  room: { id: 'r1', name: '101-xona' },
  teacher: { id: 'u1', name: 'Rustam Karimov' },
  isSubstitute: false,
  roomOverridden: false,
  status: 'done' as const,
  kind: 'regular' as const,
  cancelReason: null,
  cancelSource: null,
  compensation: null,
  makeupLessonId: null,
  makeupForLessonId: null,
  topic: null,
};

describe('M-STU-01 Oʻquvchi Bugun ekrani (T-126)', () => {
  it('bugungi darslar va davomat holatini toʻgʻri koʻrsatadi', () => {
    const wa = createFakeWebApp();
    wrap(
      wa,
      <StudentTodayView
        studentName="Anvar Aliyev"
        todayStatus={{ kind: 'present' }}
        todayLessons={[mockLesson]}
      />,
    );

    expect(screen.getByText(/Anvar Aliyev/)).toBeDefined();
    expect(screen.getByText('Bugun darsda')).toBeDefined();
    expect(screen.getByText('IELTS 7.0 (A)')).toBeDefined();
    expect(screen.getByText(/101-xona/)).toBeDefined();
  });

  it('kutilayotgan dars vaqti Toshkent boʻyicha (UTC emas)', () => {
    const wa = createFakeWebApp();
    wrap(
      wa,
      <StudentTodayView
        studentName="Anvar Aliyev"
        todayStatus={{ kind: 'pending', at: new Date('2026-11-18T14:00:00+05:00') }}
        todayLessons={[mockLesson]}
      />,
    );
    expect(screen.getByText(/14:00 da/)).toBeDefined();
  });

  it('bugun dars boʻlmaganda boʻsh holat va keyingi darsni koʻrsatadi', () => {
    const wa = createFakeWebApp();
    wrap(
      wa,
      <StudentTodayView
        studentName="Anvar Aliyev"
        todayStatus={{ kind: 'none' }}
        todayLessons={[]}
        nextLesson={{
          ...mockLesson,
          id: 'l2',
          date: '2026-11-20',
          status: 'scheduled',
        }}
      />,
    );

    expect(screen.getByText('Bugun darsingiz yoʻq')).toBeDefined();
    expect(screen.getByText('IELTS 7.0 (A)')).toBeDefined();
  });
});

describe('M-STU-03 Oʻquvchi Natijalar ekrani (T-126)', () => {
  it('test natijalari va reytingni koʻrsatadi', () => {
    const wa = createFakeWebApp();
    wrap(
      wa,
      <StudentResultsView
        tests={[]}
        progress={{
          studentId: 's1',
          studentName: 'Anvar Aliyev',
          groupId: 'g1',
          groupName: 'IELTS 7.0',
          rank: 2,
          totalStudents: 15,
          averageGrade: 85,
          attendanceRatePercent: 90,
          averageTestScorePercent: 85,
          compositeScore: 88,
          gradesTrend: [{ lessonId: 'l1', date: '2026-11-01', kind: 'grade', value: 85 }],
          attendanceTrend: [],
          testResults: [
            {
              testId: 't1',
              title: 'Mock Exam #1',
              date: '2026-11-10',
              score: 85,
              maxScore: 100,
              percent: 85,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Natijalarim')).toBeDefined();
    expect(screen.getByText(/2-oʻrin/)).toBeDefined();
    expect(screen.getByText('Mock Exam #1')).toBeDefined();
    expect(screen.getByText('85%')).toBeDefined();
  });

  it('testlar boʻlmaganda boʻsh holatni koʻrsatadi', () => {
    const wa = createFakeWebApp();
    wrap(wa, <StudentResultsView tests={[]} progress={null} />);

    expect(screen.getByText('Natijalar hali mavjud emas')).toBeDefined();
  });
});

describe('M-STU-04 Oʻquvchi Profil ekrani (T-126)', () => {
  it('oʻquvchi maʼlumotlari, guruhlari va sozlamalar tugmasi ishlaydi', () => {
    const wa = createFakeWebApp();
    const onSettings = vi.fn();
    wrap(
      wa,
      <StudentProfileView
        student={{
          id: 's1',
          code: 1042,
          fullName: 'Anvar Aliyev',
          birthDate: null,
          phone: '+998901112233',
          archivedAt: null,
          groups: [{ id: 'g1', name: 'IELTS 7.0 (A)' }],
          frozen: false,
          guardian: null,
        }}
        onSettings={onSettings}
      />,
    );

    expect(screen.getByText('Anvar Aliyev')).toBeDefined();
    expect(screen.getByText('+998901112233')).toBeDefined();
    expect(screen.getByText('ID: #1042')).toBeDefined();
    expect(screen.getByText('IELTS 7.0 (A)')).toBeDefined();

    fireEvent.click(screen.getByText('Sozlamalar'));
    expect(onSettings).toHaveBeenCalledTimes(1);
  });
});
