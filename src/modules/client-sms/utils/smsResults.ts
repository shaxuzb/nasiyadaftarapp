import type { BulkSmsResponse, SmsSendResult } from "../types";

export interface SmsIssueGroup {
  reason: string;
  count: number;
}

/**
 * Skipped and failed recipients grouped by the reason the backend gave, most
 * common first. A bulk send to fifty clients where thirty already had today's
 * SMS reads as one line — "Bugun yuborilgan · 30" — instead of thirty.
 */
export function groupSmsIssues(results: readonly SmsSendResult[]): SmsIssueGroup[] {
  const counts = new Map<string, number>();
  for (const result of results) {
    const reason = result.errorMessage?.trim();
    if (!reason) continue;
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  return [...counts]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

export type SmsResultTone = "success" | "error" | "info";

export function getBulkResultTone({
  sentCount,
  failedCount,
}: Pick<BulkSmsResponse, "sentCount" | "failedCount">): SmsResultTone {
  if (failedCount > 0) return "error";
  // Nothing went out and nothing failed: every recipient was skipped, most often
  // because they already had today's SMS. Calling that a success would mislead.
  if (sentCount === 0) return "info";
  return "success";
}
