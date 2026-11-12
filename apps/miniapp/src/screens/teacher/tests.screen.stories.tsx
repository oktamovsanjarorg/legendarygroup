import type { Meta, StoryObj } from '@storybook/react-vite';
import { stateStories } from '../story-kit.js';
import { COLUMNS, IMPORT_RESOLVED, IMPORT_ROWS, TESTS } from './mock-more.js';
import { TestImportView } from './test-import.js';
import { TestsView } from './tests.js';

const noop = () => undefined;
const group = 'IELTS 7.0 — B2-guruh';
const meta: Meta = { title: 'miniapp/Ustoz/MT-07–08 Testlar va import' };
export default meta;
type Story = StoryObj<typeof meta>;

export const MT07_List: Story = {
  tags: ['primary'],
  render: () => (
    <TestsView groupName={group} tests={TESTS} canManage onCreate={noop} onOpen={noop} />
  ),
};
export const MT07_Assistant: Story = {
  render: () => (
    <TestsView groupName={group} tests={TESTS} canManage={false} onCreate={noop} onOpen={noop} />
  ),
};
export const MT07_Empty: Story = {
  render: () => <TestsView groupName={group} tests={[]} canManage onCreate={noop} onOpen={noop} />,
};
/** BR-35: 2 ta noaniq moslik tasdiqlanmaguncha import yopiq. */
export const MT08_NeedsReview: Story = {
  tags: ['primary'],
  render: () => (
    <TestImportView
      testName="Mock IELTS — Reading"
      maxScore={40}
      columns={COLUMNS}
      rows={IMPORT_ROWS}
      onDecide={noop}
      onChangeColumns={noop}
      onImport={noop}
    />
  ),
};
export const MT08_Ready: Story = {
  render: () => (
    <TestImportView
      testName="Mock IELTS — Reading"
      maxScore={40}
      columns={COLUMNS}
      rows={IMPORT_RESOLVED}
      onDecide={noop}
      onChangeColumns={noop}
      onImport={noop}
    />
  ),
};
export const MT08_Importing: Story = {
  render: () => (
    <TestImportView
      testName="Mock IELTS — Reading"
      maxScore={40}
      columns={COLUMNS}
      rows={IMPORT_RESOLVED}
      importing
      onDecide={noop}
      onChangeColumns={noop}
      onImport={noop}
    />
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
