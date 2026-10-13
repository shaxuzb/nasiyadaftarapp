import assert from "node:assert/strict";
import {
  getDefaultProviderCode,
  normalizeProviderCode,
  parsePaymentProviders,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./paymentProviders.ts";

/* The documented answer. */

const documented = parsePaymentProviders([
  { code: "payme", title: "Payme", isDefault: true },
  { code: "click", title: "Click", isDefault: false },
]);
assert.deepEqual(documented, [
  { code: "payme", title: "Payme", isDefault: true },
  { code: "click", title: "Click", isDefault: false },
]);
assert.equal(getDefaultProviderCode(documented), "payme");

/* A provider the app has never heard of is kept: it gets a tile with its title. */

assert.deepEqual(parsePaymentProviders([{ code: "Uzum", title: " Uzum Bank " }]), [
  { code: "uzum", title: "Uzum Bank", isDefault: false },
]);

/* Bad entries are skipped; a missing title falls back to the code. */

assert.deepEqual(
  parsePaymentProviders([
    null,
    "payme",
    { title: "No code" },
    { code: "", title: "Empty" },
    { code: "bad code!", title: "Bad" },
    { code: "click" },
    { code: "CLICK", title: "Duplicate" },
    { code: "payme", title: "Payme", isDefault: "true" },
  ]),
  [
    { code: "click", title: "click", isDefault: false },
    { code: "payme", title: "Payme", isDefault: false },
  ],
);

/* Not a list is an error: the caller then pays without a choice. */

assert.deepEqual(parsePaymentProviders([]), []);
for (const payload of [null, undefined, {}, { results: [] }, "payme"]) {
  assert.throws(() => parsePaymentProviders(payload), /not a list/);
}

/* What is chosen before the user touches anything. */

assert.equal(
  getDefaultProviderCode([
    { code: "payme", title: "Payme", isDefault: false },
    { code: "click", title: "Click", isDefault: true },
  ]),
  "click",
  "The server decides the default, not the order",
);
assert.equal(
  getDefaultProviderCode([{ code: "click", title: "Click", isDefault: false }]),
  "click",
  "A single provider is the choice",
);
assert.equal(
  getDefaultProviderCode([
    { code: "payme", title: "Payme", isDefault: false },
    { code: "click", title: "Click", isDefault: false },
  ]),
  null,
  "Several and no default: the user has to say",
);
assert.equal(getDefaultProviderCode([]), null);

/* An order reports its provider in the server's own case. */

assert.equal(normalizeProviderCode("Payme"), "payme");
assert.equal(normalizeProviderCode(" CLICK "), "click");
for (const value of [null, undefined, "", "  ", "pay me", "x".repeat(40)]) {
  assert.equal(normalizeProviderCode(value), null);
}

console.log("Payment provider list tests passed");
