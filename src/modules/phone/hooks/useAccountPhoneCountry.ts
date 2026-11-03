import { useMemo } from "react";

import { useAuth } from "../../../context/AuthContext";
import {
  countryOfStored,
  DEFAULT_PHONE_COUNTRY,
  type CountryCode,
} from "../utils/phoneNumber";

/**
 * The country a new phone field starts on: that of the account's own number.
 * Someone whose phone is American adds mostly American customers; Uzbekistan
 * when the account has no number yet (or before signing in).
 */
export function useAccountPhoneCountry(): CountryCode {
  const { user } = useAuth();
  const phoneNumber = user?.phoneNumber;
  return useMemo(
    () => countryOfStored(phoneNumber) ?? DEFAULT_PHONE_COUNTRY,
    [phoneNumber],
  );
}
