/**
 * What one SMS costs in a package, in whole so'm, so packages of different
 * sizes can be compared at a glance. Null when it cannot be worked out: a
 * package with no SMS in it, or a free one.
 *
 * This is the app's own arithmetic on the two numbers the server sends, shown
 * with "≈" because it is rounded.
 */
export function getPricePerSms(item: {
  price: number;
  smsCount: number;
}): number | null {
  if (
    !Number.isFinite(item.price) ||
    !Number.isFinite(item.smsCount) ||
    item.price <= 0 ||
    item.smsCount <= 0
  ) {
    return null;
  }
  // Below one so'm rounding would say "0", which reads as free.
  const perSms = Math.round(item.price / item.smsCount);
  return perSms >= 1 ? perSms : null;
}
