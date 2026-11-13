import { formatDateShort, webMessages as t } from '@lg/i18n';
import { Button } from '@lg/ui-web';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BadgePercent, PauseCircle, UserPlus } from 'lucide-react';
import { WebFrame, webStates } from '../story-kit.js';
import { STUDENT, STUDENTS } from './mock.js';
import {
  type CardTab,
  GuardiansCard,
  InfoCard,
  LedgerTable,
  StudentCardView,
} from './student-card.js';
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
    list({
      filter: 'debtors',
      rows: STUDENTS.filter((s) => (s.debt ?? 0n) > 0n),
      onLoadMore: undefined,
    }),
};
/** Qidiruv: `oʻ`/`o'` farqsiz (normalizeUz). */
export const W05_NotFound: Story = {
  render: () => list({ query: 'Rustamov', rows: [], onLoadMore: undefined }),
};
export const W05_LoadingTable: Story = { render: () => list({ loading: true, rows: [] }) };
const history = STUDENT.history.map((h) => (
  <p key={h.group}>
    {h.group}{' '}
    <span className="text-text-muted">
      (
      {h.to
        ? t.studentCard.left.replace('{date}', formatDateShort(h.to))
        : t.studentCard.since.replace('{date}', formatDateShort(h.from))}
      )
    </span>
  </p>
));
const cardActions = (
  <>
    <Button variant="secondary">
      <BadgePercent className="size-4" aria-hidden />
      {t.studentCard.discount}
    </Button>
    <Button variant="secondary">
      <PauseCircle className="size-4" aria-hidden />
      {t.studentCard.freeze}
    </Button>
    <Button>
      <UserPlus className="size-4" aria-hidden />
      {t.studentCard.enroll}
    </Button>
  </>
);
const card = (tab: CardTab, body: React.ReactNode) => (
  <WebFrame active="/students">
    <StudentCardView s={STUDENT} tab={tab} actions={cardActions} onTab={noop}>
      {body}
    </StudentCardView>
  </WebFrame>
);
export const W06_Info: Story = {
  tags: ['primary'],
  render: () =>
    card(
      'info',
      <div className="grid grid-cols-2 gap-4">
        <InfoCard
          rows={[
            [t.studentCard.birthDate, formatDateShort(STUDENT.birthDate)],
            [t.studentCard.school, STUDENT.school],
            [t.students.cols.groups, history],
          ]}
        />
        <GuardiansCard guardians={STUDENT.guardians} />
      </div>,
    ),
};
/** BR-20: ledger — har oy hisob (debet), to'lov (kredit), qoldiq. */
export const W06_Ledger: Story = {
  tags: ['primary'],
  render: () => card('ledger', <LedgerTable rows={STUDENT.ledger} />),
};
const states = webStates('/students', t.students.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
