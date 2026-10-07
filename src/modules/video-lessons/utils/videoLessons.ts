/**
 * The how-to videos, in the order they are meant to be watched. They live on
 * YouTube; the app only knows their ids, so wording and thumbnails stay small
 * and the videos can be re-uploaded in better quality without a release.
 */

export type VideoLessonId =
  | "register"
  | "customers"
  | "reports"
  | "sms"
  | "profile"
  | "payment";

type Platform = "ios" | "android";

export interface VideoLesson {
  id: VideoLessonId;
  youtubeId: string;
  /** Where the lesson is offered; everywhere when omitted. */
  platforms?: readonly Platform[];
}

const VIDEO_LESSONS: readonly VideoLesson[] = [
  { id: "register", youtubeId: "NQhz6oK_dVs" },
  { id: "customers", youtubeId: "uCwUzKBz3u0" },
  { id: "reports", youtubeId: "SZDqw5nEiZE" },
  { id: "sms", youtubeId: "bDIf_RxqCns" },
  { id: "profile", youtubeId: "fKwPZgUFRfg" },
  // Walks through paying for a plan outside the App Store, which Apple does
  // not allow an iOS app to explain. Left out for every iOS user.
  { id: "payment", youtubeId: "q3iFY2y8Tbg", platforms: ["android"] },
];

export function getVideoLessons(platform: string): VideoLesson[] {
  return VIDEO_LESSONS.filter(
    (lesson) =>
      !lesson.platforms ||
      (lesson.platforms as readonly string[]).includes(platform),
  );
}

/**
 * The lesson a screen asked for, or the first one when it asked for none or
 * for one this platform does not offer.
 */
export function resolveVideoLesson(
  lessons: readonly VideoLesson[],
  id: VideoLessonId | undefined,
): VideoLesson | undefined {
  return lessons.find((lesson) => lesson.id === id) ?? lessons[0];
}

/** 320x180, true 16:9: no black bars and about a tenth of the full-size image. */
export function getVideoThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
}

export function getVideoWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

/**
 * YouTube refuses an embed that does not say who is embedding it ("Error
 * 153"). For an app it asks for `https://<application id>` as the page's
 * address, which the WebView takes from `baseUrl`.
 */
export function getPlayerOrigin(applicationId: string | null | undefined): string {
  const id = applicationId?.trim().toLowerCase();
  return `https://${id && /^[a-z0-9._-]+$/.test(id) ? id : "com.rbsx.nasiyadaftarapp"}`;
}

/** What the player page reports back to the app. */
export type PlayerMessage =
  | { type: "ready" }
  | { type: "ended" }
  | { type: "error"; code: number };

export function parsePlayerMessage(raw: string): PlayerMessage | null {
  try {
    const value = JSON.parse(raw) as { type?: unknown; code?: unknown };
    if (value.type === "ready" || value.type === "ended") return { type: value.type };
    if (value.type === "error") {
      return { type: "error", code: typeof value.code === "number" ? value.code : 0 };
    }
  } catch {
    // Not ours: the YouTube frame posts its own messages too.
  }
  return null;
}

/**
 * The page the WebView shows: YouTube's own IFrame player, filling the view.
 * The id is checked before it is written into the page, since it ends up
 * inside a script.
 */
export function buildPlayerHtml(youtubeId: string, origin: string): string {
  if (!/^[\w-]{6,20}$/.test(youtubeId)) {
    throw new Error("Invalid YouTube video id");
  }
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>
html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
#player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="player"></div>
<script>
function post(message) {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
}
function onYouTubeIframeAPIReady() {
  new YT.Player("player", {
    videoId: "${youtubeId}",
    width: "100%",
    height: "100%",
    playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, origin: "${origin}" },
    events: {
      onReady: function (event) { post({ type: "ready" }); event.target.playVideo(); },
      onStateChange: function (event) { if (event.data === 0) post({ type: "ended" }); },
      onError: function (event) { post({ type: "error", code: event.data }); }
    }
  });
}
var script = document.createElement("script");
script.src = "https://www.youtube.com/iframe_api";
script.onerror = function () { post({ type: "error", code: -1 }); };
document.head.appendChild(script);
</script>
</body>
</html>`;
}

/**
 * Whether the player may load an address itself. Its own page and YouTube's
 * frames may; anything else is a link the viewer tapped inside the video (the
 * YouTube logo, a card), which belongs in the YouTube app or the browser.
 */
export function isPlayerInternalUrl(url: string, origin: string): boolean {
  if (url === "about:blank" || url.startsWith("about:srcdoc")) return true;
  if (url === origin || url.startsWith(`${origin}/`)) return true;
  return /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//i.test(url);
}
