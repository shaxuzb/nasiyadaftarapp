import assert from "node:assert/strict";
import {
  customerSearchText,
  fingerprint,
  isServerUnreachable,
  normalizeSearchText,
  toLikePattern,
  withSavedDataFallback,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./savedData.ts";

const axiosError = (status?: number, extra: Record<string, unknown> = {}) => ({
  isAxiosError: true,
  response: status === undefined ? undefined : { status },
  ...extra,
});

/* What counts as the server being out of reach. */

assert.equal(isServerUnreachable(axiosError()), true, "No answer: no connection or a timeout");
for (const status of [502, 503, 504]) assert.equal(isServerUnreachable(axiosError(status)), true, `${status}`);
for (const status of [400, 401, 403, 404, 409, 422, 500]) {
  assert.equal(isServerUnreachable(axiosError(status)), false, `${status}: the server is up and means it`);
}
assert.equal(isServerUnreachable(axiosError(undefined, { name: "CanceledError", code: "ERR_CANCELED" })), false, "Cancelled by the app");
assert.equal(isServerUnreachable(new Error("Invalid response")), false, "A parsing error is not an outage");
assert.equal(isServerUnreachable(null), false);

/* The fallback. */

const events: string[] = [];
const saved = { data: ["saved"], savedAt: 1000 };
const fresh = await withSavedDataFallback({
  fetch: async () => ["fresh"],
  save: (data: string[]) => events.push(`save:${data}`),
  load: async () => saved,
  onFresh: () => events.push("fresh"),
  onSaved: (at: number) => events.push(`saved:${at}`),
});
assert.deepEqual(fresh, ["fresh"]);
assert.deepEqual(events, ["save:fresh", "fresh"], "A fresh answer is kept and reported");

events.length = 0;
const offline = await withSavedDataFallback({
  fetch: async () => { throw axiosError(503); },
  save: () => events.push("save"),
  load: async () => saved,
  onSaved: (at: number) => events.push(`saved:${at}`),
});
assert.deepEqual(offline, ["saved"]);
assert.deepEqual(events, ["saved:1000"], "Server down: the copy, and when it was saved");

events.length = 0;
let asked = 0;
const known = await withSavedDataFallback({
  fetch: async () => { asked += 1; return ["fresh"]; },
  save: () => events.push("save"),
  load: async () => saved,
  onSaved: (at: number) => events.push(`saved:${at}`),
  serverDown: true,
});
assert.deepEqual(known, ["saved"]);
assert.equal(asked, 0, "Known down: no request waiting for its timeout");
const noCopy = await withSavedDataFallback({
  fetch: async () => ["fresh"],
  save: () => {},
  load: async () => null,
  serverDown: true,
});
assert.deepEqual(noCopy, ["fresh"], "Known down but nothing saved: the server is still asked");

const notFound = axiosError(404);
await assert.rejects(
  withSavedDataFallback({ fetch: async () => { throw notFound; }, save: () => {}, load: async () => saved }),
  (error: unknown) => error === notFound,
  "A real answer from the server is not hidden behind the copy",
);
const down = axiosError();
await assert.rejects(
  withSavedDataFallback({ fetch: async () => { throw down; }, save: () => {}, load: async () => null }),
  (error: unknown) => error === down,
  "No copy: the original error",
);

/* Searching on the device. */

assert.equal(normalizeSearchText("  O‘ktam   Aka "), "o'ktam aka");
assert.equal(normalizeSearchText("Gʻayrat"), normalizeSearchText("G'ayrat"));
assert.equal(customerSearchText("Ali Valiyev", "+998 93 998 70 55"), "ali valiyev +998 93 998 70 55 998939987055");
assert.equal(toLikePattern(" 50%_off "), "%50\\%\\_off%");

/* Skipping unchanged writes. */

assert.equal(fingerprint('[{"id":1}]'), fingerprint('[{"id":1}]'));
assert.notEqual(fingerprint('[{"id":1}]'), fingerprint('[{"id":2}]'));

console.log("Offline saved data tests passed");
