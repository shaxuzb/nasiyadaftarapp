import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { TERMS_OF_SERVICE_URL } from "../../../config/legalLinks";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { queryKeys } from "../../../core/query/queryKeys";
import { useTranslation } from "../../../i18n";
import {
  getApiErrorUserMessage,
  getLocalizedApiErrorMessage,
} from "../../../i18n/apiErrors";
import { getApiErrorStatus } from "../../../utils/apiError";
import { useAppLock } from "../../pin-auth/context/AppLockContext";
import { openExternalLink } from "../../support/services/appLinksService";
import { useOfferStatus } from "../hooks/useOffer";
import { acceptOffer } from "../services/offerService";
import { OfferAcceptanceModal } from "./OfferAcceptanceModal";

// An app left open for days still learns that the offer changed: the status
// is asked again when the app comes to the front, but not more often than this.
const RECHECK_AFTER_MS = 30 * 60_000;

/**
 * Asks a user who already works in an organization to accept the public offer
 * when the server says they must: people who registered before the offer
 * existed, and everyone after the offer changes.
 *
 * The status is asked once the user is inside an organization. If it cannot
 * be fetched, nothing is shown: the app does not lock people out on a guess.
 */
export function OfferAcceptanceGate() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user, currentOrganization, isBootstrapping, logout } = useAuth();
  const { isResolving, isLocked, setupRequired } = useAppLock();
  const userId = user?.id ?? null;
  const organizationId = currentOrganization?.id ?? null;
  const inOrganization =
    userId !== null && organizationId !== null && !isBootstrapping;

  const statusQuery = useOfferStatus(organizationId ?? "none", inOrganization);
  const status = statusQuery.data;
  const { refetch, dataUpdatedAt } = statusQuery;

  const acceptingRef = useRef(false);
  const [accepting, setAccepting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dataUpdatedAtRef = useRef(dataUpdatedAt);
  dataUpdatedAtRef.current = dataUpdatedAt;

  useEffect(() => {
    if (!inOrganization) return undefined;

    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener("change", (nextState) => {
      const cameBack = nextState === "active" && previousState !== "active";
      previousState = nextState;
      if (!cameBack) return;
      if (Date.now() - dataUpdatedAtRef.current < RECHECK_AFTER_MS) return;
      void refetch();
    });
    return () => subscription.remove();
  }, [inOrganization, refetch]);

  // Messages belong to one user in one organization.
  useEffect(() => {
    setError(null);
    setNotice(null);
  }, [organizationId, userId]);

  const handleAccept = useCallback(async () => {
    if (acceptingRef.current || !status || userId === null) return;
    if (organizationId === null) return;

    acceptingRef.current = true;
    setAccepting(true);
    setError(null);
    setNotice(null);
    try {
      const next = await acceptOffer(status.version);
      if (next) {
        queryClient.setQueryData(
          queryKeys.offerStatus(userId, organizationId),
          next,
        );
      } else {
        await refetch();
      }
    } catch (acceptError) {
      if (getApiErrorStatus(acceptError) === 409) {
        // The offer changed while this one was on screen. Fetch the new
        // status: the version to accept is now a different one.
        setNotice(getApiErrorUserMessage(acceptError) ?? t("offer.updated"));
        await refetch();
      } else {
        setError(getApiErrorUserMessage(acceptError) ?? t("offer.acceptError"));
      }
    } finally {
      acceptingRef.current = false;
      setAccepting(false);
    }
  }, [organizationId, queryClient, refetch, status, t, userId]);

  const handleRead = useCallback(() => {
    void openExternalLink(TERMS_OF_SERVICE_URL).catch(() => {
      setError(t("support.linkOpenError"));
    });
  }, [t]);

  // Reached only after the user said yes to "sign out?" inside the modal.
  // Ends the way signing out from the profile does: a toast once it is done
  // (the modal is gone by then, so the toast is visible), and a failure shown
  // in the card, where it can be seen.
  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    setError(null);
    setNotice(null);
    try {
      await logout();
      showToast(t("profile.logoutSuccess"), "success");
    } catch (logoutError) {
      setError(getLocalizedApiErrorMessage(logoutError, "profile.logoutError", t));
    } finally {
      setLoggingOut(false);
    }
  }, [logout, showToast, t]);

  // Never over the PIN screen: a modal is drawn above everything, and the PIN
  // comes first.
  const visible =
    inOrganization &&
    !isResolving &&
    !isLocked &&
    !setupRequired &&
    status?.mustAccept === true;

  return (
    <OfferAcceptanceModal
      visible={visible}
      title={status?.title ?? null}
      accepting={accepting}
      loggingOut={loggingOut}
      error={error}
      notice={notice}
      onRead={handleRead}
      onAccept={() => void handleAccept()}
      onLogout={() => void handleLogout()}
    />
  );
}
