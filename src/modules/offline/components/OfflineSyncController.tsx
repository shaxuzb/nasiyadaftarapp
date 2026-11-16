import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { useNetworkStatus } from "../../../core/network/NetworkProvider";
import { invalidateClientDomain } from "../../../core/query/clientInvalidation";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys } from "../../../core/query/queryKeys";
import { getAuthSessionSync } from "../../../services/authStorage";
import { getOutboxOperations, loadOutbox, useOutbox } from "../db/outboxRepository";
import { isServerDown, requestHealthCheck, useIsServerDown } from "../state/serverStatus";
import { onSyncRequested, setSyncing } from "../state/syncStatus";
import { runSync } from "../sync/syncEngine";
import { retryDelayMs } from "../sync/syncParsing";

/** A new write is sent after this pause, so a few made together go as one request. */
const SEND_AFTER_MS = 1_500;
/** Coming back to the app asks for the organization's changes at most this often. */
const PULL_AT_MOST_EVERY_MS = 60_000;

const hasPending = () => getOutboxOperations().some((operation) => operation.status === "pending");

interface RoundRequest {
  /** Also bring in the organization's changes. */
  pull: boolean;
  /** Afterwards, every screen on view asks the server again (it was down). */
  refresh: boolean;
}

/**
 * Keeps the phone and the server in step, in the background. A round sends
 * the queued writes first, then brings in the organization's changes. It
 * runs on sign-in, when the server is back (then the screens are refreshed
 * too, after the queue, so nothing is counted twice), when the connection
 * or the app comes back, and soon after a write is queued.
 *
 * While the server is down no round is tried: ServerHealthMonitor asks
 * GET /health and its answer starts the next round. A round that failed for
 * another reason (the server answered with an error) is tried again later,
 * less and less often. A round asked for while one runs is never lost: it
 * runs right after. Renders nothing.
 */
export function OfflineSyncController() {
  const { user, currentOrganization } = useAuth();
  const { status } = useNetworkStatus();
  const queryClient = useQueryClient();
  const outbox = useOutbox();
  const serverDown = useIsServerDown();

  const userId = user?.id ?? null;
  const { scope, enabled } = getOrganizationQueryScope(userId, currentOrganization?.id);
  const organizationId = enabled && typeof scope === "number" ? scope : null;

  const latest = useRef({ userId, organizationId, offline: status === "offline" });
  latest.current = { userId, organizationId, offline: status === "offline" };
  const failures = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPullAt = useRef(0);
  const running = useRef(false);
  const next = useRef<RoundRequest | null>(null);

  const clearRetry = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
  };

  const run = useCallback(
    async (request: RoundRequest) => {
      const { userId: forUser, organizationId: forOrganization, offline } = latest.current;
      if (forUser === null || forOrganization === null || offline) return;
      if (running.current) {
        next.current = {
          pull: request.pull || Boolean(next.current?.pull),
          refresh: request.refresh || Boolean(next.current?.refresh),
        };
        return;
      }
      running.current = true;
      clearRetry();
      setSyncing(true);
      let outcome;
      try {
        outcome = await runSync({
          userId: forUser,
          organizationId: forOrganization,
          deviceId: getAuthSessionSync()?.uniqueId,
          pull: request.pull,
        });
      } finally {
        running.current = false;
        setSyncing(false);
      }

      const sameAccount =
        latest.current.userId === forUser && latest.current.organizationId === forOrganization;
      if (outcome.kind === "done") {
        failures.current = 0;
        if (request.pull) lastPullAt.current = Date.now();
        if (sameAccount && (outcome.pushed || request.refresh)) {
          // What was sent now comes from the server: lists, histories and an
          // open customer, including one that only had a stand-in id.
          await Promise.all([
            invalidateClientDomain(queryClient, forOrganization, "refresh"),
            queryClient.invalidateQueries({ queryKey: [...queryKeys.clientRoot(), forOrganization] }),
          ]).catch(() => undefined);
        }
        if (sameAccount && request.refresh) {
          // The rest of what is on view (the inbox, SMS, the plan) as well.
          void queryClient.refetchQueries({ type: "active" }).catch(() => undefined);
        }
      } else if (outcome.kind === "failed" && hasPending()) {
        // The server answered with an error: again later, while something waits.
        const delay = retryDelayMs(failures.current);
        failures.current += 1;
        retryTimer.current = setTimeout(() => void run({ pull: false, refresh: false }), delay);
      }
      // "unreachable": the server is marked down; its return starts the next
      // round. "unauthorized": the queue waits for this user to sign in again.

      const queued = next.current;
      next.current = null;
      if (outcome.kind !== "done" && outcome.kind !== "failed") return;
      if (queued) void run(queued);
      // Written while this round ran: sent shortly, in the next one.
      else if (outcome.kind === "done" && hasPending() && !isServerDown()) {
        retryTimer.current = setTimeout(() => void run({ pull: false, refresh: false }), SEND_AFTER_MS);
      }
    },
    [queryClient],
  );

  // The signed-in user's queue, and nobody else's.
  useEffect(() => {
    clearRetry();
    failures.current = 0;
    lastPullAt.current = 0;
    next.current = null;
    void loadOutbox(userId);
  }, [userId]);

  // Signed in, or another organization chosen: a full round.
  useEffect(() => {
    if (userId === null || organizationId === null) return;
    void run({ pull: true, refresh: false });
  }, [organizationId, run, userId]);

  // The server is back: the queue first, then the changes, then the screens.
  const wasDown = useRef(serverDown);
  useEffect(() => {
    if (wasDown.current && !serverDown) {
      failures.current = 0;
      void run({ pull: true, refresh: true });
    }
    if (serverDown) clearRetry();
    wasDown.current = serverDown;
  }, [run, serverDown]);

  // The connection came back (with the server up; down, its check comes first).
  const wasOffline = useRef(false);
  useEffect(() => {
    const offline = status === "offline";
    if (wasOffline.current && !offline && !isServerDown()) {
      failures.current = 0;
      void run({ pull: true, refresh: false });
    }
    wasOffline.current = offline;
  }, [run, status]);

  // A new write was queued: sent shortly (only on a rise, never on the queue
  // shrinking after a send). With the server down, its check is asked for:
  // it may well be back already.
  const pendingCount = outbox.reduce((count, operation) => count + (operation.status === "pending" ? 1 : 0), 0);
  const previousPending = useRef(pendingCount);
  useEffect(() => {
    const rose = pendingCount > previousPending.current;
    previousPending.current = pendingCount;
    if (!rose || status === "offline") return undefined;
    if (isServerDown()) {
      requestHealthCheck();
      return undefined;
    }
    const timer = setTimeout(() => void run({ pull: false, refresh: false }), SEND_AFTER_MS);
    return () => clearTimeout(timer);
  }, [pendingCount, run, status]);

  // Back to the app (with the server down, ServerHealthMonitor checks instead).
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || latest.current.offline || isServerDown()) return;
      if (Date.now() - lastPullAt.current >= PULL_AT_MOST_EVERY_MS) void run({ pull: true, refresh: false });
      else if (hasPending()) void run({ pull: false, refresh: false });
    });
    return () => subscription.remove();
  }, [run]);

  // "Hozir yuborish": with the server down, check it first.
  useEffect(
    () =>
      onSyncRequested(() => {
        failures.current = 0;
        if (isServerDown()) requestHealthCheck();
        else void run({ pull: true, refresh: false });
      }),
    [run],
  );

  useEffect(() => clearRetry, []);

  return null;
}
