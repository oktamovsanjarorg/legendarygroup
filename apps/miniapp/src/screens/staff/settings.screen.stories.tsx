import type { Meta, StoryObj } from '@storybook/react-vite';
import { emptyCard, type SettingsSection, toForm } from '../../data/staff-settings.js';
import {
  CardsView,
  CardView,
  SettingsMenuView,
  SettingsSectionView,
  StartView,
} from './settings.js';
import { cards, settings, start } from './settings-mock.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Xodim/MS-32 Sozlamalar' };
export default meta;
type Story = StoryObj<typeof meta>;

const section = (x: SettingsSection): Story => ({
  render: () => (
    <SettingsSectionView
      section={x}
      form={toForm(settings)}
      onForm={noop}
      saving={false}
      onSave={noop}
      logo={{ kind: 'empty' }}
      onPickLogo={noop}
    />
  ),
});

export const MS32_Menu: Story = { render: () => <SettingsMenuView onOpen={noop} /> };
export const MS32a_Center: Story = section('center');
export const MS32a_Billing: Story = section('billing');
export const MS32a_Penalty: Story = section('penalty');
export const MS32a_Times: Story = section('times');
export const MS32b_Cards: Story = {
  render: () => <CardsView cards={cards} onOpen={noop} onAdd={noop} />,
};
export const MS32b_NoCards: Story = {
  render: () => <CardsView cards={[]} onOpen={noop} onAdd={noop} />,
};
export const MS32b_NewCard: Story = {
  render: () => (
    <CardView
      form={emptyCard}
      saved={null}
      saving={false}
      onForm={noop}
      onSave={noop}
      onPrimary={noop}
      onRemove={noop}
    />
  ),
};
export const MS32c_Start: Story = { render: () => <StartView state={start} onStep={noop} /> };
