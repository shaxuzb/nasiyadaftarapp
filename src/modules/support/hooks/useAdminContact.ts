import { useCallback, useRef, useState } from "react";

import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../utils/apiError";
import { openAdminTelegram } from "../services/adminContactService";

export function useAdminContact() {
  const { showToast } = useToast();
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
        getApiErrorMessage(error, "Administrator bilan bog'lanib bo'lmadi"),
        "error",
      );
    } finally {
      openingRef.current = false;
      setIsOpening(false);
    }
  }, [showToast]);

  return { isOpening, openAdminContact };
}
