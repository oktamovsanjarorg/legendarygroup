import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { STUDENT, STUDENTS } from './mock.js';
import { StudentCardView } from './student-card.js';
import { StudentsView } from './students.js';

const noop = () => undefined;
const counts = { active: 186, debtors: 22, frozen: 4, archived: 61 };
const meta: Meta = { title: 'web/F1/W-05–06 Oʻquvchilar' };
export default meta;
type Story = StoryObj<typeof meta>;

const list = (props: Partial<Parameters<typeof StudentsView>[0]>) => (
  <WebFrame active="/students">
    <StudentsView
      rows={STUDENTS}
      filter="active"
      counts={counts}
      query=""
      onFilter={noop}
      onQuery={noop}
      onOpen={noop}
      onNew={noop}
      onLoadMore={noop}
      {...props}
    />
  </WebFrame>
);
export const W05_List: Story = { tags: ['primary'], render: () => list({}) };
export const W05_Debtors: Story = {
  render: () =>
    list({ filter: 'debtors', rows: STUDENTS.filter((s) => s.debt > 0n), onLoadMore: undefined }),
};
/** Qidiruv: `oʻ`/`o'` farqsiz (normalizeUz). */
export const W05_NotFound: Story = {
  render: () => list({ query: 'Rustamov', rows: [], onLoadMore: undefined }),
};
export const W05_LoadingTable: Story = { render: () => list({ loading: true, rows: [] }) };
export const W06_Info: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/students">
      <StudentCardView s={STUDENT} tab="info" onTab={noop} />
    </WebFrame>
  ),
};
/** BR-20: ledger — har oy hisob (debet), to'lov (kredit), qoldiq. */
export const W06_Ledger: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/students">
      <StudentCardView s={STUDENT} tab="ledger" onTab={noop} />
    </WebFrame>
  ),
};
const states = webStates('/students', t.students.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
