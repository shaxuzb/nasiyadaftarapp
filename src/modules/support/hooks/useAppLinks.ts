import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useToast } from "../../../context/ToastContext";
import { queryKeys } from "../../../core/query/queryKeys";
import { getLocalizedApiErrorMessage, useTranslation } from "../../../i18n";
import {
  fetchAppLinks,
  getRememberedAppLinks,
  openExternalLink,
  readCachedAppLinks,
} from "../services/appLinksService";
import { DEFAULT_APP_LINKS, type AppLink } from "../utils/appLinks";

// Links change rarely; one request per half hour of use is plenty.
const STALE_TIME_MS = 30 * 60 * 1000;

/**
 * The links to show, best source first: the server's answer, then the list
 * saved from the last successful request, then the ones bundled with the app.
 * It always returns a list, so no screen has to draw a loading or error state
 * for something as small as a row of links.
 */
export function useAppLinks(): readonly AppLink[] {
  const [cached, setCached] = useState(getRememberedAppLinks);
  const query = useQuery({
    queryKey: queryKeys.appLinks(),
    queryFn: fetchAppLinks,
    staleTime: STALE_TIME_MS,
    retry: 1,
  });

  useEffect(() => {
    if (cached) return;
    let active = true;
    void readCachedAppLinks().then((links) => {
      if (active && links) setCached(links);
    });
    return () => {
      active = false;
    };
  }, [cached]);

  return query.data ?? cached ?? DEFAULT_APP_LINKS;
}

/**
 * Opens a link, reporting a failure as a toast.
 *
 * `openingKey` names the link being handed to the OS rather than being a plain
 * boolean, so a row can show its own spinner without the others reacting. The
 * ref guard means a second tap while the first is still resolving is dropped
 * instead of queueing another `Linking.openURL`.
 */
export function useLinkOpener() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const openingRef = useRef(false);

  const open = useCallback(
    async (link: Pick<AppLink, "key" | "url">) => {
      if (openingRef.current) return;

      openingRef.current = true;
      setOpeningKey(link.key);
      try {
        await openExternalLink(link.url);
      } catch (error) {
        showToast(
          getLocalizedApiErrorMessage(error, "support.linkOpenError", t),
          "error",
        );
      } finally {
        openingRef.current = false;
        setOpeningKey(null);
      }
    },
    [showToast, t],
  );

  return { openingKey, open };
}
