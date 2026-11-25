import type { Permission } from '@lg/contracts';
import { describe, expect, it } from 'vitest';
import type { RequestUser } from '../auth/index.js';
import type { AssistantDeps } from './assistant.deps.js';
import type { AssistantLlm, LlmReply, LlmRequest, LlmToolCall } from './assistant.llm.js';
import { AssistantService } from './assistant.service.js';
import { maskPhone } from './assistant.tools.js';

const user: RequestUser = { id: 'u1', role: 'admin', sessionId: null, pv: 1 };
const SID = '11111111-1111-4111-8111-111111111111';

const deps = {
  students: {
    list: async () => ({
      items: [
        {
          id: SID,
          code: 1042,
          fullName: 'Ali Valiyev',
          birthDate: null,
          phone: '+998901112233',
          archivedAt: null,
          groups: [{ id: 'g', name: 'Robototexnika 1' }],
          frozen: false,
          guardian: { fullName: 'Vali', phone: '+998901112233' },
        },
      ],
      nextCursor: null,
    }),
    detail: async () => {
      throw new Error('kerak emas');
    },
  },
  enrollments: { forStudent: async () => [] },
  billing: { getStudentLedgerSummary: async () => ({}) },
  dashboard: { getDirectorDashboardKpi: async () => ({}) },
  debtors: { getDebtors: async () => ({}) },
} as unknown as AssistantDeps;

const calls = (...c: LlmToolCall[]): LlmReply => ({ text: '', toolCalls: c, finish: 'tool_calls' });
const say = (text: string): LlmReply => ({ text, toolCalls: [], finish: 'stop' });
const call = (id: string, name: string, input: unknown): LlmToolCall => ({ id, name, input });

/** Ssenariy bo'yicha javob beradigan soxta model; so'rovlarni yozib boradi. */
function fakeLlm(script: LlmReply[]) {
  const seen: LlmRequest[] = [];
  const llm: AssistantLlm = {
    chat: async (p) => {
      seen.push(structuredClone(p));
      const next = script.shift();
      if (!next) throw new Error('ssenariy tugadi');
      return next;
    },
  };
  return { llm, seen };
}

const perms = (...p: Permission[]) => new Set<Permission>(p);

describe('AI yordamchi (Q-114)', () => {
  it('vosita → natija → javob; ekran tugmasi faqat ruxsat bilan', async () => {
    const { llm, seen } = fakeLlm([
      calls(call('t1', 'search_students', { query: 'Ali' })),
      calls(
        call('t2', 'open_screen', { screen: 'pay', student_id: SID }),
        call('t3', 'open_screen', { screen: 'finance' }),
      ),
      say('Ali Valiyev (1042) topildi.'),
    ]);
    const svc = new AssistantService(deps, llm);
    const r = await svc.chat(user, perms('student.view', 'payment.create'), {
      messages: [{ role: 'user', text: 'Ali Valiyevga toʻlov' }],
    });
    expect(r).toEqual({
      reply: 'Ali Valiyev (1042) topildi.',
      actions: [{ screen: 'pay', studentId: SID }],
    });
    // Har chaqiruvga o'z `tool` xabari (id bo'yicha); ruxsatsiz ekran — xato natija.
    const last = seen[2]?.messages.slice(-2);
    expect(last?.map((m) => (m.role === 'tool' ? m.toolCallId : m.role))).toEqual(['t2', 't3']);
    expect(JSON.stringify(last?.[1])).toContain('error');
    // Telefon modelga ketmaydi (birinchi natijada telefon maydoni yo'q).
    expect(JSON.stringify(seen[1]?.messages)).not.toContain('+998901112233');
    expect(seen[0]?.tools.map((t) => t.name)).toContain('open_screen');
  });

  it('kalit yoʻq — 503 ASSISTANT_DISABLED', async () => {
    const svc = new AssistantService(deps, null);
    expect(svc.enabled).toBe(false);
    await expect(
      svc.chat(user, perms(), { messages: [{ role: 'user', text: 'salom' }] }),
    ).rejects.toMatchObject({ code: 'ASSISTANT_DISABLED' });
  });

  it('rad etish (refusal) — 422; cheksiz sikl yoʻq — 6 qadamda toʻxtaydi', async () => {
    const refused = new AssistantService(
      deps,
      fakeLlm([{ text: '', toolCalls: [], finish: 'refused' }]).llm,
    );
    await expect(
      refused.chat(user, perms(), { messages: [{ role: 'user', text: 'x' }] }),
    ).rejects.toMatchObject({ code: 'ASSISTANT_REFUSED' });
    const loop = Array.from({ length: 6 }, () => calls(call('t', 'today_summary', {})));
    const looping = new AssistantService(deps, fakeLlm(loop).llm);
    await expect(
      looping.chat(user, perms(), { messages: [{ role: 'user', text: 'x' }] }),
    ).rejects.toMatchObject({ code: 'ASSISTANT_TOO_COMPLEX' });
  });

  it('notoʻgʻri kirish va nomaʼlum vosita — xato natija, ilova yiqilmaydi', async () => {
    const { llm, seen } = fakeLlm([
      calls(call('a', 'search_students', { query: 'x' }), call('b', 'delete_all', {})),
      say('ok'),
    ]);
    const r = await new AssistantService(deps, llm).chat(user, perms('student.view'), {
      messages: [{ role: 'user', text: 'x' }],
    });
    expect(r.reply).toBe('ok');
    const results = JSON.stringify(seen[1]?.messages.slice(-2));
    expect(results).toContain('Notoʻgʻri kirish');
    expect(results).toContain('Nomaʼlum vosita');
  });

  it('telefon maskalanadi', () => {
    expect(maskPhone('+998 90 111 22 33')).toBe('***2233');
    expect(maskPhone(null)).toBeNull();
  });
});
