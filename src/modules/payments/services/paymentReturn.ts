/**
 * Which order the user has just been sent out of the app to pay.
 *
 * The checkout sheet leaves the note right before it opens the provider's
 * page and then closes. When the app comes back to the foreground, whoever is
 * listening takes the note and shows that order's status. Taking it clears it,
 * so one trip out of the app leads to one status sheet.
 *
 * Memory only, on purpose: if the app is killed while the user is paying, the
 * stored pending payment brings the status sheet back on the next launch.
 */
let awaitedOrderId: number | null = null;

export function awaitPaymentReturn(orderId: number): void {
  awaitedOrderId = Number.isSafeInteger(orderId) && orderId > 0 ? orderId : null;
}

export function takeAwaitedPaymentReturn(): number | null {
  const orderId = awaitedOrderId;
  awaitedOrderId = null;
  return orderId;
}
