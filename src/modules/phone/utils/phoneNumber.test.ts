import assert from "node:assert/strict";
import {
  countryOfStored,
  flagOf,
  formatNational,
  formatPhoneForDisplay,
  isOptionalPhoneValid,
  isPhoneValid,
  maskPhoneForDisplay,
  phoneFromStored,
  readPhoneInput,
  toE164,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./phoneNumber.ts";

const UZ = { country: "UZ", digits: "939987055" } as const;

/* Every way people copy an Uzbek number, pasted into the UZ field. */

for (const pasted of [
  "+998 93 998 70 55",
  "+998939987055",
  "998939987055",
  "998 93 998 70 55",
  "93 998 70 55",
  "939987055",
  "(93) 998-70-55",
  "0 93 998 70 55",
  "00998 93 998 70 55",
]) {
  assert.deepEqual(readPhoneInput(pasted, "UZ"), UZ, pasted);
}
assert.equal(formatNational(UZ), "93 998 70 55");

/* A local number that itself starts with the calling code is not cut. */

assert.deepEqual(readPhoneInput("99 812 34 56", "UZ"), { country: "UZ", digits: "998123456" });
assert.deepEqual(readPhoneInput("998", "UZ"), { country: "UZ", digits: "998" }, "Typing 99 8… digit by digit");

/* A whole number with its "+" brings its own country. */

assert.deepEqual(readPhoneInput("+1 202 555 0123", "UZ"), { country: "US", digits: "2025550123" });
assert.deepEqual(readPhoneInput("+7 701 123 45 67", "UZ"), { country: "KZ", digits: "7011234567" });
assert.deepEqual(readPhoneInput("+998 93 998 70 55", "US"), UZ);
// Typing "+9…" without a whole number yet stays in the chosen country.
assert.equal(readPhoneInput("+9", "UZ").country, "UZ");

/* Other countries format their own way. */

assert.equal(formatNational({ country: "US", digits: "2025550123" }), "(202) 555-0123");
assert.equal(formatNational({ country: "UZ", digits: "93998" }), "93 998", "As it is typed");
assert.equal(formatNational({ country: "UZ", digits: "" }), "");

/* Validity, storing and reading back. */

assert.equal(isPhoneValid(UZ), true);
assert.equal(isPhoneValid({ country: "UZ", digits: "9399870" }), false);
assert.equal(isOptionalPhoneValid({ country: "UZ", digits: "" }), true);
assert.equal(isOptionalPhoneValid({ country: "UZ", digits: "9399" }), false);
assert.equal(toE164(UZ), "+998939987055");
assert.equal(toE164({ country: "UZ", digits: "" }), "");
assert.deepEqual(phoneFromStored("+998939987055"), UZ);
assert.deepEqual(phoneFromStored("998939987055"), UZ, "Saved before the + was added");
assert.deepEqual(phoneFromStored("939987055"), UZ, "Saved without the code: always Uzbek");
assert.deepEqual(phoneFromStored("+12025550123"), { country: "US", digits: "2025550123" });
assert.deepEqual(phoneFromStored("", "KZ"), { country: "KZ", digits: "" }, "Empty: the field's own country");
assert.equal(countryOfStored("+12025550123"), "US");
assert.equal(countryOfStored("+998939987055"), "UZ");
assert.equal(countryOfStored(""), null);

/* Display. */

assert.equal(formatPhoneForDisplay("+998939987055"), "+998 93 998 70 55");
assert.equal(formatPhoneForDisplay("not a number"), "not a number");
assert.equal(maskPhoneForDisplay("+998939987055"), "+998 ** *** ** 55");
assert.equal(flagOf("UZ"), "🇺🇿");

console.log("Phone number tests passed");
