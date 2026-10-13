import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { buildAppRequestHeaders } from "./appHeaders.ts";

/* Everything known. */

assert.deepEqual(
  buildAppRequestHeaders({
    version: "1.1.5",
    platform: "android",
    build: "19",
    deviceId: "3f6c1e2a-9d4b-4c1e-8a57-0b2d6e9f4a11",
  }),
  {
    "X-App-Version": "1.1.5",
    "X-Platform": "android",
    "X-App-Build": "19",
    "X-Device-Id": "3f6c1e2a-9d4b-4c1e-8a57-0b2d6e9f4a11",
  },
);

/* The optional two are left out when unknown, not sent empty. */

assert.deepEqual(buildAppRequestHeaders({ version: "1.1.5", platform: "ios" }), {
  "X-App-Version": "1.1.5",
  "X-Platform": "ios",
});
assert.deepEqual(
  buildAppRequestHeaders({ version: " 1.1.5 ", platform: "IOS", build: "  ", deviceId: null }),
  { "X-App-Version": "1.1.5", "X-Platform": "ios" },
);

/* Only the two platforms the backend knows. */

assert.deepEqual(buildAppRequestHeaders({ version: "1.1.5", platform: "web" }), {
  "X-App-Version": "1.1.5",
});

/* A value that could not be a header is dropped rather than sent. */

assert.deepEqual(
  buildAppRequestHeaders({
    version: "1.1.5\r\nX-Injected: yes",
    platform: "android",
    deviceId: "qurilma-№1",
  }),
  { "X-Platform": "android" },
);

assert.deepEqual(buildAppRequestHeaders({}), {});

console.log("App request header tests passed");
