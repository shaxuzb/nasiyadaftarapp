export function toggleRecipientSelection(selection: Set<number>, id: number) {
  const next = new Set(selection);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function selectEligibleRecipients(
  items: Array<{ id: number; canSend: boolean }>,
) {
  return new Set(items.filter((item) => item.canSend).map((item) => item.id));
}

export function reconcileRecipientSelection(
  _selection: Set<number>,
  _visible: Set<number>,
) {
  return new Set<number>();
}
