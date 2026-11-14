import type { Translate } from "../../../i18n/translate";
import { getOutboxOperations } from "../db/outboxRepository";

/**
 * The sign-out question, with a line about writes still on the phone. They
 * stay there, tied to this account, and are sent when it signs in again.
 */
export function withUnsentWarning(message: string, t: Translate): string {
  const count = getOutboxOperations().length;
  return count > 0 ? `${message}\n\n${t("offline.logoutPending", { count })}` : message;
}
