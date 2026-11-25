import { DEFAULT_SYSTEM_SETTINGS, type PaymentCard } from '@lg/contracts';
import type { Settings, StartState } from '../../data/staff-settings.js';

export const cards: PaymentCard[] = [
  {
    id: 'c1',
    cardNumber: '8600123412341234',
    holderName: 'Legendary Group',
    bankName: 'Kapitalbank',
    isPrimary: true,
  },
  {
    id: 'c2',
    cardNumber: '9860111122223333',
    holderName: 'Legendary Group',
    bankName: 'Hamkorbank',
    isPrimary: false,
  },
];

export const settings: Settings = {
  ...DEFAULT_SYSTEM_SETTINGS,
  penaltyConfig: { ...DEFAULT_SYSTEM_SETTINGS.penaltyConfig, penaltyPerLesson: '0' },
  paymentCards: cards,
};

export const start: StartState = {
  botUrl: 'https://t.me/legendary_bot',
  done: {
    center: true,
    cards: true,
    courses: true,
    rooms: false,
    teachers: false,
    groups: false,
    students: false,
  },
};
