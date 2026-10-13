/**
 * Remembers when a verification code was last sent to a phone number, so the
 * app does not ask for another before the server allows one.
 *
 * The server answers a code request with how long the code lives
 * (`expiresInSeconds`) and how soon another may be asked for
 * (`resendAfterSeconds`). Asking earlier is refused, and repeated early asks
 * are what the backend saw in its logs: a user going back from the code screen
 * and tapping "get code" again. With this, that tap takes them back to the
 * code they already have instead of sending a request that will fail.
 *
 * Kept in memory only: after a restart the first request simply goes to the
 * server, which is the authority anyway.
 */

/** Which flow the code belongs to; the two have separate limits on the server. */
export type CodeRequestChannel = "login" | "profile";

export interface CodeRequestRecord {
  maskedPhone: string;
  /** Epoch ms after which the code no longer works. */
  expiresAt: number;
  /** Epoch ms from which another code may be requested. */
  resendAt: number;
}

export interface CodeRequestTimes {
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

/** Used when the server does not say; matches the window it enforces. */
export const DEFAULT_RESEND_AFTER_SECONDS = 120;

function seconds(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/**
 * Reads the two durations from a code-request answer. An older server sends no
 * `resendAfterSeconds`; then the code's own lifetime is the wait, as before.
 */
export function readCodeRequestTimes(response: {
  expiresInSeconds?: unknown;
  resendAfterSeconds?: unknown;
}): CodeRequestTimes {
  const expiresInSeconds = seconds(
    response.expiresInSeconds,
    DEFAULT_RESEND_AFTER_SECONDS,
  );
  return {
    expiresInSeconds,
    resendAfterSeconds: seconds(response.resendAfterSeconds, expiresInSeconds),
  };
}

const records = new Map<string, CodeRequestRecord>();

const keyOf = (channel: CodeRequestChannel, phoneNumber: string) =>
  `${channel}:${phoneNumber.replace(/\D/g, "")}`;

/** Call when the server has accepted a code request. */
export function rememberCodeRequest(
  channel: CodeRequestChannel,
  phoneNumber: string,
  maskedPhone: string,
  times: CodeRequestTimes,
  now: number = Date.now(),
): void {
  records.set(keyOf(channel, phoneNumber), {
    maskedPhone,
    expiresAt: now + times.expiresInSeconds * 1000,
    resendAt: now + times.resendAfterSeconds * 1000,
  });
}

/**
 * The code already sent to this number, when asking for another would be
 * refused and the one sent can still be used. Null means "go ahead and ask".
 */
export function getActiveCodeRequest(
  channel: CodeRequestChannel,
  phoneNumber: string,
  now: number = Date.now(),
): (CodeRequestRecord & CodeRequestTimes) | null {
  const key = keyOf(channel, phoneNumber);
  const record = records.get(key);
  if (!record) return null;

  const resendAfterSeconds = Math.ceil((record.resendAt - now) / 1000);
  const expiresInSeconds = Math.ceil((record.expiresAt - now) / 1000);
  if (resendAfterSeconds <= 0 || expiresInSeconds <= 0) {
    // Either another may be asked for, or the old one is useless: ask.
    if (expiresInSeconds <= 0) records.delete(key);
    return null;
  }
  return { ...record, resendAfterSeconds, expiresInSeconds };
}

/** Call when the code was used, so the number starts clean next time. */
export function forgetCodeRequest(
  channel: CodeRequestChannel,
  phoneNumber: string,
): void {
  records.delete(keyOf(channel, phoneNumber));
}
