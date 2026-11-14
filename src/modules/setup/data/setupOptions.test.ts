import assert from "node:assert/strict";
import {
  filterByQuery,
  parseAppSetup,
  SETUP_LANGUAGES,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./setupOptions.ts";

/* Every language is translated and can be chosen. */

assert.deepEqual(
  SETUP_LANGUAGES.map((language: { code: string }) => language.code),
  ["uz", "ru", "en", "kk", "tg", "ky", "tr", "tk"],
);
assert.ok(
  SETUP_LANGUAGES.every((language: { locale: string | null; code: string }) => language.locale === language.code),
  "None left as coming soon",
);

/* What is stored, read back safely. */

assert.deepEqual(parseAppSetup(null), { completed: false }, "First launch");
assert.deepEqual(parseAppSetup('{"completed":true}'), { completed: true });
assert.deepEqual(parseAppSetup('{"completed":true,"currency":"USD"}'), { completed: true }, "An old stored currency is let go");
assert.deepEqual(parseAppSetup("not json"), { completed: false }, "Unreadable: as on first launch");
assert.deepEqual(parseAppSetup("null"), { completed: false });

/* Searching. */

const words = (language: { nativeName: string; code: string }) => `${language.nativeName} ${language.code}`;
assert.deepEqual(filterByQuery(SETUP_LANGUAGES, "рус", words).map((language: { code: string }) => language.code), ["ru"]);
assert.deepEqual(filterByQuery(SETUP_LANGUAGES, "  TR ", words).map((language: { code: string }) => language.code), ["tr"]);
assert.equal(filterByQuery(SETUP_LANGUAGES, "", words).length, SETUP_LANGUAGES.length);

console.log("First launch setup option tests passed");
