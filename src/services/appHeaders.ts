/**
 * The headers that tell the backend which app is calling: version, platform
 * and, when known, build and device. It reads them from every request, so no
 * separate "report my version" call is needed.
 *
 *   X-App-Version   1.1.5          required
 *   X-Platform      android | ios  required
 *   X-App-Build     19             optional
 *   X-Device-Id     <id>           optional; the same id push registers with
 */
export interface AppRequestInfo {
  version?: string | null;
  platform?: string | null;
  build?: string | null;
  deviceId?: string | null;
}

// A header value must be one line of plain characters; anything else is not
// worth risking a rejected request over.
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && /^[\x20-\x7E]+$/.test(trimmed) ? trimmed : null;
}

export function buildAppRequestHeaders(info: AppRequestInfo): Record<string, string> {
  const headers: Record<string, string> = {};

  const version = clean(info.version);
  if (version) headers["X-App-Version"] = version;

  const platform = clean(info.platform)?.toLowerCase();
  if (platform === "android" || platform === "ios") {
    headers["X-Platform"] = platform;
  }

  const build = clean(info.build);
  if (build) headers["X-App-Build"] = build;

  const deviceId = clean(info.deviceId);
  if (deviceId) headers["X-Device-Id"] = deviceId;

  return headers;
}
