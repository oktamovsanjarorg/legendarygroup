import type {
  AnnouncementPreviewResponse,
  GroupLeaderboardResponse,
  GroupListItem,
  GroupStudentCounts,
  ImportPreviewResponse,
  RoleCode,
  RosterResult,
  TestDetailResponse,
  TestItem,
} from '@lg/contracts';
import { vi } from 'vitest';
import { fixedClock } from './data/clock.js';

export const CLOCK = fixedClock('2026-11-16T10:00:00+05:00');

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

function authResponse(path: string): Response | null {
  if (path === '/auth/telegram') {
    return json(200, {
      next: 'done',
      accessToken: 't-teacher',
      user: { id: 'u1', fullName: 'Ali Valiyev', roles: ['teacher'], activeRole: 'teacher' },
    });
  }
  if (path === '/auth/me') {
    return json(200, {
      id: 'u1',
      fullName: 'Ali Valiyev',
      phone: '+998901112233',
      roles: ['teacher' as RoleCode],
      activeRole: 'teacher',
      permissions: ['test.manage'],
    });
  }
  return null;
}

function orgResponse(ctx: {
  path: string;
  group: GroupListItem;
  counts: GroupStudentCounts;
  roster: RosterResult;
  board: GroupLeaderboardResponse;
}): Response | null {
  if (ctx.path === '/groups') return json(200, [ctx.group]);
  if (ctx.path === '/groups/student-counts') return json(200, ctx.counts);
  if (ctx.path === '/groups/g1/students') return json(200, ctx.roster);
  if (ctx.path === '/grades/groups/g1/leaderboard') return json(200, ctx.board);
  return null;
}

function testListOrDetailResponse(ctx: {
  path: string;
  method: string;
  body: { title?: string; date?: string; maxScore?: number } | null;
  testsList: TestItem[];
}): Response | null {
  if (ctx.path === '/tests?groupId=g1') return json(200, ctx.testsList);
  if (ctx.path === '/tests' && ctx.method === 'POST') {
    const created: TestItem = {
      id: 't-new',
      branchId: 'b1',
      groupId: 'g1',
      title: ctx.body?.title ?? 'Yangi test',
      date: ctx.body?.date ?? '2026-11-16',
      maxScore: ctx.body?.maxScore ?? 100,
      sections: [],
      status: 'draft',
      publishedAt: null,
      createdBy: 'u1',
      createdAt: '2026-11-16T10:00:00.000Z',
      updatedAt: '2026-11-16T10:00:00.000Z',
    };
    ctx.testsList.push(created);
    return json(201, created);
  }
  if (ctx.path.startsWith('/tests/t-') && ctx.method === 'GET') {
    return json(200, {
      id: 't-new',
      branchId: 'b1',
      groupId: 'g1',
      title: 'Testlar 1',
      date: '2026-11-16',
      maxScore: 100,
      sections: [],
      status: 'draft',
      publishedAt: null,
      createdBy: 'u1',
      createdAt: '2026-11-16T10:00:00.000Z',
      updatedAt: '2026-11-16T10:00:00.000Z',
      results: [],
    } as TestDetailResponse);
  }
  return null;
}

function testImportActionsResponse(
  path: string,
  method: string,
  preview?: ImportPreviewResponse,
): Response | null {
  if (path.includes('/import-preview') && method === 'POST') {
    return json(200, preview ?? { matched: [], suggested: [], unmatched: [] });
  }
  if (path.includes('/import-confirm') && method === 'POST') {
    return json(200, { success: true });
  }
  return null;
}

function announceResponse(path: string, method: string): Response | null {
  if (path.includes('/announcements/preview')) {
    return json(200, {
      targetType: 'group',
      targetId: 'g1',
      recipientCount: 12,
      sampleRecipients: [],
    } as AnnouncementPreviewResponse);
  }
  if (path === '/announcements' && method === 'POST') {
    return json(201, { id: 'a1', success: true });
  }
  return null;
}

function buildMockOrgData(isAssistant?: boolean) {
  const mainTeacherId = isAssistant ? 'u2' : 'u1';
  const group: GroupListItem = {
    id: 'g1',
    name: 'IELTS B2',
    status: 'active',
    course: { id: 'c1', name: 'Ingliz tili' },
    room: { id: 'r1', name: '101-xona' },
    monthlyPrice: '650000',
    maxStudents: 15,
    startDate: '2026-01-01',
    endDate: null,
    mainTeacher: { id: mainTeacherId, fullName: 'Asosiy Ustoz' },
    slots: [],
  };

  const counts: GroupStudentCounts = { date: '2026-11-16', counts: { g1: 1 } };
  const roster: RosterResult = {
    date: '2026-11-16',
    capacity: 15,
    items: [
      {
        enrollmentId: 'e1',
        studentId: 's1',
        code: 101,
        fullName: 'Hasan Valiyev',
        state: 'active',
      },
    ],
  };

  const board: GroupLeaderboardResponse = {
    groupId: '00000000-0000-0000-0000-000000000001',
    groupName: 'IELTS B2',
    students: [
      {
        studentId: 's1',
        studentName: 'Hasan',
        studentCode: '101',
        rank: 1,
        attendanceRatePercent: 90,
        averageGrade: 5,
        averageTestScorePercent: 90,
        compositeScore: 90,
        totalLessons: 10,
        attendedLessons: 9,
      },
    ],
  };

  return { group, counts, roster, board };
}

export function setupApi(opts: {
  isAssistant?: boolean;
  tests?: TestItem[];
  preview?: ImportPreviewResponse;
}) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const org = buildMockOrgData(opts.isAssistant);
  const testsList: TestItem[] = [...(opts.tests ?? [])];

  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace('/api', '');
    const method = init?.method ?? 'GET';
    const body = init?.body
      ? (JSON.parse(String(init.body)) as { title?: string; date?: string; maxScore?: number })
      : null;
    calls.push({ method, path, body });

    return (
      authResponse(path) ??
      orgResponse({
        path,
        group: org.group,
        counts: org.counts,
        roster: org.roster,
        board: org.board,
      }) ??
      testListOrDetailResponse({ path, method, body, testsList }) ??
      testImportActionsResponse(path, method, opts.preview) ??
      announceResponse(path, method) ??
      json(404, { code: 'NOT_FOUND' })
    );
  });

  return calls;
}
