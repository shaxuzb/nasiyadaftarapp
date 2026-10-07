import assert from "node:assert/strict";
import {
  buildPlayerHtml,
  getPlayerOrigin,
  getVideoLessons,
  getVideoThumbnailUrl,
  getVideoWatchUrl,
  isPlayerInternalUrl,
  parsePlayerMessage,
  resolveVideoLesson,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./videoLessons.ts";

/* Android gets all six lessons, in order; iOS never gets the payment one. */

const android = getVideoLessons("android");
assert.deepEqual(
  android.map((lesson: { id: string }) => lesson.id),
  ["register", "customers", "reports", "sms", "profile", "payment"],
);
const ios = getVideoLessons("ios");
assert.deepEqual(
  ios.map((lesson: { id: string }) => lesson.id),
  ["register", "customers", "reports", "sms", "profile"],
);
assert.equal(
  new Set(android.map((lesson: { youtubeId: string }) => lesson.youtubeId)).size,
  android.length,
  "Two lessons must not point at the same video",
);

/* A screen asks for a lesson by id; a missing or hidden one falls back to the first. */

assert.equal(resolveVideoLesson(ios, "sms")?.id, "sms");
assert.equal(resolveVideoLesson(ios, undefined)?.id, "register");
assert.equal(
  resolveVideoLesson(ios, "payment")?.id,
  "register",
  "A link to the payment lesson must not surface it on iOS",
);
assert.equal(resolveVideoLesson([], "sms"), undefined);

/* Addresses */

assert.equal(getVideoThumbnailUrl("NQhz6oK_dVs"), "https://i.ytimg.com/vi/NQhz6oK_dVs/mqdefault.jpg");
assert.equal(getVideoWatchUrl("NQhz6oK_dVs"), "https://www.youtube.com/watch?v=NQhz6oK_dVs");

/* YouTube wants the app id as the embedding page's address. */

assert.equal(getPlayerOrigin("com.rbsx.nasiyadaftarapp"), "https://com.rbsx.nasiyadaftarapp");
assert.equal(getPlayerOrigin("Com.Example.App"), "https://com.example.app");
for (const missing of [null, undefined, "", "bad id/with path"]) {
  assert.equal(getPlayerOrigin(missing), "https://com.rbsx.nasiyadaftarapp");
}

/* The player page carries the id, the origin and a referrer policy. */

const origin = "https://com.rbsx.nasiyadaftarapp";
const html = buildPlayerHtml("bDIf_RxqCns", origin);
assert.match(html, /videoId: "bDIf_RxqCns"/);
assert.match(html, /origin: "https:\/\/com\.rbsx\.nasiyadaftarapp"/);
assert.match(html, /name="referrer" content="strict-origin-when-cross-origin"/);
assert.match(html, /playsinline: 1/, "The video must play in place, not take over the screen");
assert.match(html, /https:\/\/www\.youtube\.com\/iframe_api/);
for (const bad of ['x";alert(1);//', "", "a b", "<script>"]) {
  assert.throws(() => buildPlayerHtml(bad, origin), /Invalid YouTube video id/);
}

/* Messages from the page; YouTube's own frame messages are ignored. */

assert.deepEqual(parsePlayerMessage('{"type":"ready"}'), { type: "ready" });
assert.deepEqual(parsePlayerMessage('{"type":"ended"}'), { type: "ended" });
assert.deepEqual(parsePlayerMessage('{"type":"error","code":153}'), { type: "error", code: 153 });
assert.deepEqual(parsePlayerMessage('{"type":"error"}'), { type: "error", code: 0 });
for (const foreign of ["", "not json", '{"event":"infoDelivery"}', '{"type":"other"}', "null"]) {
  assert.equal(parsePlayerMessage(foreign), null);
}

/* The player keeps to its own page and YouTube's frame; taps on links leave it. */

for (const url of [
  origin,
  `${origin}/`,
  "about:blank",
  "https://www.youtube.com/embed/bDIf_RxqCns?autoplay=1",
  "https://www.youtube-nocookie.com/embed/bDIf_RxqCns",
]) {
  assert.equal(isPlayerInternalUrl(url, origin), true, url);
}
for (const url of [
  "https://www.youtube.com/watch?v=bDIf_RxqCns",
  "https://www.youtube.com/@rbsx",
  "https://com.rbsx.nasiyadaftarapp.evil.example/",
  "https://example.com/",
  "intent://www.youtube.com/watch#Intent;end",
]) {
  assert.equal(isPlayerInternalUrl(url, origin), false, url);
}

console.log("Video lessons list, player page and navigation tests passed");
