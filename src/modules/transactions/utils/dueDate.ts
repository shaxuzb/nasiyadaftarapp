/**
 * Which debts are still unpaid, and so whose return date still matters.
 *
 * The server keeps one balance per customer, not one per debt, so a payment is
 * taken to pay off the oldest debts first (as a shop counts it). A debt left
 * with something unpaid keeps its return date; one paid off no longer has a
 * date to keep. Pure: no React Native, so it is tested on its own.
 */

export interface DueTransaction {
  id: number;
  type: "debt" | "payment";
  amount: number;
  date: string;
  dueDate?: string | null;
}

export interface NextDue {
  /** "YYYY-MM-DD", the earliest return date of a debt not yet paid off. */
  dueDate: string;
  /** What is still unpaid of the debts due that day. */
  amount: number;
  /** Days from today: negative once passed, 0 today. */
  days: number;
}

function byOldest(a: DueTransaction, b: DueTransaction) {
  return a.date.localeCompare(b.date) || a.id - b.id;
}

/** What is still unpaid of each debt, by id; paid-off debts are left out. */
export function unpaidDebts(transactions: readonly DueTransaction[]): Map<number, number> {
  const ordered = [...transactions].sort(byOldest);
  let paid = ordered.reduce((sum, tx) => (tx.type === "payment" ? sum + tx.amount : sum), 0);
  const unpaid = new Map<number, number>();
  for (const tx of ordered) {
    if (tx.type !== "debt") continue;
    const covered = Math.min(paid, tx.amount);
    paid -= covered;
    const left = tx.amount - covered;
    if (left > 0.000001) unpaid.set(tx.id, left);
  }
  return unpaid;
}

/** Whole days from `from` to `to`, both "YYYY-MM-DD". */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** The nearest return date still owed, or null when nothing dated is unpaid. */
export function findNextDue(
  transactions: readonly DueTransaction[],
  today: string,
): NextDue | null {
  const unpaid = unpaidDebts(transactions);
  let next: NextDue | null = null;
  for (const tx of transactions) {
    const left = unpaid.get(tx.id);
    if (tx.type !== "debt" || !tx.dueDate || left === undefined) continue;
    if (!next || tx.dueDate < next.dueDate) {
      next = { dueDate: tx.dueDate, amount: left, days: daysBetween(today, tx.dueDate) };
    } else if (tx.dueDate === next.dueDate) {
      next.amount += left;
    }
  }
  return next;
}
