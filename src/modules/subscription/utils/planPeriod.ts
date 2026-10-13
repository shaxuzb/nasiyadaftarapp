/**
 * Whether a plan's price is for one month, so the price can say "/ oy".
 *
 * The server gives the length in days. A month is 28 to 31 of them; anything
 * else (a quarter, a year, or no length at all) gets no period label rather
 * than a wrong one.
 */
export function isMonthlyPlan(durationDays: number | null | undefined): boolean {
  return (
    typeof durationDays === "number" && durationDays >= 28 && durationDays <= 31
  );
}
