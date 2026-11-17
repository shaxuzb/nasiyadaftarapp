import { useSyncExternalStore } from "react";

import { getCurrentNetworkStatus } from "../../../core/network/networkState";
import { isServerDown } from "./serverStatus";

/**
 * Parts of the app that only the server can serve (the inbox, SMS, plans,
 * video lessons…). Opened while the server cannot be used, they explain why
 * instead: no internet on the phone, or the server down with the internet
 * fine. Customers, debts, payments and reports keep working offline.
 */
export type ConnectionProblem = "noInternet" | "serverDown";

/** Screens that need the server. Customers, a customer and reports work offline. */
export const SERVER_ONLY_ROUTES: ReadonlySet<string> = new Set([
  "AccountSecurity",
  "BlacklistSettings",
  "ClientSms",
  "ClientSmsHistory",
  "DueClients",
  "History",
  "DeletedClient",
  "Staff",
  "SmsSettings",
  "Subscription",
  "PaymentHistory",
  "Notifications",
  "NotificationSettings",
  "VideoLessons",
]);

/** Sheets that need the server. */
export const SERVER_ONLY_SHEETS: ReadonlySet<string> = new Set([
  "blacklistOrganizations",
  "organizationCurrency",
  "organizationProfile",
  "paymentCheckout",
  "paymentDetail",
  "paymentStatus",
  "pendingPayments",
  "telegramBots",
]);

interface Notice {
  problem: ConnectionProblem;
  /**
   * What the action needs: the internet only (a write, which the server being
   * down only queues), or the server itself (a screen it serves).
   */
  needs: "internet" | "server";
  /** What the user tried, done once the server can be used again ("Qayta tekshirish"). */
  retry?: () => void;
}

let notice: Notice | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** What still stands in the way of what a notice was shown for; null when nothing. */
export function remainingProblem(needs: Notice["needs"]): ConnectionProblem | null {
  if (needs === "internet") return getCurrentNetworkStatus() === "offline" ? "noInternet" : null;
  return currentConnectionProblem();
}

/** Why the server cannot be used now; null when it can. */
export function currentConnectionProblem(): ConnectionProblem | null {
  if (getCurrentNetworkStatus() === "offline") return "noInternet";
  if (isServerDown()) return "serverDown";
  return null;
}

export function showConnectionNotice(
  problem: ConnectionProblem,
  retry?: () => void,
  needs: Notice["needs"] = "server",
): void {
  notice = { problem, retry, needs };
  emit();
}

export function hideConnectionNotice(): void {
  if (!notice) return;
  notice = null;
  emit();
}

/**
 * True when the server can be used now. Otherwise explains why (once, in the
 * notice) and returns false; `retry` is what to do if the user checks again
 * and it is back.
 */
export function requireServer(retry?: () => void): boolean {
  const problem = currentConnectionProblem();
  if (!problem) return true;
  showConnectionNotice(problem, retry);
  return false;
}

/**
 * True when the phone has internet. Otherwise asks to connect (the notice)
 * and returns false: debts and payments are not written with the internet
 * off; offline mode is only for the server being down.
 */
export function requireInternet(retry?: () => void): boolean {
  if (getCurrentNetworkStatus() !== "offline") return true;
  showConnectionNotice("noInternet", retry, "internet");
  return false;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => notice;

export function useConnectionNotice(): Notice | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
