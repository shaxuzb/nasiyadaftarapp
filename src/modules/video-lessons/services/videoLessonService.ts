import { apiClient } from "../../../services/axiosService";

export interface ApiVideoLesson {
  id: string;
  code: string | null;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  sortOrder: number;
  youtubeId: string | null;
}
export function youtubeIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be" || host === "www.youtu.be") id = url.pathname.slice(1).split("/")[0];
    else if (["youtube.com","www.youtube.com","m.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2];
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function resolveThumbnailUrl(raw: unknown, youtubeId: string | null): string | null {
  if (typeof raw === "string") {
    try {
      const url = new URL(raw);
      if (url.protocol === "https:" && /\.(png|jpe?g|webp)$/i.test(url.pathname)) return url.toString();
    } catch { /* fall back to video ID */ }
  }
  return youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg` : null;
}
export function parseVideoLessons(input: unknown): ApiVideoLesson[] {
  const data = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : null;
  const list = Array.isArray(input) ? input : Array.isArray(data?.results) ? data.results : Array.isArray(data?.data) ? data.data : null;
  if (!list) throw new Error("Invalid video lesson response");
  return list.flatMap((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const o = item as Record<string, unknown>;
    if (!(typeof o.id === "string" || typeof o.id === "number") ||
      typeof o.title !== "string" || !o.title.trim() ||
      typeof o.videoUrl !== "string" || !/^https:\/\//i.test(o.videoUrl)) return [];
    if (o.isActive === false) return [];
    return [{ id: String(o.id), code: typeof o.code === 'string' && o.code.trim() ? o.code.trim().toLowerCase() : null, title: o.title.trim(),
      description: typeof o.description === "string" ? o.description.trim() : "",
      videoUrl: o.videoUrl,
      thumbnailUrl: resolveThumbnailUrl(o.thumbnailUrl, youtubeIdFromUrl(o.videoUrl)),
      sortOrder: typeof o.sortOrder === "number" && Number.isFinite(o.sortOrder) ? o.sortOrder : 0,
      youtubeId: youtubeIdFromUrl(o.videoUrl),
    }];
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

export async function fetchVideoLessons(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>("/video-lessons", { signal });
  return parseVideoLessons(data);
}
