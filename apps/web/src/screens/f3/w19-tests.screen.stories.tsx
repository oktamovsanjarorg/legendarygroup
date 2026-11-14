import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_IMPORT_HISTORY, MOCK_IMPORT_PREVIEW, MOCK_TESTS } from './mock-comm.js';
import { TestsView } from './w19-tests.js';

const meta: Meta = { title: 'web/F3/W-19 Testlar va importlar' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/tests">
      <TestsView
        tests={MOCK_TESTS}
        history={MOCK_IMPORT_HISTORY}
        previewRows={MOCK_IMPORT_PREVIEW}
      />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/tests">
      <TestsView tests={[]} history={[]} previewRows={[]} />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/tests" offline>
      <TestsView
        tests={MOCK_TESTS}
        history={MOCK_IMPORT_HISTORY}
        previewRows={MOCK_IMPORT_PREVIEW}
      />
    </WebFrame>
  ),
};

const states = webStates('/tests', t.tests.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
