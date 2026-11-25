import { miniappMessages as t } from '@lg/i18n';
import {
  type Command,
  CommandPalette,
  modKey,
  PassiveControls,
  SideNav,
  type SideNavGroup,
  useHotkey,
  useWebApp,
} from '@lg/ui-tg';
import { useNavigate } from '@tanstack/react-router';
import { Sparkles, UserRound } from 'lucide-react';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useAssistantChat } from '../data/assistant.js';
import { StaffAssistantPage } from '../pages/staff-assistant.js';
import { useMe } from '../session/session.js';
import { useQuickStudents } from './desk-data.js';
import { AssistantPanel, Brand, TopBar, UserCard } from './desk-parts.js';

const d = t.desk;
const ASSISTANT_PATH = '/staff/assistant';

/** Buyruqlar: barcha bo'limlar + yozilganga qarab o'quvchilar va yordamchiga savol. */
function useCommands(side: readonly SideNavGroup[], query: string, openAssistant: () => void) {
  const navigate = useNavigate();
  const chat = useAssistantChat();
  const students = useQuickStudents(query);
  const commands = useMemo<Command[]>(
    () =>
      side.flatMap((g) =>
        g.items.map((i) => ({
          key: i.to,
          label: i.label,
          group: g.title,
          icon: i.icon,
          run: () => void navigate({ to: i.to }),
        })),
      ),
    [side, navigate],
  );
  const dynamic = (q: string) => ({
    before: (students.data ?? []).map((s) => ({
      key: `student:${s.id}`,
      label: `${s.fullName} · LG-${s.code}`,
      group: d.students,
      icon: UserRound,
      run: () => void navigate({ to: '/staff/student/$id', params: { id: s.id } }),
    })),
    after: [
      {
        key: 'ask',
        label: d.ask.replace('{q}', q),
        icon: Sparkles,
        run: () => {
          openAssistant();
          chat.ask(q);
        },
      },
    ],
  });
  return { commands, dynamic };
}

/**
 * Kompyuter qobig'i (T-174): chapda yon panel (logo, bo'limlar, foydalanuvchi), tepada qidiruv va
 * AI yordamchi tugmasi, o'ngda — yordamchi paneli (sahifani yopmasdan). Ctrl/⌘ K — buyruqlar
 * oynasi, Ctrl/⌘ J — yordamchi. Telefon kengligida ishlatilmaydi.
 */
export function DeskShell(p: { path: string; side: readonly SideNavGroup[]; children: ReactNode }) {
  const navigate = useNavigate();
  const me = useMe();
  const mod = modKey(useWebApp().platform);
  const [palette, setPalette] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [query, setQuery] = useState('');
  const openPalette = useCallback(() => setPalette(true), []);
  const toggleAssistant = useCallback(() => setAssistant((a) => !a), []);
  useHotkey('k', openPalette);
  useHotkey('j', toggleAssistant);
  const { commands, dynamic } = useCommands(p.side, palette ? query : '', () => setAssistant(true));
  // Yordamchi sahifasining o'zida panel kerak emas.
  const panel = assistant && p.path !== ASSISTANT_PATH;

  return (
    <div className="flex min-h-screen">
      <SideNav
        groups={p.side}
        active={p.path}
        onSelect={(i) => void navigate({ to: i.to })}
        brand={<Brand />}
        footer={
          <UserCard
            name={me.fullName}
            role={me.activeRole}
            onSettings={() => void navigate({ to: '/settings' })}
          />
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar mod={mod} onSearch={openPalette} assistant={panel} onAssistant={toggleAssistant} />
        <div className="min-w-0 flex-1">{p.children}</div>
      </div>
      {panel && (
        <AssistantPanel onClose={() => setAssistant(false)}>
          <PassiveControls>
            <StaffAssistantPage />
          </PassiveControls>
        </AssistantPanel>
      )}
      <CommandPalette
        open={palette}
        onClose={() => setPalette(false)}
        commands={commands}
        dynamic={dynamic}
        onQuery={setQuery}
        placeholder={d.palette}
        empty={d.empty}
        closeLabel={d.close}
      />
    </div>
  );
}
