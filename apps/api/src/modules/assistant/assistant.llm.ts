/**
 * Model chaqiruvi — provayderdan mustaqil (Q-119: DeepSeek). Servis faqat shu turlarni biladi;
 * testda soxta model. `null` — kalit berilmagan, yordamchi o'chiq.
 */
export interface LlmToolCall {
  id: string;
  name: string;
  /** Model yuborgan argumentlar (tekshirilmagan — vosita Zod bilan tekshiradi). */
  input: unknown;
}

export type LlmTurn =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls: LlmToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };

export interface LlmTool {
  name: string;
  description: string;
  /** JSON Schema (object). */
  parameters: Record<string, unknown>;
}

export interface LlmRequest {
  system: string;
  tools: readonly LlmTool[];
  messages: readonly LlmTurn[];
}

export interface LlmReply {
  text: string;
  toolCalls: LlmToolCall[];
  /** `refused` — kontent filtri; `length` — javob uzunlik chegarasiga yetdi. */
  finish: 'stop' | 'tool_calls' | 'length' | 'refused';
}

export interface AssistantLlm {
  chat(req: LlmRequest): Promise<LlmReply>;
}

export const ASSISTANT_LLM = Symbol('ASSISTANT_LLM');
