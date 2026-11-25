import Anthropic from '@anthropic-ai/sdk';

export type LlmParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
export type LlmMessage = Anthropic.Beta.Messages.BetaMessage;

/** Model chaqiruvi (testda soxta). `null` — kalit berilmagan, yordamchi o'chiq. */
export interface AssistantLlm {
  create(params: LlmParams): Promise<LlmMessage>;
}

export const ASSISTANT_LLM = Symbol('ASSISTANT_LLM');

/** Claude Messages API (SDK). Rad etishda — server tomonidagi zaxira model (`fallbacks`). */
export function anthropicLlm(apiKey: string): AssistantLlm {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
  return { create: (params) => client.beta.messages.create(params) };
}
