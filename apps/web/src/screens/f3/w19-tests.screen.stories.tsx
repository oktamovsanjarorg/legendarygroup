import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_IMPORT_ROWS, MOCK_TEST_RESULTS, MOCK_TESTS } from './mock-comm.js';
import { ImportPreview } from './w19-import.js';
import { TestsView } from './w19-tests.js';

const meta: Meta = { title: 'web/F3/W-19 Testlar' };
export default meta;
type Story = StoryObj<typeof meta>;
const noop = () => undefined;
const groups = [{ value: 'g1', label: 'MAT-1' }];

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/tests">
      <TestsView
        groups={groups}
        groupId="g1"
        onGroup={noop}
        tests={MOCK_TESTS}
        selectedId="t1"
        onSelect={noop}
        results={MOCK_TEST_RESULTS}
        onNew={noop}
        onTemplate={noop}
      />
    </WebFrame>
  ),
};

export const ImportPreviewStory: Story = {
  name: 'Excel import',
  render: () => (
    <WebFrame active="/tests">
      <TestsView
        groups={groups}
        groupId="g1"
        onGroup={noop}
        tests={MOCK_TESTS}
        selectedId="t2"
        onSelect={noop}
        results={[]}
        onNew={noop}
        onTemplate={noop}
        onImportFile={noop}
        onPublish={noop}
      >
        <ImportPreview
          rows={MOCK_IMPORT_ROWS}
          accepted={new Set(['s3'])}
          onToggle={noop}
          onConfirm={noop}
          onCancel={noop}
        />
      </TestsView>
    </WebFrame>
  ),
};

export const NoGroup: Story = {
  render: () => (
    <WebFrame active="/tests">
      <TestsView
        groups={groups}
        groupId={null}
        onGroup={noop}
        tests={[]}
        selectedId={null}
        onSelect={noop}
      />
    </WebFrame>
  ),
};

const states = webStates('/tests', t.tests.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
