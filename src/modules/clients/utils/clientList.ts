interface CustomerCountLabelOptions {
  visibleCount: number;
  serverCount: number;
  query: string;
  debtorOnly: boolean;
}

export function getClientResultCount(
  value: unknown,
  resultsLength: number,
): number {
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : resultsLength;
}

export function getCustomerCountLabel({
  visibleCount,
  serverCount,
  query,
  debtorOnly,
}: CustomerCountLabelOptions): string {
  if (debtorOnly) {
    return `${visibleCount} ta qarzdor mijoz`;
  }

  return query.trim() ? `${serverCount} ta natija` : `${visibleCount} ta mijoz`;
}
