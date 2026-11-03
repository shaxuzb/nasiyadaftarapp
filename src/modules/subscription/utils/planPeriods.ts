/**
 * How long a plan is bought for, and at what price.
 *
 * The plans API lists, for each plan, the terms it is sold in:
 *
 *   "periods": [
 *     { "months": 1, "price": 10000, "oldPrice": null,  "discountPercent": null, "monthlyPrice": 10000 },
 *     { "months": 3, "price": 27000, "oldPrice": 30000, "discountPercent": 10,   "monthlyPrice": 9000 },
 *   ]
 *
 * A server that does not send them yet sells one month at the plan's own
 * price, which is what the app falls back to.
 */
export interface SubscriptionPlanPeriod {
  months: number;
  /** What is charged for the whole term. */
  price: number;
  /** The price before the discount, for display only. */
  oldPrice: number | null;
  /** The discount as the server states it, for display only. */
  discountPercent: number | null;
  /** What the term works out to per month, as the server states it. */
  monthlyPrice: number;
}

/** What is bought when nobody chose a term: the server's own default too. */
export const DEFAULT_PERIOD_MONTHS = 1;

/**
 * The term with this many months, or the default one when the plan does not
 * sell it (a stale choice, or none made).
 */
export function getPlanPeriod(
  periods: readonly SubscriptionPlanPeriod[],
  months?: number | null,
): SubscriptionPlanPeriod | null {
  return (
    periods.find((period) => period.months === months) ??
    periods.find((period) => period.months === DEFAULT_PERIOD_MONTHS) ??
    periods[0] ??
    null
  );
}
