import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { SETTINGS, STAFF } from './mock.js';
import { SettingsView } from './settings.js';
import { StaffView } from './staff.js';
import { WizardView } from './wizard.js';

const noop = () => undefined;
const meta: Meta = { title: 'web/F1/W-28–33 Xodimlar va sozlamalar' };
export default meta;
type Story = StoryObj<typeof meta>;

export const W28_Staff: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/staff">
      <StaffView rows={STAFF} onInvite={noop} onOpen={noop} />
    </WebFrame>
  ),
};
export const W29_Settings: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/settings">
      <SettingsView section="billing" s={SETTINGS} onSection={noop} />
    </WebFrame>
  ),
};
/** W-33: menyusiz, to'liq ekran usta (birinchi kirish). */
export const W33_Wizard: Story = {
  tags: ['primary'],
  render: () => <WizardView step={2} onNext={noop} onBack={noop} />,
};
const states = webStates('/staff', t.staff.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
