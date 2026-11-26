import type { Meta, StoryObj } from '@storybook/react-vite';
import { GradesView } from './grades.js';
import { LESSON, ROSTER } from './mock.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Ustoz/MT-02b Baholar' };
export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  scale: '0_5' as const,
  kinds: ['homework', 'activity'] as const,
  date: '2026-11-26',
};
const saved = { 's1:homework': 5, 's3:homework': 4, 's4:homework': 3 };

/** 0–5: tugmalar; uy vazifasi va faollik; kelmaganlar xira. */
export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <GradesView
      lesson={LESSON}
      students={ROSTER}
      absent={new Set(['s2'])}
      grades={{ ...base, saved }}
      locked={false}
      onSave={noop}
    />
  ),
};

export const Yuz: Story = {
  render: () => (
    <GradesView
      lesson={LESSON}
      students={ROSTER}
      absent={new Set()}
      grades={{
        scale: '0_100',
        kinds: ['homework'],
        saved: { 's1:homework': 87 },
        date: '2026-11-26',
      }}
      locked={false}
      onSave={noop}
    />
  ),
};

export const MuddatTugagan: Story = {
  render: () => (
    <GradesView
      lesson={LESSON}
      students={ROSTER}
      absent={new Set()}
      grades={{ ...base, saved }}
      locked
      onSave={noop}
    />
  ),
};

export const Saqlandi: Story = {
  render: () => (
    <GradesView
      lesson={LESSON}
      students={ROSTER}
      absent={new Set()}
      grades={{ ...base, saved }}
      locked={false}
      result="queued"
      onSave={noop}
    />
  ),
};

export const Yoqilmagan: Story = {
  render: () => (
    <GradesView
      lesson={LESSON}
      students={ROSTER}
      absent={new Set()}
      grades={{ ...base, kinds: [], saved: {} }}
      locked={false}
      onSave={noop}
    />
  ),
};
