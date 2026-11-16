/**
 * Customers whose debt is due on a day (GET /api/clients/due), and the link a
 * "debt due" push carries. Pure: no React Native, so it is tested on its own.
 */

export interface DueClient {
  clientId: number;
  clientUuid: string | null;
  fullName: string;
  phoneNumber: string;
  /** What the customer owes now, all debts together. */
  currentBalance: number;
  /** What of it was to be paid back by `dueDate`. */
  dueAmount: number;
  /** "YYYY-MM-DD". */
  dueDate: string;
  currencyCode: string | null;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function finite(value: unknown): number | null {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** A "YYYY-MM-DD" day, or the day of a timestamp; null for anything else. */
export function readDay(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const day = value.slice(0, 10);
  return DAY.test(day) ? day : null;
}

export function parseDueClients(input: unknown): DueClient[] {
  const body = record(input);
  const list = Array.isArray(input)
    ? input
    : [body.results, body.items, body.data].find(Array.isArray) ?? [];
  const seen = new Set<number>();
  return (list as unknown[]).flatMap((value): DueClient[] => {
    const item = record(value);
    const clientId = finite(item.clientId ?? item.id);
    if (!clientId || clientId <= 0 || seen.has(clientId)) return [];
    seen.add(clientId);
    return [
      {
        clientId,
        clientUuid: text(item.clientUuid) || null,
        fullName: text(item.fullName).trim(),
        phoneNumber: text(item.phoneNumber),
        currentBalance: finite(item.currentBalance) ?? 0,
        dueAmount: finite(item.dueAmount) ?? 0,
        dueDate: readDay(item.dueDate) ?? "",
        currencyCode: text(item.currencyCode) || null,
      },
    ];
  });
}

/** Still owing: only they are worth a reminder. Largest debt first. */
export function sortDueClients(clients: readonly DueClient[]): DueClient[] {
  return clients
    .filter((client) => client.currentBalance > 0)
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        b.dueAmount - a.dueAmount ||
        a.fullName.localeCompare(b.fullName),
    );
}
