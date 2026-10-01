// The longest amount the backend's integer column accepts with room to spare.
const MAX_AMOUNT_DIGITS = 13;

/**
 * Groups digits in threes as the user types — "1500000" becomes "1 500 000".
 * Mirrors the formatter private to TransactionSheet, which its contract check
 * tests in place; keep the two in step.
 */
export function formatAmountInput(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, MAX_AMOUNT_DIGITS)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** The whole-sum amount behind a formatted input, or null when there is none. */
export function parseAmountInput(value: string): number | null {
  const amount = Number(value.replace(/\D/g, ""));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}
