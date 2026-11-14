import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookOpen, Calendar, Clock, User } from 'lucide-react';
import { ListItem, Section } from './section.js';

const meta = {
  title: 'ui-tg/Section',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Simple: Story = {
  render: () => (
    <Section>
      <ListItem title="Ingliz tili (IELTS)" subtitle="Boshlangʻich guruh" />
    </Section>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Section>
      <ListItem
        before={<BookOpen className="size-5" aria-hidden />}
        title="Matematika (Asosiy)"
        subtitle="16 ta oʻquvchi"
      />
    </Section>
  ),
};

export const WithValue: Story = {
  render: () => (
    <Section>
      <ListItem
        before={<Calendar className="size-5" aria-hidden />}
        title="Dars vaqti"
        after="14:00 – 15:30"
      />
    </Section>
  ),
};

export const WithChevron: Story = {
  render: () => (
    <Section>
      <ListItem
        before={<User className="size-5" aria-hidden />}
        title="Ali Valiyev"
        subtitle="Davomat: 95%"
        chevron
        onClick={() => undefined}
      />
    </Section>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Section>
      <ListItem
        before={<Clock className="size-5" aria-hidden />}
        title="Arxivlangan dars jadvali"
        subtitle="Ushbu maʼlumotni oʻzgartirib boʻlmaydi"
        chevron
        disabled
        onClick={() => undefined}
      />
    </Section>
  ),
};

export const LongText: Story = {
  render: () => (
    <Section>
      <ListItem
        before={<BookOpen className="size-5" aria-hidden />}
        title="Juda uzun kurs nomi: Chuqurlashtirilgan akademik ingliz tili va xalqaro standartlar boʻyicha grammatika kursi"
        subtitle="Ushbu dars uchun qoʻshimcha vazifalar, uy ishlari va mustaqil oʻrganish uchun tavsiya etilgan barcha adabiyotlar roʻyxati"
        chevron
        onClick={() => undefined}
      />
    </Section>
  ),
};

export const FullSection: Story = {
  render: () => (
    <Section
      title="Guruh maʼlumotlari"
      footer="Darslar haftasiga 3 marta (Dushanba, Chorshanba, Juma) boʻlib oʻtadi."
    >
      <ListItem
        before={<BookOpen className="size-5" aria-hidden />}
        title="IELTS Intensive"
        after="Xona 204"
      />
      <ListItem
        before={<User className="size-5" aria-hidden />}
        title="Jamshid Qodirov"
        subtitle="Asosiy ustoz"
        chevron
        onClick={() => undefined}
      />
      <ListItem
        before={<Clock className="size-5" aria-hidden />}
        title="Davomiyligi"
        after="80 daqiqa"
      />
    </Section>
  ),
};
