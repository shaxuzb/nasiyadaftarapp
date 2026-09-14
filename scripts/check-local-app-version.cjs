const assert = require("node:assert/strict");
const fs = require("node:fs");

const eas = JSON.parse(fs.readFileSync("eas.json", "utf8"));
const app = JSON.parse(fs.readFileSync("app.json", "utf8"));
const updateSource = fs.readFileSync(
  "src/modules/app-update/hooks/useAppUpdate.ts",
  "utf8",
);
const serviceSource = fs.readFileSync(
  "src/modules/app-update/services/appUpdateService.ts",
  "utf8",
);

assert.equal(
  eas?.cli?.appVersionSource,
  "local",
  "EAS appVersionSource must be local",
);
assert.match(
  app?.expo?.version ?? "",
  /^[vV]?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/,
  "expo.version must be a semantic app version",
);
assert.doesNotMatch(
  updateSource + serviceSource,
  /versionCode|buildNumber/,
  "App update logic must not depend on native build counters",
);
assert.match(serviceSource, /currentVersion=/);
assert.match(updateSource, /nativeApplicationVersion/);

console.log("Local semantic app version contract passed");
