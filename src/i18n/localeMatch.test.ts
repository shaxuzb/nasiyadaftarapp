import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { matchSupportedLocale } from "./localeMatch.ts";

assert.equal(matchSupportedLocale(["kk-KZ"]), "kk");
assert.equal(matchSupportedLocale(["uz-Cyrl-UZ"]), "uz");
assert.equal(matchSupportedLocale(["en_US"]), "en");
assert.equal(matchSupportedLocale(["kaa"]), null, "Not a language the app has");
assert.equal(matchSupportedLocale(["de-DE", "ru-RU"]), "ru", "The first one the app has");
assert.equal(matchSupportedLocale(["de-DE", null, undefined]), null, "None: the default stays");
assert.equal(matchSupportedLocale([]), null);

console.log("Device language matching tests passed");
