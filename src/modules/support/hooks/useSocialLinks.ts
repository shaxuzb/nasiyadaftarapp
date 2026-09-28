import { useCallback, useRef, useState } from "react";

import { useToast } from "../../../context/ToastContext";
import { getLocalizedApiErrorMessage, useTranslation } from "../../../i18n";
import {
  openInstagramProfile,
  openTelegramCommunity,
} from "../services/socialLinksService";

export type SocialLink = "instagram" | "community";

const OPENERS: Record<SocialLink, () => Promise<void>> = {
  instagram: openInstagramProfile,
  community: openTelegramCommunity,
};

const ERROR_KEYS = {
  instagram: "support.instagramError",
  community: "support.communityError",
} as const;

/**
 * Opens one of the public profiles, reporting a failure as a toast.
 *
 * `opening` names the link being handed to the OS rather than being a plain
 * boolean, so a row can show its own spinner without the other row reacting.
 * The ref guard means a second tap while the first is still resolving is
 * dropped instead of queueing another `Linking.openURL`.
 */
export function useSocialLinks() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [opening, setOpening] = useState<SocialLink | null>(null);
  const openingRef = useRef(false);

  const open = useCallback(
    async (link: SocialLink) => {
      if (openingRef.current) return;

      openingRef.current = true;
      setOpening(link);
      try {
        await OPENERS[link]();
      } catch (error) {
        showToast(getLocalizedApiErrorMessage(error, ERROR_KEYS[link], t), "error");
      } finally {
        openingRef.current = false;
        setOpening(null);
      }
    },
    [showToast, t],
  );

  return { opening, open };
}
