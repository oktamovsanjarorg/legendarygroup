import type { Permission } from '@lg/contracts';
import { describe, expect, it } from 'vitest';
import type { RequestUser } from '../auth/index.js';
import type { AssistantDeps } from './assistant.deps.js';
import type { AssistantLlm, LlmMessage, LlmParams } from './assistant.llm.js';
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

const msg = (stop: string, content: unknown[]): LlmMessage =>
  ({
    id: 'm',
    type: 'message',
    role: 'assistant',
    model: 'x',
    content,
    stop_reason: stop,
  }) as LlmMessage;

/** Ssenariy bo'yicha javob beradigan soxta model; so'rovlarni yozib boradi. */
function fakeLlm(script: LlmMessage[]) {
  const seen: LlmParams[] = [];
  const llm: AssistantLlm = {
    create: async (p) => {
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
      msg('tool_use', [
        { type: 'tool_use', id: 't1', name: 'search_students', input: { query: 'Ali' } },
      ]),
      msg('tool_use', [
        {
          type: 'tool_use',
          id: 't2',
          name: 'open_screen',
          input: { screen: 'pay', student_id: SID },
        },
        { type: 'tool_use', id: 't3', name: 'open_screen', input: { screen: 'finance' } },
      ]),
      msg('end_turn', [{ type: 'text', text: 'Ali Valiyev (1042) topildi.' }]),
    ]);
    const svc = new AssistantService(deps, llm);
    const r = await svc.chat(user, perms('student.view', 'payment.create'), {
      messages: [{ role: 'user', text: 'Ali Valiyevga toʻlov' }],
    });
    expect(r).toEqual({
      reply: 'Ali Valiyev (1042) topildi.',
      actions: [{ screen: 'pay', studentId: SID }],
    });
    // Parallel natijalar bitta xabarda; ruxsatsiz ekran — xato natija.
    const third = seen[2]?.messages.at(-1);
    expect(third?.role).toBe('user');
    expect(JSON.stringify(third?.content)).toContain('"is_error":true');
    // Telefon modelga ketmaydi (birinchi natijada telefon maydoni yo'q).
    expect(JSON.stringify(seen[1]?.messages)).not.toContain('+998901112233');
    expect(seen[0]?.model).toBe('claude-opus-5-5');
    expect(seen[0]?.fallbacks).toBe('default');
  });

  it('kalit yoʻq — 503 ASSISTANT_DISABLED', async () => {
    const svc = new AssistantService(deps, null);
    expect(svc.enabled).toBe(false);
    await expect(
      svc.chat(user, perms(), { messages: [{ role: 'user', text: 'salom' }] }),
    ).rejects.toMatchObject({ code: 'ASSISTANT_DISABLED' });
  });

  it('rad etish (refusal) — 422; cheksiz sikl yoʻq — 6 qadamda toʻxtaydi', async () => {
    const refused = new AssistantService(deps, fakeLlm([msg('refusal', [])]).llm);
    await expect(
      refused.chat(user, perms(), { messages: [{ role: 'user', text: 'x' }] }),
    ).rejects.toMatchObject({ code: 'ASSISTANT_REFUSED' });
    const loop = Array.from({ length: 6 }, () =>
      msg('tool_use', [{ type: 'tool_use', id: 't', name: 'today_summary', input: {} }]),
    );
    const looping = new AssistantService(deps, fakeLlm(loop).llm);
    await expect(
      looping.chat(user, perms(), { messages: [{ role: 'user', text: 'x' }] }),
    ).rejects.toMatchObject({ code: 'ASSISTANT_TOO_COMPLEX' });
  });

  it('notoʻgʻri kirish va nomaʼlum vosita — xato natija, ilova yiqilmaydi', async () => {
    const { llm, seen } = fakeLlm([
      msg('tool_use', [
        { type: 'tool_use', id: 'a', name: 'search_students', input: { query: 'x' } },
        { type: 'tool_use', id: 'b', name: 'delete_all', input: {} },
      ]),
      msg('end_turn', [{ type: 'text', text: 'ok' }]),
    ]);
    const r = await new AssistantService(deps, llm).chat(user, perms('student.view'), {
      messages: [{ role: 'user', text: 'x' }],
    });
    expect(r.reply).toBe('ok');
    const results = JSON.stringify(seen[1]?.messages.at(-1)?.content);
    expect(results).toContain('Notoʻgʻri kirish');
    expect(results).toContain('Nomaʼlum vosita');
  });

  it('telefon maskalanadi', () => {
    expect(maskPhone('+998 90 111 22 33')).toBe('***2233');
    expect(maskPhone(null)).toBeNull();
  });
});
