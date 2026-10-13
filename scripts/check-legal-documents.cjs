// The public offer and the privacy policy are one tap from the profile: a row
// there opens a sheet with both, and each opens its page in the browser. The
// two addresses are fixed in the app.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

const links = read("src/config/legalLinks.ts");
assert.match(links, /TERMS_OF_SERVICE_URL = "https:\/\/qarzdaftar\.rbsx\.uz\/terms-of-service";/);
assert.match(links, /PRIVACY_POLICY_URL = "https:\/\/qarzdaftar\.rbsx\.uz\/privacy-policy";/);

/* The profile row. */

const profile = read("src/screens/SettingsScreen.tsx");
assert.match(profile, /title=\{t\("profile\.legalRowTitle"\)\}/);
assert.match(profile, /onPress=\{\(\) => openSheet\("legal", \{\}\)\}/, "The row opens the sheet with both documents");
assert.ok(
  profile.indexOf('t("profile.supportRowTitle")') < profile.indexOf('openSheet("legal", {})'),
  "The documents come after contact and support, closing the help section",
);
const helpCard = profile.slice(
  profile.indexOf('t("profile.supportRowTitle")'),
  profile.indexOf('t("profile.appearanceSection")'),
);
assert.equal((helpCard.match(/\bisLast\b/g) ?? []).length, 1, "Only the last row of the card drops its divider");
assert.ok(
  helpCard.indexOf("isLast") > helpCard.indexOf('openSheet("legal", {})'),
  "…and that row is the documents one",
);

/* The sheet. */

assert.match(read("src/bottom-sheet/types.ts"), /\| "legal"/);
assert.match(
  read("src/bottom-sheet/registry.ts"),
  /legal: \{\s*component: LegalSheet,\s*enableDynamicSizing: true,\s*enablePanDownToClose: true,\s*\},/,
);
const sheet = read("src/bottom-sheet/sheets/LegalSheet.tsx");
assert.match(
  sheet,
  /key: "terms_of_service",[\s\S]{0,200}url: TERMS_OF_SERVICE_URL,[\s\S]{0,80}key: "privacy_policy",[\s\S]{0,200}url: PRIVACY_POLICY_URL,/,
  "Both documents, the offer first",
);
assert.equal((sheet.match(/key: "/g) ?? []).length, 2, "Exactly the two documents");
assert.doesNotMatch(sheet, /https?:\/\//, "The addresses live in config/legalLinks, not in the sheet");
assert.doesNotMatch(sheet, /useAppLinks\(|useOffer|apiClient/, "Nothing about these documents comes from the server");
assert.match(sheet, /accessibilityRole="link"/);
assert.match(sheet, /onPress=\{\(\) => void open\(document\)\}/);
assert.match(sheet, /disabled=\{busy\}/, "One page at a time");
assert.match(sheet, /accessibilityLabel=\{t\("common\.close"\)\}\s*onPress=\{\(\) => closeSheet\(\)\}/);
assert.match(sheet, /paddingBottom: Math\.max\(insets\.bottom, 12\)/, "Clear of the Android navigation bar");

/* Wording in both languages. */

for (const file of ["uz.ts", "ru.ts"]) {
  const translations = read(`src/i18n/translations/${file}`);
  assert.match(translations, /legalRowTitle: "[^"]+",/, file);
  assert.match(translations, /legalRowDescription: "[^"]+",/, file);
  const start = translations.indexOf("\n  legal: {");
  assert.ok(start > 0, `${file} has the legal section`);
  const section = translations.slice(start, start + 700);
  for (const key of ["sheetTitle", "sheetSubtitle", "terms", "privacy"]) {
    assert.match(section, new RegExp(`\\b${key}:`), `${file}: legal.${key}`);
  }
  assert.equal((section.match(/\btitle: "/g) ?? []).length >= 2, true, `${file}: a title per document`);
  assert.equal((section.match(/\bdescription: "/g) ?? []).length >= 2, true, `${file}: a description per document`);
}

console.log("Legal documents: profile row, sheet with the offer and the privacy policy passed");
