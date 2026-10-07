import { useCallback, useRef, useState } from "react";

import { useToast } from "../../../context/ToastContext";
import { getLocalizedApiErrorMessage, useTranslation } from "../../../i18n";
import { openExternalLink } from "../services/appLinksService";
import { DEFAULT_APP_LINKS, findAppLink } from "../utils/appLinks";
import { useAppLinks } from "./useAppLinks";

const SUPPORT_LINK_KEY = "support";

export function useAdminContact() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const links = useAppLinks();
  const [isOpening, setIsOpening] = useState(false);
  const openingRef = useRef(false);
  // A list without a support entry must not leave this button dead: it is the
  // only way to reach a person from the login and subscription screens.
  const supportUrl = (
    findAppLink(links, SUPPORT_LINK_KEY) ??
    findAppLink(DEFAULT_APP_LINKS, SUPPORT_LINK_KEY)
  )?.url;

  const openAdminContact = useCallback(async () => {
    if (openingRef.current || !supportUrl) return;

    openingRef.current = true;
    setIsOpening(true);
    try {
      await openExternalLink(supportUrl);
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "common.adminContactError", t),
        "error",
      );
    } finally {
      openingRef.current = false;
      setIsOpening(false);
    }
  }, [showToast, supportUrl, t]);

  return { isOpening, openAdminContact };
}
