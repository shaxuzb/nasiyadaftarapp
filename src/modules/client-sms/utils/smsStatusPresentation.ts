import type { AppTheme } from "../../../types";

/**
 * One semantic status palette for recipients and history (light and dark).
 * Blue = queued, amber = processing, green = sent, red = failed,
 * neutral gray = cancelled/skipped. Status is display-only.
 */
export function getSmsStatusAppearance(status: string | null | undefined, theme: AppTheme) {
  switch (status?.trim().toLowerCase()) {
    case "sent":
    case "success":
      return { labelKey: "sms.statusSent" as const, color: theme.paymentColor, background: theme.paymentBg, icon: "checkmark-circle-outline" as const };
    case "queued":
      return { labelKey: "sms.statusQueued" as const, color: theme.primary, background: theme.primaryLight, icon: "time-outline" as const };
    case "pending":
      return { labelKey: "sms.statusPending" as const, color: theme.warningColor, background: theme.warningColor + "18", icon: "sync-outline" as const };
    case "failed":
    case "error":
      return { labelKey: "sms.statusFailed" as const, color: theme.dangerColor, background: theme.debtBg, icon: "close-circle-outline" as const };
    case "cancelled":
      return { labelKey: "sms.statusCancelled" as const, color: theme.textSecondary, background: theme.inputBackground, icon: "ban-outline" as const };
    case "skipped":
      return { labelKey: "sms.statusSkipped" as const, color: theme.textMuted, background: theme.inputBackground, icon: "remove-circle-outline" as const };
    default:
      return null;
  }
}

/** Compact and timezone-stable display for a server ISO datetime, e.g. 21.10. */
export function formatSmsShortDate(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(value);
  if (!match) return "";
  const month = Number(match[2]), day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return match[3] + "." + match[2];
}
