import type { Meta, StoryObj } from '@storybook/react-vite';
import { GUARDIAN_TABS, stateStories, TabRoot } from '../story-kit.js';
import { CHILD_TABS, MONTHLY, RESULTS, TEST_RESULT, WEEKLY } from './mock.js';
import { ReportView } from './report.js';
import { ResultsView } from './results.js';
import { TestResultView } from './test-result.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Ota-ona/MG-02–04 Natijalar va hisobot' };
export default meta;
type Story = StoryObj<typeof meta>;

export const MG02_Results: Story = {
  tags: ['primary'],
  render: () => (
    <TabRoot active="/results" tabs={GUARDIAN_TABS}>
      <ResultsView
        childTabs={CHILD_TABS}
        selected="c1"
        onSelect={noop}
        data={RESULTS}
        onTest={noop}
      />
    </TabRoot>
  ),
};
/** Yangi o'quvchi: grafik uchun baho yetarli emas. */
export const MG02_NewStudent: Story = {
  render: () => (
    <ResultsView
      childTabs={CHILD_TABS}
      selected="c2"
      onSelect={noop}
      data={{
        ...RESULTS,
        progress: [],
        tests: [],
        comments: [],
        grades: [],
        month: { ...RESULTS.month, marks: {} },
      }}
      onTest={noop}
    />
  ),
};
/** Q-42: o'rin yo'q — faqat guruh o'rtachasi. */
export const MG03_TestResult: Story = {
  tags: ['primary'],
  render: () => <TestResultView r={TEST_RESULT} />,
};
export const MG04_Weekly: Story = {
  tags: ['primary'],
  render: () => <ReportView r={WEEKLY} onPdf={noop} />,
};
export const MG04_MonthlyPdf: Story = { render: () => <ReportView r={MONTHLY} onPdf={noop} /> };
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
