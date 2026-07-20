import { createClient, createClientTransaction } from '../services/clientsApi';

interface SeedTx {
  type: 'debt' | 'payment';
  amount: number;
  daysAgo: number;
  note?: string;
}

interface SeedCustomer {
  firstName: string;
  lastName: string;
  phone: string;
  note?: string;
  transactions: SeedTx[];
}

// Unique suffix to avoid phone conflicts on repeated seeding
function uniquePhone(base: string): string {
  const suffix = String(Date.now()).slice(-4);
  return base.slice(0, -4) + suffix;
}

function dateFromDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const SEED_CUSTOMERS: SeedCustomer[] = [
  {
    firstName: 'Alisher',
    lastName: 'Karimov',
    phone: '+998901110001',
    note: "Do'kon mijozi",
    transactions: [
      { type: 'debt',    amount: 500_000, daysAgo: 45, note: 'Oylik nasiya' },
      { type: 'payment', amount: 100_000, daysAgo: 30, note: "Qisman to'lov" },
    ],
  },
  {
    firstName: 'Dilnoza',
    lastName: 'Yusupova',
    phone: '+998901110002',
    transactions: [
      { type: 'debt',    amount: 300_000, daysAgo: 20 },
      { type: 'payment', amount: 150_000, daysAgo: 10 },
    ],
  },
  {
    firstName: 'Bobur',
    lastName: 'Toshmatov',
    phone: '+998901110003',
    note: 'Doimiy mijoz',
    transactions: [
      { type: 'debt', amount: 750_000, daysAgo: 60 },
      { type: 'debt', amount: 250_000, daysAgo: 40, note: "Qo'shimcha nasiya" },
    ],
  },
  {
    firstName: 'Sarvinoz',
    lastName: 'Rahimova',
    phone: '+998901110004',
    transactions: [
      { type: 'debt',    amount: 200_000, daysAgo: 15 },
      { type: 'payment', amount: 200_000, daysAgo: 5, note: "To'liq to'landi" },
    ],
  },
  {
    firstName: 'Jasur',
    lastName: 'Mirzayev',
    phone: '+998901110005',
    note: 'Mahalla yaqinidan',
    transactions: [
      { type: 'debt',    amount: 450_000, daysAgo: 35 },
      { type: 'payment', amount: 50_000,  daysAgo: 20 },
    ],
  },
  {
    firstName: 'Malika',
    lastName: 'Abdullayeva',
    phone: '+998901110006',
    transactions: [
      { type: 'debt', amount: 100_000, daysAgo: 25 },
    ],
  },
  {
    firstName: 'Ulugbek',
    lastName: 'Xolmatov',
    phone: '+998901110007',
    note: 'VIP mijoz',
    transactions: [
      { type: 'debt',    amount: 600_000, daysAgo: 50 },
      { type: 'payment', amount: 200_000, daysAgo: 35 },
      { type: 'payment', amount: 100_000, daysAgo: 12 },
    ],
  },
];

export async function seedDemoData(
  onProgress?: (msg: string) => void,
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;

  for (const seed of SEED_CUSTOMERS) {
    onProgress?.(`${seed.firstName} ${seed.lastName} qo'shilmoqda…`);

    let customerId: number;
    try {
      const phone = uniquePhone(seed.phone);
      const customer = await createClient({
        firstName: seed.firstName,
        lastName: seed.lastName,
        phoneNumber: phone,
        note: seed.note ?? '',
      });
      customerId = customer.id;
      added++;
    } catch {
      skipped++;
      continue;
    }

    for (const tx of seed.transactions) {
      try {
        await createClientTransaction(customerId, {
          type: tx.type,
          amount: tx.amount,
          date: dateFromDaysAgo(tx.daysAgo),
          note: tx.note ?? '',
        });
      } catch {
        // transaction failure is non-critical; continue
      }
    }
  }

  return { added, skipped };
}
