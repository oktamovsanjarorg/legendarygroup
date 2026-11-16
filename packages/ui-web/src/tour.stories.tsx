import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from './button.js';
import { Tour } from './tour.js';

const meta = {
  title: 'ui-web/Tour',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const MENU = t.tour.steps.slice(0, 4);

function Demo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex min-h-[480px]">
      <nav className="flex w-60 flex-col gap-1 border-r border-border p-4">
        {MENU.map((s) => (
          <a key={s.to} data-tour={s.to} className="rounded-md px-3 py-2 text-sm text-text">
            {s.title}
          </a>
        ))}
      </nav>
      <main className="flex-1 p-8">
        <Button onClick={() => setOpen(true)}>{t.help.replayTour}</Button>
      </main>
      {open && (
        <Tour
          steps={MENU.map((s) => ({
            target: `[data-tour="${s.to}"]`,
            title: s.title,
            body: s.body,
          }))}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/** Birinchi kirish: menyu bandi yoritiladi, oʻngda izoh kartochkasi. */
export const MenuTour: Story = { render: () => <Demo /> };
