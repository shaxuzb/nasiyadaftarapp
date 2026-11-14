import assert from "node:assert/strict";
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedDateTime,
  formatLocalizedDisplayedBalance,
  registerCurrencySymbols,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./formatters.ts";

const day = formatLocalizedDate(new Date(2026, 9, 21), "uz");

/* The server's time, as it wrote it: nothing worked out, nothing added. */

assert.equal(formatLocalizedDateTime("2026-10-21T15:07:00", "uz"), `${day}, 15:07`);
assert.equal(formatLocalizedDateTime("2026-10-21T15:07:59.123", "uz"), `${day}, 15:07`, "Seconds are left out");
assert.equal(formatLocalizedDateTime("2026-10-21 15:07", "uz"), `${day}, 15:07`);
assert.equal(
  formatLocalizedDateTime("2026-10-21T09:00:00Z", "uz"),
  `${day}, 09:00`,
  "A zone after the time does not move it",
);
assert.equal(formatLocalizedDateTime("2026-10-21T23:30:00+05:00", "uz"), `${day}, 23:30`, "Nor does an offset, nor the day");

/* No time: the date alone, never 00:00. */

assert.equal(formatLocalizedDateTime("2026-10-21", "uz"), day);
assert.equal(formatLocalizedDateTime("  2026-10-21  ", "uz"), day);

/* The phone's own moment shows the phone's clock. */

assert.equal(formatLocalizedDateTime(new Date(2026, 9, 21, 8, 5), "uz"), `${day}, 08:05`);

/* Russian keeps its own date, then the time the same way. */

assert.equal(
  formatLocalizedDateTime("2026-10-21T15:07:00", "ru"),
  `${formatLocalizedDate(new Date(2026, 9, 21), "ru")}, 15:07`,
);

console.log("Date and time formatting tests passed");

/* Amounts: the sum by default (plans, SMS packages), the organization's currency otherwise. */

const nbsp = (text: string) => text.replace(/[  ]/g, " ");
assert.equal(nbsp(formatLocalizedCurrency(250000, "uz")), "250 000 so‘m");
assert.equal(nbsp(formatLocalizedCurrency(250000, "ru")), "250 000 сум");
assert.match(nbsp(formatLocalizedCurrency(120.5, "uz", "USD")), /^120,5 \$$/, "The symbol after the amount");
assert.match(nbsp(formatLocalizedCurrency(120.456, "ru", "EUR")), /^120,46 €$/, "Cents to two places");
assert.equal(nbsp(formatLocalizedCurrency(300, "ru", "EUR")), "300 €", "No cents, none shown");
assert.equal(formatLocalizedCurrency(5, "uz", "GBP").endsWith(" GBP"), true, "An unknown code shows itself");
registerCurrencySymbols([{ code: "GBP", symbol: "£" }]);
assert.equal(formatLocalizedCurrency(5, "uz", "GBP").endsWith(" £"), true, "Then the symbol the server gave");
assert.equal(nbsp(formatLocalizedDisplayedBalance(150, "ru", "USD")), "-150 $", "Owed shows as minus, as before");

console.log("Localized formatter currency tests passed");
