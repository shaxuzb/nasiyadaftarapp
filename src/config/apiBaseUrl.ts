function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveApiBaseUrl(
  configured: string | undefined,
  fallback: string,
): string {
  const candidate = configured?.trim();
  const selected = isHttpUrl(candidate) ? candidate : fallback.trim();
  return selected.replace(/\/$/, "");
}

export function isValidPublicApiBaseUrl(value: string | undefined): boolean {
  return isHttpUrl(value?.trim());
}
