import { z } from 'zod';
import type { AssistantLlm, LlmReply, LlmRequest, LlmToolCall, LlmTurn } from './assistant.llm.js';

/** Q-119: DeepSeek Chat Completions (OpenAI formati, function calling). */
export const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
export const DEEPSEEK_MODEL = 'deepseek-chat';
const TIMEOUT_MS = 60_000;
const RETRIES = 2;

const Completion = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable(),
        message: z.object({
          content: z.string().nullable().optional(),
          tool_calls: z
            .array(
              z.object({
                id: z.string(),
                function: z.object({ name: z.string(), arguments: z.string() }),
              }),
            )
            .nullable()
            .optional(),
        }),
      }),
    )
    .min(1),
});

/** Argumentlar JSON matn; buzilgan bo'lsa — vosita xato natija qaytaradi (ilova yiqilmaydi). */
const parseArgs = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { __invalid: raw.slice(0, 200) };
  }
};

function toWire(m: LlmTurn) {
  if (m.role === 'tool') return { role: 'tool', tool_call_id: m.toolCallId, content: m.content };
  if (m.role === 'user') return { role: 'user', content: m.content };
  return {
    role: 'assistant',
    content: m.content,
    ...(m.toolCalls.length > 0
      ? {
          tool_calls: m.toolCalls.map((c) => ({
            id: c.id,
            type: 'function',
            function: { name: c.name, arguments: JSON.stringify(c.input) },
          })),
        }
      : {}),
  };
}

export function deepseekBody(req: LlmRequest) {
  return {
    model: DEEPSEEK_MODEL,
    max_tokens: 4000,
    temperature: 0.3,
    messages: [{ role: 'system', content: req.system }, ...req.messages.map(toWire)],
    tools: req.tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    })),
  };
}

export function fromWire(json: unknown): LlmReply {
  const choice = Completion.parse(json).choices[0];
  if (!choice) throw new Error("DeepSeek: javob bo'sh");
  const toolCalls: LlmToolCall[] = (choice.message.tool_calls ?? []).map((c) => ({
    id: c.id,
    name: c.function.name,
    input: parseArgs(c.function.arguments),
  }));
  const reason = choice.finish_reason;
  const finish: LlmReply['finish'] =
    reason === 'content_filter'
      ? 'refused'
      : reason === 'length'
        ? 'length'
        : toolCalls.length > 0
          ? 'tool_calls'
          : 'stop';
  return { text: (choice.message.content ?? '').trim(), toolCalls, finish };
}

const retryable = (status: number) => status === 429 || status >= 500;

/** `fetchImpl` — testda soxta. Kalit faqat sarlavhada (logga tushmaydi). */
export function deepseekLlm(apiKey: string, fetchImpl: typeof fetch = fetch): AssistantLlm {
  return {
    async chat(req) {
      const body = JSON.stringify(deepseekBody(req));
      for (let attempt = 0; ; attempt++) {
        const res = await fetchImpl(DEEPSEEK_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.ok) return fromWire(await res.json());
        if (!retryable(res.status) || attempt >= RETRIES)
          throw new Error(`DeepSeek HTTP ${res.status}`);
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    },
  };
}
