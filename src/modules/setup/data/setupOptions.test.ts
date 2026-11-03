import assert from "node:assert/strict";
import {
  DEFAULT_CURRENCY,
  filterByQuery,
  parseAppSetup,
  SETUP_CURRENCIES,
  SETUP_LANGUAGES,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./setupOptions.ts";

/* Only translated languages can be chosen; the rest are on their way. */

assert.deepEqual(
  SETUP_LANGUAGES.filter((language: { locale: string | null }) => language.locale).map((language: { code: string }) => language.code),
  ["uz", "ru"],
);
assert.deepEqual(
  SETUP_LANGUAGES.filter((language: { locale: string | null }) => !language.locale).map((language: { code: string }) => language.code),
  ["en", "kk", "tg", "ky", "tr", "tk"],
);

/* Ten currencies, so'm first and by default. */

assert.equal(SETUP_CURRENCIES.length, 10);
assert.equal(SETUP_CURRENCIES[0].code, "UZS");
assert.equal(DEFAULT_CURRENCY, "UZS");
assert.equal(new Set(SETUP_CURRENCIES.map((currency: { code: string }) => currency.code)).size, 10, "No currency twice");

/* What is stored, read back safely. */

assert.deepEqual(parseAppSetup(null), { completed: false, currency: "UZS" }, "First launch");
assert.deepEqual(parseAppSetup('{"completed":true,"currency":"USD"}'), { completed: true, currency: "USD" });
assert.deepEqual(parseAppSetup('{"completed":true,"currency":"XYZ"}'), { completed: true, currency: "UZS" }, "An unknown currency falls back");
assert.deepEqual(parseAppSetup("not json"), { completed: false, currency: "UZS" }, "Unreadable: as on first launch");
assert.deepEqual(parseAppSetup("null"), { completed: false, currency: "UZS" });

/* Searching. */

const words = (language: { nativeName: string; code: string }) => `${language.nativeName} ${language.code}`;
assert.deepEqual(filterByQuery(SETUP_LANGUAGES, "рус", words).map((language: { code: string }) => language.code), ["ru"]);
assert.deepEqual(filterByQuery(SETUP_LANGUAGES, "  TR ", words).map((language: { code: string }) => language.code), ["tr"]);
assert.equal(filterByQuery(SETUP_LANGUAGES, "", words).length, SETUP_LANGUAGES.length);

console.log("First launch setup option tests passed");
