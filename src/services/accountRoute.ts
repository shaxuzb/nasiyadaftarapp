const PUBLIC_ACCOUNT_PATHS = new Set([
  "/account/google",
  "/account/apple",
  "/account/phone/request",
  "/account/phone/confirm",
  "/account/refresh",
  "/account/logout",
]);

function normalizeAccountPath(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let pathname = trimmed;
  try {
    pathname = new URL(trimmed, "https://local.invalid").pathname;
  } catch {
    pathname = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  }

  if (pathname.startsWith("/api/")) {
    pathname = pathname.slice(4);
  }

  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function isPublicAccountRoute(url?: string): boolean {
  if (!url) return false;
  const pathname = normalizeAccountPath(url);
  return pathname !== null && PUBLIC_ACCOUNT_PATHS.has(pathname);
}
