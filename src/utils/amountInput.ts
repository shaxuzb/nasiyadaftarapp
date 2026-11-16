// The longest whole part the backend's amount column accepts with room to spare.
const MAX_AMOUNT_DIGITS = 13;
const MAX_FRACTION_DIGITS = 2;

/**
 * Groups digits in threes as the user types — "1500000" becomes "1 500 000".
 * With `allowFraction` (every currency but the sum) one decimal comma is
 * kept, with at most two digits after it: "120,5", "1 200,50". A point typed
 * on a keyboard that has one becomes the comma.
 */
export function formatAmountInput(value: string, allowFraction = false): string {
  const separator = allowFraction ? value.search(/[.,]/) : -1;
  const wholeText = separator >= 0 ? value.slice(0, separator) : value;
  const whole = wholeText
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, MAX_AMOUNT_DIGITS)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (separator < 0) return whole;
  const fraction = value.slice(separator + 1).replace(/\D/g, "").slice(0, MAX_FRACTION_DIGITS);
  return `${whole || "0"},${fraction}`;
}

/**
 * The amount behind a formatted input, or null when there is none: whole
 * for the sum, to the cent for the others ("120,50" → 120.5).
 */
export function parseAmountInput(value: string): number | null {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const amount = Math.round(Number(normalized) * 100) / 100;
  return Number.isFinite(amount) && amount > 0 && amount <= Number.MAX_SAFE_INTEGER ? amount : null;
}
