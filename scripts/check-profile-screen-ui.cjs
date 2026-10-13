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
  /<View style=\{styles\.profileCard\}>[\s\S]*styles\.organizationHeader[\s\S]*styles\.organizationContactDetails[\s\S]*styles\.profilePlanRow/,
  "The organization summary, linked contacts and current plan must be rendered inside the profile card",
);
assert.match(
  screen,
  /currentOrganization\?\.name/,
  "The profile card must show the selected organization name",
);
assert.match(
  screen,
  /onPress=\{handleOrganizationEdit\}[\s\S]*styles\.organizationEdit/,
  "The selected organization must be editable from the top card",
);
assert.doesNotMatch(
  screen,
  /styles\.profileHeader|styles\.profileDetails/,
  "The old user-focused profile header and detail block must be replaced",
);
assert.match(
  screen,
  /t\("profile\.phone"\)[\s\S]*user\?\.phoneNumber[\s\S]*t\("profile\.email"\)[\s\S]*user\?\.email/,
  "The organization card must show linked phone and email details",
);
assert.doesNotMatch(
  screen,
  /organizationStats|organizationAddress|clientCount|userCount/,
  "The compact organization card must not show address or organization statistics",
);
assert.doesNotMatch(
  screen,
  /<AdminContactButton\s+variant="card"/,
  "Admin contact must use the profile grouped-card layout",
);
// Contacting the admin is one row in the help section, and it goes straight
// to the admin: there is one person to write to, so no sheet in between.
assert.match(
  screen,
  /title=\{t\("profile\.supportRowTitle"\)\}/,
  "The help section must offer a single contact-and-support row",
);
assert.match(
  screen,
  /title=\{t\("profile\.supportRowTitle"\)\}[\s\S]{0,260}onPress=\{\(\) => void openAdminContact\(\)\}\s*loading=\{isOpeningAdmin\}/,
  "The contact row opens the admin contact directly",
);
assert.equal(
  fs.existsSync("src/bottom-sheet/sheets/SupportSheet.tsx"),
  false,
  "A sheet with a single row was an extra tap",
);

// Instagram and the Telegram group belong in the header, away from the
// functional rows.
assert.match(
  fs.readFileSync("src/modules/support/utils/appLinks.ts", "utf8"),
  /export const HEADER_APP_LINK_KEYS = \["instagram", "telegram_group"\] as const;/,
  "The profile header's public profiles are named in one place",
);
assert.match(
  screen,
  /const headerLinks = useMemo\(\(\) => getHeaderAppLinks\(appLinks\), \[appLinks\]\);/,
  "A header icon appears only for a link the server actually lists",
);
assert.match(
  screen,
  /accessibilityRole="link"/,
  "A social icon must announce itself as a link",
);
assert.match(
  screen,
  /styles\.appearanceCard[\s\S]*styles\.themeSelector/,
  "Language and theme controls must share one appearance card",
);
assert.match(
  screen,
  /organizationIdentity:\s*\{\s*minWidth:\s*0,\s*flex:\s*1/,
  "Organization identity content must remain shrinkable on narrow screens",
);
assert.match(
  screen,
  /badge=\{\s*isPaidSubscription\s*\?/,
  "Paid-only actions must keep a clear plan badge",
);
assert.match(
  screen,
  /title=\{t\("organization\.selectTitle"\)\}/,
  "Organization switching must remain available below the summary card",
);
assert.match(
  screen,
  /title=\{t\("profile\.blacklistSettings"\)\}/,
  "Blacklist settings must remain available below the summary card",
);
assert.doesNotMatch(
  screen,
  /title=\{\s*currentOrganization\?\.name/,
  "The current organization must not be duplicated as a lower menu row",
);

console.log("Profile screen responsive grouped-card UI contract passed");
