import type { StudentDetail } from '@lg/contracts';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudentAccessView } from './access-card.js';

const noop = () => undefined;
const STUDENT: StudentDetail = {
  id: 's1',
  code: 10001,
  fullName: 'Aliyev Jasur',
  birthDate: '2011-04-17',
  phone: '+998901112233',
  archivedAt: null,
  gender: 'male',
  school: '64-maktab',
  grade: '9-sinf',
  source: 'instagram',
  notes: null,
  photoFileId: null,
  guardians: [],
  accessCodeSet: false,
  telegramLinked: false,
  createdAt: '2026-11-01T05:00:00Z',
  updatedAt: '2026-11-01T05:00:00Z',
};

const view = (s: StudentDetail, extra: { newCode?: string; canManage?: boolean } = {}) => (
  <div className="max-w-md p-4">
    <StudentAccessView
      s={s}
      canManage={extra.canManage ?? true}
      newCode={extra.newCode ?? null}
      error={null}
      loadingCode={false}
      loadingUnlink={false}
      onGenerate={noop}
      onUnlink={noop}
    />
  </div>
);

const meta: Meta = { title: 'web/F1/W-06 Oʻquvchi — Mini Appʼga kirish (T-126)' };
export default meta;
type Story = StoryObj<typeof meta>;

/** Kod hali berilmagan, Telegram ulanmagan — «Kod yaratish». */
export const NoCode: Story = { tags: ['primary'], render: () => view(STUDENT) };
/** Kod yaratildi — bir marta katta koʻrsatiladi (D2). */
export const CodeShownOnce: Story = {
  render: () => view({ ...STUDENT, accessCodeSet: true }, { newCode: '048213' }),
};
/** Ulangan — «Kodni yangilash» va «Telegramdan uzish» (D6). */
export const Linked: Story = {
  render: () => view({ ...STUDENT, accessCodeSet: true, telegramLinked: true }),
};
/** Ustoz: faqat holat, amallar yoʻq. */
export const ReadOnly: Story = {
  render: () => view({ ...STUDENT, accessCodeSet: true }, { canManage: false }),
};
