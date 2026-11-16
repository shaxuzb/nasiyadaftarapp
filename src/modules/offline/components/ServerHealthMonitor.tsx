import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useNetworkStatus } from "../../../core/network/NetworkProvider";
import { getCurrentNetworkStatus } from "../../../core/network/networkState";
import {
  isServerDown,
  onHealthCheckRequested,
  reportServerUp,
  useIsServerDown,
} from "../state/serverStatus";
import { checkServerHealth, healthCheckDelayMs } from "../sync/healthService";

/**
 * While the server is known to be down, asks GET /health until it answers:
 * every 15–30 s at first, then every 2–5 min; at once when the app comes to
 * the front, when the connection comes back, and when asked (a write was
 * queued, "Qayta tekshirish"). Never while the server answers, and never
 * with no connection at all. Its answer brings the app back online; what
 * follows (the queue, then the changes) is OfflineSyncController's. Renders
 * nothing.
 */
export function ServerHealthMonitor() {
  const down = useIsServerDown();
  const { status } = useNetworkStatus();
  const offline = status === "offline";

  const failedChecks = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checking = useRef(false);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const check = useCallback(async () => {
    if (checking.current || !isServerDown() || getCurrentNetworkStatus() === "offline") return;
    clearTimer();
    checking.current = true;
    let answered = false;
    try {
      answered = await checkServerHealth();
    } finally {
      checking.current = false;
    }
    // Another request found the server meanwhile: nothing left to do.
    if (!isServerDown()) return;
    if (answered) {
      failedChecks.current = 0;
      reportServerUp();
      return;
    }
    if (getCurrentNetworkStatus() === "offline") return;
    timer.current = setTimeout(() => void check(), healthCheckDelayMs(failedChecks.current));
    failedChecks.current += 1;
  }, []);

  // Down: the first check shortly after, then slower and slower. Up: none.
  useEffect(() => {
    clearTimer();
    if (!down || offline) return undefined;
    failedChecks.current = 0;
    timer.current = setTimeout(() => void check(), healthCheckDelayMs(0));
    failedChecks.current = 1;
    return clearTimer;
  }, [check, down, offline]);

  // The connection came back while the server was down: ask at once.
  const wasOffline = useRef(offline);
  useEffect(() => {
    if (wasOffline.current && !offline && isServerDown()) {
      failedChecks.current = 0;
      void check();
    }
    wasOffline.current = offline;
  }, [check, offline]);

  // Back to the app, or asked for: at once.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && isServerDown()) void check();
    });
    const unsubscribe = onHealthCheckRequested(() => void check());
    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, [check]);

  return null;
}
