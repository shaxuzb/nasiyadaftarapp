/**
 * Showing the copy saved on the device when the server cannot be reached.
 * Kept free of React Native so it can be tested on its own.
 */

/** What was saved, and when (ms since epoch). */
export interface Saved<T> {
  data: T;
  savedAt: number;
}

/**
 * True when the server could not answer at all: no connection, a timeout, or
 * 502/503/504 (the server, or the gateway in front of it, is down). This is
 * the backend's own rule for going offline. Not for an answer such as 401,
 * 404 or 500 (the server is up and means it, or has a bug to show), and not
 * for a request the app cancelled itself.
 */
const SERVER_DOWN_STATUSES = new Set([502, 503, 504]);

export function isServerUnreachable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as {
    name?: unknown;
    code?: unknown;
    isAxiosError?: unknown;
    response?: { status?: unknown } | null;
  };
  if (value.name === "CanceledError" || value.name === "AbortError" || value.code === "ERR_CANCELED") {
    return false;
  }
  if (value.isAxiosError !== true) return false;
  const status = value.response?.status;
  if (typeof status !== "number") return true;
  return SERVER_DOWN_STATUSES.has(status);
}

export interface SavedDataFallback<T> {
  /** The request to the server. */
  fetch: () => Promise<T>;
  /** Keeps a fresh answer on the device. Must not throw. */
  save: (data: T) => void;
  /** The copy on the device, if there is one. Must not throw. */
  load: () => Promise<Saved<T> | null>;
  /** The server answered. */
  onFresh?: () => void;
  /** The server did not, and the saved copy from `savedAt` is shown. */
  onSaved?: (savedAt: number) => void;
  /**
   * The server is known to be down: the copy straight away, rather than a
   * request that waits for its timeout. Asked again only with no copy.
   */
  serverDown?: boolean;
}

/**
 * The server's answer, kept on the device; or, when the server cannot be
 * reached, the copy kept last time. With no copy, the original error.
 */
export async function withSavedDataFallback<T>(options: SavedDataFallback<T>): Promise<T> {
  if (options.serverDown) {
    const saved = await options.load();
    if (saved) {
      options.onSaved?.(saved.savedAt);
      return saved.data;
    }
  }
  try {
    const data = await options.fetch();
    options.save(data);
    options.onFresh?.();
    return data;
  } catch (error) {
    if (!isServerUnreachable(error)) throw error;
    const saved = await options.load();
    if (!saved) throw error;
    options.onSaved?.(saved.savedAt);
    return saved.data;
  }
}

/**
 * Text for searching on the device: lower-case, one kind of apostrophe
 * (Uzbek is written with ', ‘, ’ and ʻ alike), single spaces.
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** What a customer is found by: the name, and the phone with and without spaces. */
export function customerSearchText(fullName: string, phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return normalizeSearchText(`${fullName} ${phone} ${digits}`);
}

/** A query made safe for LIKE: its own % and _ match themselves. */
export function toLikePattern(query: string): string {
  const escaped = normalizeSearchText(query).replace(/[\\%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

/** A short, stable fingerprint, to skip writing what has not changed. */
export function fingerprint(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  }
  return `${text.length}:${hash}`;
}
