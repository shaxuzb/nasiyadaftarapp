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
// Editing follows the same rule as adding: a customer may have no phone, and
// one without a phone must still be editable (name, note) without adding one.
assert.match(editSheet, /if \(!isOptionalUzPhoneValid\(phone\)\) \{/);
assert.match(editSheet, /phoneNumber: toOptionalStoredUzPhone\(phone\),/);
assert.match(
  editSheet,
  /toOptionalStoredUzPhone\(phone\) !== customer\.phone/,
  "An untouched empty phone must not count as a change",
);
assert.match(editSheet, /label=\{t\("customers\.phoneOptional"\)\}/);
assert.doesNotMatch(
  editSheet,
  /\bisValidUzPhone\b|\btoStoredUzPhone\(/,
  "The edit form must not require a phone",
);
assert.match(customers, /toOptionalStoredUzPhone/);
assert.match(editSheet, /onSave/);
assert.match(uz, /recipientPhoneMissing:\s*"Telefon raqami kiritilmagan"/);
assert.match(ru, /recipientPhoneMissing:\s*"Номер телефона не указан"/);

// The customer detail screen answers a missing number the same way the SMS
// list does. Calling or messaging with no number opens an empty dialer or asks
// WhatsApp who to send to, so those buttons lead to the edit sheet instead.
//
// They must not be marked disabled: a disabled Pressable swallows onPress, and
// telling a screen reader the button does nothing while it opens a sheet is
// worse than either behaviour on its own.
assert.match(
  customerDetail,
  /const hasPhone = Boolean\(customer\.phone\.trim\(\)\)/,
  "Customer detail must know whether a number is attached",
);
assert.match(
  customerDetail,
  /onPress: hasPhone \? \(\) => void openContact\(\) : \(\) => setEditing\(true\)/,
  "Calling without a number must open the edit sheet",
);
assert.match(
  customerDetail,
  /onPress: hasPhone \? \(\) => void openContact\(true\) : \(\) => setEditing\(true\)/,
  "Messaging without a number must open the edit sheet",
);
assert.doesNotMatch(
  customerDetail,
  /disabled=\{!hasPhone\}/,
  "The contact buttons must stay pressable so they can lead to the edit sheet",
);
assert.match(
  customerDetail,
  /accessibilityLabel=\{action\.accessibilityLabel \?\? action\.label\}/,
  "A muted contact button must announce that it adds a number",
);
assert.match(
  customerDetail,
  /customers\.addPhone/,
  "Customer detail must offer an add-number action under the name",
);
assert.match(uz, /addPhone:\s*"Telefonni qo'shish"/);
assert.match(ru, /addPhone:\s*"Добавить телефон"/);

console.log(
  "Missing-phone CTA reuses the client edit flow in both the SMS list and customer detail",
);
