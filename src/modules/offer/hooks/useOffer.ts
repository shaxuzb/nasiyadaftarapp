import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { queryKeys, type QueryScope } from "../../../core/query/queryKeys";
import { getOffer, getOfferStatus } from "../services/offerService";
import { getOrganizationOfferConsent } from "../utils/offer";

// What the offer is changes rarely, so one answer serves every form opened in
// the next few minutes. One retry only: a form waits for this answer.
export function useOffer(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.offer(),
    queryFn: ({ signal }) => getOffer(signal),
    enabled: Boolean(user) && enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * Where the signed-in user stands with the offer.
 *
 * `scope` keeps the callers apart: the app-wide gate asks per organization the
 * user enters, so it never acts on an answer from before that organization
 * existed, and the "new organization" form has its own.
 */
export function useOfferStatus(scope: QueryScope, enabled = true) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: queryKeys.offerStatus(userId ?? "anonymous", scope),
    queryFn: ({ signal }) => getOfferStatus(signal),
    enabled: userId !== null && enabled,
    staleTime: 0,
    retry: 1,
  });
}

interface UseOrganizationOfferOptions {
  /**
   * The user may already have organizations, and so may already have accepted
   * the offer: find out, and do not ask again if so.
   */
  checkAccepted: boolean;
  /** Off while the form is not on screen, so nothing is fetched for nothing. */
  enabled?: boolean;
}

/** What a "create organization" form shows and sends about the offer. */
export function useOrganizationOffer({
  checkAccepted,
  enabled = true,
}: UseOrganizationOfferOptions) {
  const offerQuery = useOffer(enabled);
  const info = offerQuery.data;
  const statusQuery = useOfferStatus(
    "organization-form",
    enabled && checkAccepted && info?.enabled === true,
  );
  const status = statusQuery.data;

  const consent = useMemo(
    () => getOrganizationOfferConsent(info, status),
    [info, status],
  );
  // The first answers are still on their way. The form waits for them, so an
  // organization is not created a moment before the checkbox appears.
  const isLoading =
    (offerQuery.isFetching && info === undefined) ||
    (statusQuery.isFetching && status === undefined);

  return { consent, isLoading };
}
