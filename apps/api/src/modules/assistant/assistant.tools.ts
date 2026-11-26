import {
  ASSISTANT_SCREENS,
  AssistantPrefill,
  DEBTOR_BUCKETS,
  EXPENSE_CATEGORIES,
} from '@lg/contracts';
import { z } from 'zod';
import type { LlmTool } from './assistant.llm.js';

/** Telefon — faqat oxirgi 4 raqam (PII modelga to'liq ketmaydi). */
export const maskPhone = (p: string | null | undefined) =>
  p ? `***${p.replace(/\D/g, '').slice(-4)}` : null;

export const SearchInput = z.object({ query: z.string().trim().min(2).max(100) });
export const StudentInput = z.object({ student_id: z.uuid() });
export const DebtorsInput = z.object({
  bucket: z.enum(DEBTOR_BUCKETS).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});
export const ScreenInput = z.object({
  screen: z.enum(ASSISTANT_SCREENS),
  student_id: z.uuid().optional(),
  label: z.string().max(80).optional(),
  prefill: AssistantPrefill.optional(),
});
export const GroupsInput = z.object({ query: z.string().trim().max(60).optional() });
const IsoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const LessonsInput = z.object({ date: IsoDay.optional() });

const obj = (properties: Record<string, unknown>, required: string[]) => ({
  type: 'object' as const,
  properties,
  required,
  additionalProperties: false,
});

/** Yordamchi vositalari: hammasi o'qish; `open_screen` — tugma (forma oldindan to'ldirilishi mumkin). */
export const ASSISTANT_TOOLS: LlmTool[] = [
  {
    name: 'search_students',
    description:
      "O'quvchini ism, familiya, kod yoki telefon bo'yicha qidiradi. Natija: id, kod, ism, guruhlar, holat.",
    parameters: obj({ query: { type: 'string', description: 'Kamida 2 belgi' } }, ['query']),
  },
  {
    name: 'student_overview',
    description:
      "Bitta o'quvchi: guruhlari, qarzi/avansi (so'mda), ota-onalari (telefon yashirin). Avval search_students bilan id toping.",
    parameters: obj({ student_id: { type: 'string' } }, ['student_id']),
  },
  {
    name: 'today_summary',
    description:
      "Bugungi ko'rsatkichlar: tushum (bugun/kecha, so'm), davomat %, belgilanmagan darslar, kelmaganlar, chek navbati, tasdiqlash so'rovlari, umumiy qarz, faol o'quvchilar.",
    parameters: obj({}, []),
  },
  {
    name: 'list_debtors',
    description: "Qarzdorlar ro'yxati (eng katta qarz birinchi). bucket: muddati bo'yicha filtr.",
    parameters: obj(
      {
        bucket: { type: 'string', enum: [...DEBTOR_BUCKETS] },
        limit: { type: 'integer', minimum: 1, maximum: 20 },
      },
      [],
    ),
  },
  {
    name: 'list_groups',
    description:
      "Guruhlar: nomi, kursi, ustozi, oylik narxi (so'm), xonasi va jadvali (hafta kunlari, vaqt). query — nom bo'yicha filtr.",
    parameters: obj({ query: { type: 'string' } }, []),
  },
  {
    name: 'day_lessons',
    description:
      "Bir kunning darslari: vaqt, guruh, ustoz, xona, holat (o'tdi/bekor/rejada). date — YYYY-MM-DD; berilmasa bugun. Javobda bugungi sana ham bor («ertaga», «dushanba» kabi kunlarni shu bilan hisoblang).",
    parameters: obj({ date: { type: 'string', description: 'YYYY-MM-DD' } }, []),
  },
  {
    name: 'open_screen',
    description:
      "Foydalanuvchiga ilova ekranini ochadigan tugma qo'shadi. Har qanday o'zgartirish faqat shu yo'l bilan: forma ochiladi, foydalanuvchi tekshirib o'zi tasdiqlaydi. 'student' va 'pay' uchun student_id shart. prefill — formani oldindan to'ldirish: pay → amount; newStudent → fullName, phone, guardianName, guardianPhone; addExpense → amount, category, note. amount — so'mda faqat raqamlar («500 ming» → \"500000\"). Foydalanuvchi aytmagan qiymatni to'ldirmang.",
    parameters: obj(
      {
        screen: { type: 'string', enum: [...ASSISTANT_SCREENS] },
        student_id: { type: 'string' },
        label: { type: 'string', description: "Tugmadagi qisqa izoh, masalan o'quvchi ismi" },
        prefill: {
          type: 'object',
          properties: {
            amount: { type: 'string', description: "So'm, faqat raqamlar" },
            fullName: { type: 'string' },
            phone: { type: 'string' },
            guardianName: { type: 'string' },
            guardianPhone: { type: 'string' },
            category: { type: 'string', enum: [...EXPENSE_CATEGORIES] },
            note: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      ['screen'],
    ),
  },
];
