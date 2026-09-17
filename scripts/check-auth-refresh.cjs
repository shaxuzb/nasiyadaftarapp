const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const axiosService = fs.readFileSync(
  path.join(root, "src", "services", "axiosService.ts"),
  "utf8",
);
const authTypes = fs.readFileSync(
  path.join(root, "src", "modules", "auth", "types", "index.ts"),
  "utf8",
);

assert.match(
  authTypes,
  /interface AuthRefreshResponse[\s\S]*accessToken\?:\s*string/,
  "refresh response type must support accessToken",
);
assert.match(
  axiosService,
  /response\.data\.accessToken\s*\?\?\s*response\.data\.token/,
  "refresh flow must prefer accessToken and support legacy token",
);
assert.match(
  axiosService,
  /if\s*\(!newAccessToken\)/,
  "refresh flow must reject an unusable response before saving the session",
);

console.log("Auth refresh access-token contract passed");
