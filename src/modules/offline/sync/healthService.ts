import axios from "axios";

import { API_BASE_URL } from "../../../config/env";

const DOWN_STATUSES = new Set([502, 503, 504]);

/**
 * GET /health (no sign-in), asked only while the server is known to be down.
 * Any answer but 502/503/504 means the server is back: a 200 by the
 * backend's rule, and any other status is still the server answering. No
 * answer within the time means it is still down. Sent past the app's own
 * client, so no token refresh or retry is involved.
 */
export async function checkServerHealth(timeoutMs = 10_000): Promise<boolean> {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: timeoutMs,
      validateStatus: () => true,
      headers: { "Cache-Control": "no-cache" },
    });
    return !DOWN_STATUSES.has(response.status);
  } catch {
    return false;
  }
}

/**
 * How long to wait before the next check while the server stays down: every
 * 15–30 s at first, then slower, every 2–5 min (the backend's advice).
 */
const HEALTH_DELAYS_MS = [15_000, 15_000, 20_000, 30_000, 30_000, 60_000, 120_000, 180_000, 300_000];

export function healthCheckDelayMs(failedChecks: number): number {
  return HEALTH_DELAYS_MS[Math.min(Math.max(0, failedChecks), HEALTH_DELAYS_MS.length - 1)];
}
