import type { Meta, StoryObj } from '@storybook/react-vite';
import { AttendanceCalendar } from './calendar.js';

const meta = {
  title: 'ui-tg/AttendanceCalendar',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <div className="p-4">
      <AttendanceCalendar offset={6} daysInMonth={30} marks={{}} />
    </div>
  ),
};

export const Full: Story = {
  render: () => (
    <div className="p-4">
      <AttendanceCalendar
        offset={6}
        daysInMonth={30}
        marks={{
          2: 'present',
          4: 'present',
          6: 'late',
          9: 'present',
          11: 'absent',
          13: 'present',
          16: 'excused',
          18: 'present',
          20: 'present',
          23: 'present',
          25: 'late',
          27: 'present',
          30: 'present',
        }}
      />
    </div>
  ),
};
