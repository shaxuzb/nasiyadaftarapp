export interface ResolveApiBaseUrlOptions {
  // Release builds refuse a cleartext base URL and fall back to the known-good
  // default instead, so a misconfigured build cannot send tokens over HTTP.
  requireHttps?: boolean;
}

function isHttpUrl(
  value: string | undefined,
  requireHttps = false,
): value is string {
  if (!value) return false;

  try {
    const url = new URL(value.trim());
    if (requireHttps) return url.protocol === "https:";
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveApiBaseUrl(
  configured: string | undefined,
  fallback: string,
  options: ResolveApiBaseUrlOptions = {},
): string {
  const requireHttps = options.requireHttps ?? false;
  const candidate = configured?.trim();
  const selected = isHttpUrl(candidate, requireHttps)
    ? candidate
    : fallback.trim();
  return selected.replace(/\/$/, "");
}

export function isValidPublicApiBaseUrl(value: string | undefined): boolean {
  return isHttpUrl(value?.trim());
}
