// What the app shows follows the language chosen in it, including what comes
// from outside its own translation files:
//
// 1. Requests tell the server the language (Accept-Language), so its texts
//    (errors, plans, lessons, notifications, SMS) come back in it; a change
//    of language fetches them again.
// 2. iOS's own permission dialogs are translated (Info.plist per language).
// 3. The last few sentences written into code are translated.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

/* 1. The server is told the language. */

assert.match(read("src/services/appHeaders.ts"), /headers\["Accept-Language"\] = language;/);
assert.match(read("src/services/axiosService.ts"), /language: getCurrentLocale\(\),/);
assert.match(read("src/modules/app-update/services/appUpdateService.ts"), /"Accept-Language": getCurrentLocale\(\),/);
const languageContext = read("src/i18n/LanguageContext.tsx");
assert.match(languageContext, /setCurrentLocale\(storedLocale\);/, "Known from the first request on");
assert.match(
  languageContext,
  /const changed = getCurrentLocale\(\) !== nextLocale;\s*[\s\S]{0,200}?setCurrentLocale\(nextLocale\);[\s\S]{0,400}?if \(changed\) void queryClient\.invalidateQueries\(\);/,
  "A new language fetches the server's texts again, in it",
);

/* 2. iOS permission dialogs, in Uzbek and Russian. */

const app = JSON.parse(read("app.json")).expo;
assert.deepEqual(app.locales, { uz: "./locales/uz.json", ru: "./locales/ru.json" });
assert.equal(app.ios.infoPlist.CFBundleAllowMixedLocalizations, true);
const PERMISSIONS = ["NSContactsUsageDescription", "NSCameraUsageDescription", "NSFaceIDUsageDescription"];
for (const file of ["locales/uz.json", "locales/ru.json"]) {
  const strings = JSON.parse(read(file));
  assert.deepEqual(Object.keys(strings).sort(), [...PERMISSIONS].sort(), `${file}: every permission the app asks for`);
  for (const key of PERMISSIONS) assert.ok(strings[key].trim().length > 20, `${file}: ${key} says why`);
}
assert.match(JSON.parse(read("locales/ru.json")).NSContactsUsageDescription, /[а-я]/, "The Russian ones are Russian");

/* 3. The sentences that were written into code. */

assert.doesNotMatch(read("src/utils/index.ts"), /Noma'lum mijoz/);
assert.match(read("src/components/CustomerCard.tsx"), /getFullName\(customer, t\("transactions\.customerFallback"\)\)/);
assert.match(read("src/screens/ReportsScreen.tsx"), /t\("reports\.exportFileName"\)/);
assert.match(read("src/modules/reports/services/reportsService.ts"), /createExportFileName\(fileBaseName\)/);
const apiErrors = read("src/i18n/apiErrors.ts");
assert.match(apiErrors, /error\.name === ORGANIZATION_LIMIT_ERROR\) \{[\s\S]{0,200}?t\("organization\.limitTitle"\)[\s\S]{0,80}?t\("organization\.limitHint", \{ limit \}\)/);
const auth = read("src/context/AuthContext.tsx");
assert.match(auth, /throw createOrganizationLimitError\(user\.subscription\?\.maxOrganizations \?\? 0\);/);
assert.doesNotMatch(auth, /ta tashkilot yaratish mumkin/);
for (const [name, file] of [["uz", "src/i18n/translations/uz.ts"], ["ru", "src/i18n/translations/ru.ts"]]) {
  assert.match(read(file), /\n    exportFileName: "[a-z-]+",/, `${name}: a file name in plain letters`);
}

console.log("Localization: the server is told the language, iOS dialogs and the last code sentences are translated");
