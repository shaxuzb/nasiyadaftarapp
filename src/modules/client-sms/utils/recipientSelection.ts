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

export function reconcileRecipientSelection(
  _selection: Set<number>,
  _visible: Set<number>,
) {
  return new Set<number>();
}
