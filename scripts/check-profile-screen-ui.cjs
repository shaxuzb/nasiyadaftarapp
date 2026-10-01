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
// Contacting the admin moved behind one row in the help section, alongside the
// community group, because two near-identical Telegram rows read as duplicates.
// It still has to be one tap from the profile screen.
assert.match(
  screen,
  /title=\{t\("profile\.supportRowTitle"\)\}/,
  "The help section must offer a single contact-and-support row",
);
assert.match(
  screen,
  /onPress=\{\(\) => openSheet\("support", \{\}\)\}/,
  "The contact row must open the support sheet",
);

const supportSheet = fs.readFileSync(
  "src/bottom-sheet/sheets/SupportSheet.tsx",
  "utf8",
);
assert.match(
  supportSheet,
  /useAdminContact/,
  "The support sheet must keep the admin contact reachable",
);
assert.match(
  supportSheet,
  /support\.communityTitle/,
  "The support sheet must offer the discussion group",
);
// Android reserves the strip along the bottom edge for its navigation bar or
// gesture handle, and a sheet that ignores it puts its last row underneath.
assert.match(
  supportSheet,
  /paddingBottom: Math\.max\(insets\.bottom, 12\)/,
  "The support sheet must clear the Android bottom inset",
);

// The public profiles belong in the header, away from the functional rows.
assert.match(
  screen,
  /const SOCIAL_LINKS = \[/,
  "The profile header must list the public profiles in one place",
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
