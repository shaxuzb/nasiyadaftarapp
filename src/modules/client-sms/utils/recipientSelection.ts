export interface SmsRecipientEligibility {
  id: number;
  canSend: boolean;
  phone: string;
}

export function isSmsRecipientSelectable(
  item: SmsRecipientEligibility,
): boolean {
  return item.canSend && Boolean(item.phone.trim());
}

export function toggleRecipientSelection(selection: Set<number>, id: number) {
  const next = new Set(selection);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function selectEligibleRecipients(
  items: SmsRecipientEligibility[],
) {
  return new Set(
    items.filter(isSmsRecipientSelectable).map((item) => item.id),
  );
}

/**
 * The recipients with the given clients marked as having had today's SMS.
 * Returns the same array when none of them is on this page, so an untouched
 * cached page keeps its identity and nothing re-renders for it.
 */
export function markRecipientsSentToday<
  T extends { id: number; canSend: boolean; smsSentToday: boolean },
>(recipients: T[], ids: ReadonlySet<number>): T[] {
  if (!recipients.some((recipient) => ids.has(recipient.id))) return recipients;
  return recipients.map((recipient) =>
    ids.has(recipient.id)
      ? { ...recipient, smsSentToday: true, canSend: false }
      : recipient,
  );
}

export function reconcileRecipientSelection(
  _selection: Set<number>,
  _visible: Set<number>,
) {
  return new Set<number>();
}
