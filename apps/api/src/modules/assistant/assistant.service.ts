import type { AssistantChatRequest, AssistantChatResponse, Permission } from '@lg/contracts';
import { HttpStatus, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import type { AssistantDeps } from './assistant.deps.js';
import { ASSISTANT_LLM, type AssistantLlm, type LlmReply, type LlmTurn } from './assistant.llm.js';
import { ASSISTANT_SYSTEM } from './assistant.prompt.js';
import { AssistantToolbox } from './assistant.toolbox.js';
import { ASSISTANT_TOOLS } from './assistant.tools.js';

export const ASSISTANT_DEPS = Symbol('ASSISTANT_DEPS');
/** Bir savolga ko'pi bilan shuncha model chaqiruvi (vosita sikli cheklangan). */
const MAX_STEPS = 6;

/**
 * AI yordamchi (Q-114, Q-119): model (DeepSeek) + o'qish vositalari. Har vosita chaqiruvchining ruxsati bilan;
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
    const messages: LlmTurn[] = req.messages.map((m) =>
      m.role === 'user'
        ? { role: 'user', content: m.text }
        : { role: 'assistant', content: m.text, toolCalls: [] },
    );
    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await this.call(messages);
      if (res.finish === 'refused')
        throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'ASSISTANT_REFUSED');
      if (res.toolCalls.length === 0) return { reply: res.text, actions: toolbox.actions };
      messages.push({ role: 'assistant', content: res.text, toolCalls: res.toolCalls });
      messages.push(...(await this.runTools(toolbox, res)));
    }
    throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'ASSISTANT_TOO_COMPLEX');
  }

  private async call(messages: LlmTurn[]): Promise<LlmReply> {
    if (!this.llm) throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'ASSISTANT_DISABLED');
    try {
      return await this.llm.chat({ system: ASSISTANT_SYSTEM, tools: ASSISTANT_TOOLS, messages });
    } catch (e) {
      // Xabar matni logga — PII yo'q (savol matni yozilmaydi).
      this.log.warn(`assistant LLM xatosi: ${(e as Error).message}`);
      throw new AppException(HttpStatus.BAD_GATEWAY, 'ASSISTANT_UNAVAILABLE');
    }
  }

  /** Parallel chaqiruvlar — har biriga alohida `tool` xabari (tartib saqlanadi). */
  private runTools(toolbox: AssistantToolbox, res: LlmReply): Promise<LlmTurn[]> {
    return Promise.all(
      res.toolCalls.map(async (c): Promise<LlmTurn> => {
        const out = await toolbox.run(c.name, c.input);
        const content = out.isError ? JSON.stringify({ error: out.content }) : out.content;
        return { role: 'tool', toolCallId: c.id, content };
      }),
    );
  }
}
