import readline from 'node:readline';
import type { Update } from 'grammy/types';
import { createBot } from './bot.js';
import { loadRootEnv, parseBotEnv } from './env.js';
import { createInternalApi } from './internal-api.js';

interface SimState {
  userId: number;
  username: string;
  firstName: string;
  updateId: number;
}

const memoryStore = () => {
  const keys = new Set<string>();
  return { set: async (k: string) => (keys.has(k) ? null : (keys.add(k), 'OK')) };
};

const botInfo = {
  id: 1,
  is_bot: true as const,
  first_name: 'LegendaryBot',
  username: 'legendary_group_bot',
  can_join_groups: false,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  can_manage_bots: false,
  supports_join_request_queries: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
};

function printHelp(): void {
  console.info('\x1b[33m=== Legendary Group Telegram Bot Simulator ===\x1b[0m');
  console.info('Mavjud buyruqlar:');
  console.info('  /start                 - Boshlash / holat tekshirish');
  console.info('  /start inv_<token>     - Ustoz taklifi');
  console.info('  /help                  - Yordam');
  console.info(
    '  contact <telefon>      - Telefon raqam ulashish (masalan: contact +998901234567)',
  );
  console.info('  user <id> <ism>        - Foydalanuvchini almashtirish');
  console.info('  exit                   - Chiqish\n');
}

function buildContactUpdate(state: SimState, phone: string): Update {
  state.updateId += 1;
  return {
    update_id: state.updateId,
    message: {
      message_id: state.updateId,
      date: Math.floor(Date.now() / 1000),
      chat: { id: state.userId, type: 'private', first_name: state.firstName },
      from: {
        id: state.userId,
        is_bot: false,
        first_name: state.firstName,
        username: state.username,
      },
      contact: {
        phone_number: phone,
        first_name: state.firstName,
        user_id: state.userId,
      },
    },
  };
}

function buildTextUpdate(state: SimState, text: string): Update {
  state.updateId += 1;
  const commandLength = text.split(' ')[0]?.length ?? 0;
  return {
    update_id: state.updateId,
    message: {
      message_id: state.updateId,
      date: Math.floor(Date.now() / 1000),
      chat: { id: state.userId, type: 'private', first_name: state.firstName },
      from: {
        id: state.userId,
        is_bot: false,
        first_name: state.firstName,
        username: state.username,
      },
      text,
      entities: text.startsWith('/')
        ? [{ type: 'bot_command', offset: 0, length: commandLength }]
        : [],
    },
  };
}

async function handleLine(
  text: string,
  state: SimState,
  bot: ReturnType<typeof createBot>,
): Promise<boolean> {
  if (text === 'exit' || text === 'quit') return false;

  if (text.startsWith('user ')) {
    const parts = text.split(' ');
    state.userId = Number(parts[1]) || 998877;
    state.firstName = parts.slice(2).join(' ') || 'Foydalanuvchi';
    console.info(`Foydalanuvchi: ID=${state.userId}, Ism=${state.firstName}`);
    return true;
  }

  const update = text.startsWith('contact ')
    ? buildContactUpdate(state, text.slice(8).trim())
    : buildTextUpdate(state, text);

  await bot.handleUpdate(update).catch((err: unknown) => console.error('Xato:', err));
  return true;
}

async function runCliSim(): Promise<void> {
  loadRootEnv();
  const env = parseBotEnv(process.env);
  const state: SimState = {
    userId: 998877,
    username: 'test_sanjar',
    firstName: 'Sanjar',
    updateId: 1000,
  };

  const bot = createBot({
    env,
    store: memoryStore(),
    log: { error: (_e, msg) => console.error(`[ERROR] ${msg}`) },
    botInfo,
    api: createInternalApi(env),
  });

  bot.api.config.use(async (_prev, method, payload) => {
    const p = payload as Record<string, unknown>;
    if (method === 'sendMessage') {
      console.info('\x1b[32m🤖 [BOT]:\x1b[0m');
      console.info(String(p['text'] ?? ''));
      if (p['reply_markup']) {
        console.info('\x1b[36m🔘 [Tugmalar]:\x1b[0m', JSON.stringify(p['reply_markup'], null, 2));
      }
    }
    return { ok: true, result: true } as never;
  });

  printHelp();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = () =>
    rl.question('\x1b[34m👤 [Siz]: \x1b[0m', async (line) => {
      const shouldContinue = await handleLine(line.trim(), state, bot);
      if (shouldContinue) prompt();
      else rl.close();
    });
  prompt();
}

runCliSim().catch((err: unknown) => {
  console.error('Simulator xatosi:', err);
  process.exit(1);
});
