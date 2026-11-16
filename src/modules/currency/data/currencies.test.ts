import assert from "node:assert/strict";
import {
  BUILT_IN_CURRENCIES,
  currencyAllowsFraction,
  currencyFlag,
  normalizeCurrencyCode,
  parseCurrencies,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./currencies.ts";

assert.equal(normalizeCurrencyCode(" usd "), "USD");
assert.equal(normalizeCurrencyCode("US"), null);
assert.equal(normalizeCurrencyCode(null), null);

assert.equal(currencyAllowsFraction("UZS"), false, "The sum in whole numbers");
assert.equal(currencyAllowsFraction("USD"), true, "Cents for the others");

assert.equal(currencyFlag("TMT"), "TM");
assert.equal(currencyFlag("XYZ"), null);

const parsed = parseCurrencies([
  { code: "UZS", name: "O'zbek so'mi", symbol: "so'm", unit: "so'm" },
  { code: "usd", name: "AQSH dollari", symbol: "$", unit: "dollar" },
  { code: "USD", name: "duplicate", symbol: "$", unit: "dollar" },
  { code: "bad", name: "x" },
  { code: "GBP", name: "", symbol: "", unit: "" },
]);
assert.deepEqual(
  parsed.map((currency: { code: string; name: string; symbol: string }) => [currency.code, currency.name, currency.symbol]),
  [["UZS", "O'zbek so'mi", "so'm"], ["USD", "AQSH dollari", "$"], ["BAD", "x", "BAD"], ["GBP", "GBP", "GBP"]],
  "Codes normalised, duplicates dropped, gaps filled with the code",
);
assert.equal(parseCurrencies({ data: [{ code: "EUR", symbol: "€" }] })[0].code, "EUR", "Wrapped in data");
assert.equal(parseCurrencies(null).length, BUILT_IN_CURRENCIES.length, "Nothing usable: the built-in list");
assert.equal(BUILT_IN_CURRENCIES.length, 11);

console.log("Currency list tests passed");
