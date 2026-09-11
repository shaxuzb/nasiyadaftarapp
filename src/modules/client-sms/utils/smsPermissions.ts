import type { CurrentSubscription } from "../../subscription/types";

export const CLIENT_SMS_PERMISSIONS = {
  view: "CLIENT_SMS_VIEW",
  sendOne: "CLIENT_SMS_SEND",
  sendBulk: "CLIENT_SMS_BULK_SEND",
  history: "CLIENT_SMS_HISTORY_VIEW",
} as const;

export function getClientSmsCapabilities(
  permissions?: string[],
  subscription?: CurrentSubscription,
) {
  const values = new Set(permissions ?? []);
  const smsAvailable =
    !subscription ||
    subscription.sms.totalRemaining === null ||
    subscription.sms.totalRemaining > 0;
  return {
    canView: values.has(CLIENT_SMS_PERMISSIONS.view),
    canSendOne: values.has(CLIENT_SMS_PERMISSIONS.sendOne) && smsAvailable,
    canSendBulk: values.has(CLIENT_SMS_PERMISSIONS.sendBulk) && smsAvailable,
    canViewHistory: values.has(CLIENT_SMS_PERMISSIONS.history),
  };
}
