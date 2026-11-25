import type { AssistantChatRequest, AssistantChatResponse, Permission } from '@lg/contracts';
import type Anthropic from '@anthropic-ai/sdk';
import { HttpStatus, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import type { AssistantDeps } from './assistant.deps.js';
import { ASSISTANT_LLM, type AssistantLlm, type LlmMessage } from './assistant.llm.js';
import { ASSISTANT_SYSTEM } from './assistant.prompt.js';
import { ASSISTANT_TOOLS, AssistantToolbox } from './assistant.tools.js';

export const ASSISTANT_DEPS = Symbol('ASSISTANT_DEPS');
const MODEL = 'claude-opus-5-5';
/** Bir savolga ko'pi bilan shuncha model chaqiruvi (vosita sikli cheklangan). */
const MAX_STEPS = 6;

type Param = Anthropic.Beta.Messages.BetaMessageParam;
type ToolResult = Anthropic.Beta.Messages.BetaToolResultBlockParam;

const textOf = (m: LlmMessage) =>
  m.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

/**
 * AI yordamchi (Q-114): Claude + o'qish vositalari. Har vosita chaqiruvchining ruxsati bilan;
 * yozish yo'q — faqat ekran tugmasi. Javob qisqa, o'zbekcha.
 */
@Injectable()
export class AssistantService {
  private readonly log = new Logger(AssistantService.name);

  constructor(
    @Inject(ASSISTANT_DEPS) private readonly deps: AssistantDeps,
    @Optional() @Inject(ASSISTANT_LLM) private readonly llm: AssistantLlm | null,
  ) {}

  get enabled(): boolean {
    return !!this.llm;
  }

  async chat(
    user: RequestUser,
    perms: ReadonlySet<Permission>,
    req: AssistantChatRequest,
  ): Promise<AssistantChatResponse> {
    if (!this.llm) throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'ASSISTANT_DISABLED');
    const toolbox = new AssistantToolbox(this.deps, user, perms);
    const messages: Param[] = req.messages.map((m) => ({ role: m.role, content: m.text }));
    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await this.call(messages);
      if (res.stop_reason === 'refusal')
        throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'ASSISTANT_REFUSED');
      if (res.stop_reason !== 'tool_use') return { reply: textOf(res), actions: toolbox.actions };
      messages.push({ role: 'assistant', content: res.content });
      messages.push({ role: 'user', content: await this.runTools(toolbox, res) });
    }
    throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'ASSISTANT_TOO_COMPLEX');
  }

  private async call(messages: Param[]): Promise<LlmMessage> {
    if (!this.llm) throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'ASSISTANT_DISABLED');
    try {
      return await this.llm.create({
        model: MODEL,
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: ASSISTANT_SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: ASSISTANT_TOOLS,
        messages,
      });
    } catch (e) {
      // Xabar matni logga — PII yo'q (savol matni yozilmaydi).
      this.log.warn(`assistant LLM xatosi: ${(e as Error).name}`);
      throw new AppException(HttpStatus.BAD_GATEWAY, 'ASSISTANT_UNAVAILABLE');
    }
  }

  private async runTools(toolbox: AssistantToolbox, res: LlmMessage): Promise<ToolResult[]> {
    const uses = res.content.filter(
      (b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === 'tool_use',
    );
    // Parallel chaqiruvlar — natijalar bitta xabarda.
    return Promise.all(
      uses.map(async (u) => {
        const out = await toolbox.run(u.name, u.input);
        return {
          type: 'tool_result' as const,
          tool_use_id: u.id,
          content: out.content,
          ...(out.isError ? { is_error: true } : {}),
        };
      }),
    );
  }
}
