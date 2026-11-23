import { createDb, closeDb } from '@lg/db';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

export const DEBT_RECORDS = [
  { code: 10003, fullName: 'Abdugapparova Rayhon', phone: '+998944748001', debt: 700000n },
  { code: 10004, fullName: 'Musurmonova Rayxona', phone: '+998941366671', debt: 600000n },
  { code: 10005, fullName: 'Xusenov Doniyor', phone: '+998975329684', debt: 600000n },
  { code: 10006, fullName: 'Ravshanov Shahboz', phone: '+998905227242', debt: 600000n },
  { code: 10007, fullName: 'Raxmatullayeva Shabnam', phone: '+998944646353', debt: 600000n },
  { code: 10008, fullName: 'Keldiyorov Fayoz', phone: '+998956732010', debt: 600000n },
  { code: 10009, fullName: 'Axmadov Azizbek', phone: '+998975325887', debt: 600000n },
  { code: 10010, fullName: "Ro'ziyev Ulug'bek", phone: '+998901955885', debt: 600000n },
  { code: 10011, fullName: "To'raqulova Mehrangiz", phone: '+998701324065', debt: 1000000n },
  { code: 10012, fullName: 'Abdurahmonov Azizbek', phone: '+998959770379', debt: 600000n },
  { code: 10013, fullName: 'Baxtiyorova Mahliyo', phone: '+998993396146', debt: 600000n },
  { code: 10014, fullName: 'Umirzakova Odina', phone: '+998995955483', debt: 1200000n },
  { code: 10015, fullName: 'Keldiyorov Fozil', phone: '+998883884707', debt: 600000n },
  { code: 10016, fullName: 'Mamatqulova Diana', phone: '+998991603078', debt: 1200000n },
  { code: 10017, fullName: 'Rafiqova Farxunda', phone: '+998973926168', debt: 0n },
  { code: 10018, fullName: 'Saidova Malak', phone: '+998995903129', debt: 1600000n },
  { code: 10019, fullName: 'Hamraqulova Dilshoda', phone: '+998979309705', debt: 700000n },
  { code: 10020, fullName: 'Yazdanov Azizbek', phone: '+998943304128', debt: 600000n },
];

export async function run(databaseUrl) {
  const db = createDb(databaseUrl);
  try {
    await db.transaction(async (tx) => {
      for (const item of DEBT_RECORDS) {
        // 1. Telefon raqamini yangilash
        await tx.execute(sql`
          UPDATE students 
          SET phone = ${item.phone}, updated_at = now() 
          WHERE code = ${item.code}
        `);

        // 2. Agar qarz bo'lsa, tizimdan oldingi qarz hisob-fakturasini ochish
        if (item.debt > 0n) {
          const studentRows = await tx.execute(sql`
            SELECT s.id, e.id as enrollment_id
            FROM students s
            JOIN enrollments e ON e.student_id = s.id
            WHERE s.code = ${item.code}
            LIMIT 1
          `);
          if (studentRows.length === 0) {
            throw new Error(`Student not found or no enrollment: ${item.code}`);
          }
          const { id: studentId, enrollment_id: enrollmentId } = studentRows[0];

          // Mavjud invoice bormi tekshirish
          const existing = await tx.execute(sql`
            SELECT id FROM invoices 
            WHERE student_id = ${studentId} AND period = '2026-10'
          `);
          if (existing.length > 0) {
            console.log(`Invoice already exists for ${item.code}, skipping`);
            continue;
          }

          const invoiceId = uuidv7();
          const lineId = uuidv7();

          // Invoices ga yozish
          await tx.execute(sql`
            INSERT INTO invoices (id, student_id, period, due_date, total, status, created_at, updated_at)
            VALUES (${invoiceId}, ${studentId}, '2026-10', '2026-10-10', ${item.debt}, 'open', now(), now())
          `);

          // Invoice lines ga yozish
          await tx.execute(sql`
            INSERT INTO invoice_lines (id, invoice_id, enrollment_id, kind, amount, description, created_at)
            VALUES (${lineId}, ${invoiceId}, ${enrollmentId}, 'tuition', ${item.debt}, 'Tizimdan oldingi qarz (2026-10)', now())
          `);

          // Ledger entries ga yozish
          await tx.execute(sql`
            INSERT INTO ledger_entries (id, student_id, entry_type, amount, ref_table, ref_id, occurred_at, created_at)
            VALUES (${uuidv7()}, ${studentId}, 'invoice', ${item.debt}, 'invoice_lines', ${lineId}, now(), now())
          `);

          // Audit log yozish
          await tx.execute(sql`
            INSERT INTO audit_logs (id, actor_id, actor_role, action, entity, entity_id, after, at)
            VALUES (
              ${uuidv7()}, 
              NULL, 
              NULL, 
              'billing.opening_debt', 
              'invoice', 
              ${invoiceId}, 
              ${JSON.stringify({ studentCode: item.code, period: '2026-10', total: item.debt.toString() })}, 
              now()
            )
          `);
        }
      }
    });

    console.log('SUCCESS: All 18 students updated with phones and opening debts.');
  } finally {
    await closeDb(db);
  }
}

await run(process.env.DATABASE_URL);
