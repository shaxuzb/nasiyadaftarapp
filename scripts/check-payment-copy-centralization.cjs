const assert = require("node:assert/strict");
const fs = require("node:fs");

const files = [
  "src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx",
  "src/bottom-sheet/sheets/PaymentStatusSheet.tsx",
  "src/bottom-sheet/sheets/PaymentDetailSheet.tsx",
  "src/screens/PaymentHistoryScreen.tsx",
  "src/modules/payments/components/PaymentOrderContent.tsx",
];

const copy = fs.readFileSync(
  "src/modules/payments/i18n/paymentCopy.ts",
  "utf8",
);

assert.match(copy, /export const PAYMENT_COPY: Record<Locale, PaymentCopy>/, "Every language has the payment words");
assert.match(copy, /getPaymentCopy/);
// The words themselves, one file per language, shaped like the Uzbek one.
const uzCopy = fs.readFileSync("src/modules/payments/i18n/locales/uz.ts", "utf8");
assert.match(uzCopy, /pending/);
assert.match(uzCopy, /fulfilled/);
for (const locale of ["ru", "en", "kk", "tg", "ky", "tr", "tk"]) {
  assert.match(copy, new RegExp(`  ${locale}: ${locale}PaymentCopy,`), `${locale}: payment words registered`);
  assert.match(
    fs.readFileSync(`src/modules/payments/i18n/locales/${locale}.ts`, "utf8"),
    new RegExp(`export const ${locale}PaymentCopy: PaymentCopy =`),
  );
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /getPaymentCopy/);
  assert.doesNotMatch(source, /const COPY\s*=/);
}

console.log("Payment copy centralization contract passed");
