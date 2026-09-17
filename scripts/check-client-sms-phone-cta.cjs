const assert = require("node:assert/strict");
const fs = require("node:fs");

const row = fs.readFileSync(
  "src/modules/client-sms/components/SmsRecipientRow.tsx",
  "utf8",
);
const screen = fs.readFileSync("src/screens/ClientSmsScreen.tsx", "utf8");
const customerCard = fs.readFileSync("src/components/CustomerCard.tsx", "utf8");
const customerDetail = fs.readFileSync(
  "src/screens/CustomerDetailScreen.tsx",
  "utf8",
);
const customers = fs.readFileSync("src/screens/CustomersScreen.tsx", "utf8");
const editSheet = fs.readFileSync(
  "src/modules/clients/components/CustomerEditSheet.tsx",
  "utf8",
);
const uz = fs.readFileSync("src/i18n/translations/uz.ts", "utf8");
const ru = fs.readFileSync("src/i18n/translations/ru.ts", "utf8");

assert.match(row, /onAddPhone/);
assert.match(row, /recipient\.phone/);
assert.match(row, /recipientPhoneMissing/);
assert.match(screen, /CustomerEditSheet/);
assert.match(screen, /useClientDetail/);
assert.match(screen, /onAddPhone/);
assert.match(customerCard, /customers\.phoneMissing/);
assert.match(customerDetail, /customers\.phoneMissing/);
assert.match(customers, /isOptionalUzPhoneValid/);
assert.match(customers, /toOptionalStoredUzPhone/);
assert.match(editSheet, /onSave/);
assert.match(uz, /recipientPhoneMissing:\s*"Telefon raqami kiritilmagan"/);
assert.match(ru, /recipientPhoneMissing:\s*"Номер телефона не указан"/);

console.log(
  "SMS missing-phone CTA reuses the client edit flow and optional phone validation is wired",
);
