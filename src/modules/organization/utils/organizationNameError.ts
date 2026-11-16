import { getApiErrorUserMessage } from "../../../i18n/apiErrors";
import { getApiErrorStatus } from "../../../utils/apiError";

/**
 * The server's reason a shop's name was refused, to show under the name
 * field: creating or renaming a shop answers 400 with a sentence for the user
 * when the name is a bank's, a microfinance company's or a payment system's
 * ("Kapitalbank", "Payme"...). Null for any other failure, which stays a toast.
 */
export function getOrganizationNameError(error: unknown): string | null {
  if (getApiErrorStatus(error) !== 400) return null;
  return getApiErrorUserMessage(error);
}
