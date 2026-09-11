import { useCallback, useRef, useState } from "react";

import { useToast } from "../../../context/ToastContext";
import { getLocalizedApiErrorMessage, useTranslation } from "../../../i18n";
import { openAdminTelegram } from "../services/adminContactService";

export function useAdminContact() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [isOpening, setIsOpening] = useState(false);
  const openingRef = useRef(false);

  const openAdminContact = useCallback(async () => {
    if (openingRef.current) return;

    openingRef.current = true;
    setIsOpening(true);
    try {
      await openAdminTelegram();
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "common.adminContactError", t),
        "error",
      );
    } finally {
      openingRef.current = false;
      setIsOpening(false);
    }
  }, [showToast, t]);

  return { isOpening, openAdminContact };
}
