const assert = require("node:assert/strict");
const fs = require("node:fs");

const screen = fs.readFileSync("src/screens/SettingsScreen.tsx", "utf8");

assert.doesNotMatch(
  screen,
  /styles\.subscriptionCard/,
  "The current plan must not remain as a separate card above the profile",
);
assert.match(
  screen,
  /styles\.profilePlanRow/,
  "The current plan must be integrated into the profile card",
);
assert.match(
  screen,
  /<View style=\{styles\.profileCard\}>[\s\S]*styles\.profilePlanRow/,
  "The current plan row must be rendered inside the profile card",
);
assert.doesNotMatch(
  screen,
  /<AdminContactButton\s+variant="card"/,
  "Admin contact must use the profile grouped-card layout",
);
assert.match(
  screen,
  /openAdminContact/,
  "Admin contact action must remain wired after the profile redesign",
);
assert.match(
  screen,
  /title=\{t\("common\.adminContactTitle"\)\}/,
  "Admin contact must remain visible in the help section",
);
assert.match(
  screen,
  /styles\.appearanceCard[\s\S]*styles\.themeSelector/,
  "Language and theme controls must share one appearance card",
);
assert.match(
  screen,
  /identityMeta[\s\S]*flexWrap:\s*"wrap"/,
  "Profile identity metadata must wrap on narrow screens",
);
assert.match(
  screen,
  /badge=\{\s*isPaidSubscription\s*\?/,
  "Paid-only actions must keep a clear plan badge",
);

console.log("Profile screen responsive grouped-card UI contract passed");
