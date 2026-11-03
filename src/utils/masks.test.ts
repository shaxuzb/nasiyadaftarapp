import assert from "node:assert/strict";
import {
  formatUzPhoneFromDigits,
  isValidUzPhone,
  normalizeUzPhoneDigits,
  toStoredUzPhone,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./masks.ts";

const NUMBER = "939987055";
const SHOWN = "+998 93 998 70 55";

/* Pasted into a field that already shows "+998 ": every way people copy it. */

for (const pasted of [
  "+998 93 998 70 55",
  "+998939987055",
  "998939987055",
  "998 93 998 70 55",
  "93 998 70 55",
  "939987055",
  "(93) 998-70-55",
  "+998 (93) 998-70-55",
]) {
  assert.equal(normalizeUzPhoneDigits("+998 " + pasted), NUMBER, `pasted after the prefix: ${pasted}`);
  assert.equal(formatUzPhoneFromDigits("+998 " + pasted), SHOWN, `shown after the prefix: ${pasted}`);
  // The whole field selected and replaced, or a contact's number.
  assert.equal(normalizeUzPhoneDigits(pasted), NUMBER, `on its own: ${pasted}`);
}

/* Typing, digit by digit, after the prefix. */

assert.equal(formatUzPhoneFromDigits("+998 "), "+998 ");
assert.equal(formatUzPhoneFromDigits("+998 9"), "+998 9");
assert.equal(formatUzPhoneFromDigits("+998 93"), "+998 93");
assert.equal(formatUzPhoneFromDigits("+998 93 998 70 5"), "+998 93 998 70 5");
assert.equal(formatUzPhoneFromDigits("+998 93 998 70 556"), SHOWN.slice(0, -1) + "5", "A tenth digit is not taken");

/* A local number that itself starts with 998 is never cut. */

assert.equal(normalizeUzPhoneDigits("99 812 34 56"), "998123456");
assert.equal(normalizeUzPhoneDigits("+998 99 812 34 56"), "998123456");
assert.equal(normalizeUzPhoneDigits("+998 998"), "998", "Typing 99 8… after the prefix");
assert.equal(normalizeUzPhoneDigits("+998998123456"), "998123456");

/* Backspacing into the prefix empties the number; it does not invent one. */

for (const left of ["+998", "+99", "+9", "+", ""]) {
  assert.equal(normalizeUzPhoneDigits(left), "", `left: ${JSON.stringify(left)}`);
}

/* A trunk zero, and what is stored. */

assert.equal(normalizeUzPhoneDigits("0 93 998 70 55"), NUMBER);
assert.equal(toStoredUzPhone("+998 +998 93 998 70 55"), "+998939987055");
assert.equal(isValidUzPhone("+998 93 998 70 55"), true);
assert.equal(isValidUzPhone("+998 93 998 70"), false);

console.log("Uzbek phone input tests passed");
