export const CLIENT_SMS_PERMISSIONS = {
  view: "CLIENT_SMS_VIEW",
  sendOne: "CLIENT_SMS_SEND",
  sendBulk: "CLIENT_SMS_BULK_SEND",
  history: "CLIENT_SMS_HISTORY_VIEW",
} as const;

export function getClientSmsCapabilities(permissions?: string[]) {
  const values = new Set(permissions ?? []);
  return {
    canView: values.has(CLIENT_SMS_PERMISSIONS.view),
    canSendOne: values.has(CLIENT_SMS_PERMISSIONS.sendOne),
    canSendBulk: values.has(CLIENT_SMS_PERMISSIONS.sendBulk),
    canViewHistory: values.has(CLIENT_SMS_PERMISSIONS.history),
  };
}
