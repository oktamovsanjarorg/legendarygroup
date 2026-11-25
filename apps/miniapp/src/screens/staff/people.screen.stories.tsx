import type { Meta, StoryObj } from '@storybook/react-vite';
import { PeopleView, PersonFormView, PersonView } from './people.js';
import { admin, people, teacher } from './people-mock.js';
import { PermissionsView } from './people-permissions.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Xodim/MS-31 Xodimlar' };
export default meta;
type Story = StoryObj<typeof meta>;

const card = {
  own: false,
  canPermissions: true,
  groups: ['MATH-01'],
  busy: false,
  onAction: noop,
  onEdit: noop,
  onPermissions: noop,
};

export const MS31_List: Story = {
  render: () => <PeopleView items={people} meId="u1" onOpen={noop} onAdd={noop} />,
};
export const MS31_Empty: Story = {
  render: () => <PeopleView items={[]} meId="u1" onOpen={noop} onAdd={noop} />,
};
export const MS31a_Teacher: Story = { render: () => <PersonView {...card} person={teacher} /> };
export const MS31a_Admin: Story = { render: () => <PersonView {...card} person={admin} /> };
export const MS31b_Permissions: Story = {
  render: () => <PermissionsView person={admin} busy={false} onToggle={noop} />,
};
export const MS31c_New: Story = {
  render: () => (
    <PersonFormView
      form={{ fullName: '', phone: '+998' }}
      role="teacher"
      own={false}
      saving={false}
      onForm={noop}
      onRole={noop}
      onSave={noop}
    />
  ),
};
