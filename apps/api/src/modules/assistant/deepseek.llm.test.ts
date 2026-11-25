import { describe, expect, it } from 'vitest';
import type { LlmRequest } from './assistant.llm.js';
import {
  DEEPSEEK_MODEL,
  DEEPSEEK_URL,
  deepseekBody,
  deepseekLlm,
  fromWire,
} from './deepseek.llm.js';

const req: LlmRequest = {
  system: 'Siz yordamchisiz',
  tools: [{ name: 'today_summary', description: 'Bugun', parameters: { type: 'object' } }],
  messages: [
    { role: 'user', content: 'Bugun qancha tushdi?' },
    { role: 'assistant', content: '', toolCalls: [{ id: 'c1', name: 'today_summary', input: {} }] },
    { role: 'tool', toolCallId: 'c1', content: '{"revenueToday":"500000"}' },
  ],
};

const completion = (message: object, finish_reason = 'stop') => ({
  choices: [{ finish_reason, message }],
});

describe('DeepSeek adapteri (Q-119)', () => {
  it('soʻrov OpenAI formatida: system birinchi, tool_calls va tool javobi id bilan', () => {
    const body = deepseekBody(req);
    expect(body.model).toBe(DEEPSEEK_MODEL);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Siz yordamchisiz' });
    expect(body.messages[2]).toMatchObject({
      role: 'assistant',
      tool_calls: [
        { id: 'c1', type: 'function', function: { name: 'today_summary', arguments: '{}' } },
      ],
    });
    expect(body.messages[3]).toEqual({
      role: 'tool',
      tool_call_id: 'c1',
      content: '{"revenueToday":"500000"}',
    });
    expect(body.tools[0]).toMatchObject({ type: 'function', function: { name: 'today_summary' } });
  });

  it('javob: matn, vosita chaqiruvlari (buzilgan JSON — yiqilmaydi), filtr — refused', () => {
    expect(fromWire(completion({ content: ' Salom ' }))).toEqual({
      text: 'Salom',
      toolCalls: [],
      finish: 'stop',
    });
    const tools = fromWire(
      completion(
        {
          content: null,
          tool_calls: [
            { id: 'a', function: { name: 'search_students', arguments: '{"query":"Ali"}' } },
            { id: 'b', function: { name: 'today_summary', arguments: '{oops' } },
          ],
        },
        'tool_calls',
      ),
    );
    expect(tools.finish).toBe('tool_calls');
    expect(tools.toolCalls[0]?.input).toEqual({ query: 'Ali' });
    expect(tools.toolCalls[1]?.input).toMatchObject({ __invalid: '{oops' });
    expect(fromWire(completion({ content: '' }, 'content_filter')).finish).toBe('refused');
    expect(() => fromWire({ choices: [] })).toThrow();
  });

  it('kalit sarlavhada; 5xx/429 — qayta urinish; 4xx — darhol xato', async () => {
    const seen: { url: string; auth: string | null }[] = [];
    const statuses = [503, 200];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen.push({ url, auth: new Headers(init.headers).get('authorization') });
      const status = statuses.shift() ?? 200;
      return new Response(JSON.stringify(completion({ content: 'ok' })), { status });
    }) as typeof fetch;
    const reply = await deepseekLlm('sk-test-key-0123456789', fetchImpl).chat(req);
    expect(reply.text).toBe('ok');
    expect(seen).toHaveLength(2);
    expect(seen[0]).toEqual({ url: DEEPSEEK_URL, auth: 'Bearer sk-test-key-0123456789' });

    const unauthorized = (async () => new Response('{}', { status: 401 })) as typeof fetch;
    await expect(deepseekLlm('sk-bad-key-0123456789', unauthorized).chat(req)).rejects.toThrow(
      'DeepSeek HTTP 401',
    );
  });
});
