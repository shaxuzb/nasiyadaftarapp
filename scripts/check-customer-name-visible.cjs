// A customer's name is how a seller tells people apart, and it is often long:
// "Sherzod aka Mahalla fuqaro yig'inidan". Cut to one line it reads "Sherzod
// aka Maha…" for several customers at once. It wraps instead: up to three
// lines in lists, two in sheets, and in full on the customer's own page.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

const lists = [
  ["src/components/CustomerCard.tsx", /<Text style=\{styles\.name\} numberOfLines=\{3\}>\s*\{getFullName\(customer\)\}/],
  ["src/modules/client-sms/components/SmsRecipientRow.tsx", /<Text numberOfLines=\{3\} style=\{styles\.name\}>\s*\{displayName\}/],
  ["src/modules/client-sms/components/SmsHistoryRow.tsx", /<Text numberOfLines=\{3\} style=\{styles\.name\}>/],
  ["src/screens/ReportsScreen.tsx", /<Text style=\{styles\.debtorName\} numberOfLines=\{3\}>/],
];
for (const [file, pattern] of lists) {
  assert.match(read(file), pattern, `${file}: a long name must wrap, not be cut to one line`);
}

assert.match(
  read("src/screens/CustomerDetailScreen.tsx"),
  /<Text style=\{styles\.name\}>\s*\{displayName\}/,
  "The customer's own page must show the whole name",
);

const sheets = [
  ["src/bottom-sheet/sheets/TransactionSheet.tsx", /<Text style=\{styles\.name\} numberOfLines=\{2\}>\s*\{tx\.name\}/],
  ["src/bottom-sheet/sheets/TransactionDetailSheet.tsx", /style=\{styles\.customerName\} numberOfLines=\{2\}>/],
];
for (const [file, pattern] of sheets) {
  assert.match(read(file), pattern, `${file}: the name gets two lines in a sheet`);
}

// The lists must not assume a fixed row height, or a three-line name would
// throw off scrolling.
for (const file of ["src/screens/CustomersScreen.tsx", "src/screens/ClientSmsScreen.tsx"]) {
  assert.doesNotMatch(read(file), /getItemLayout/, `${file}: rows now vary in height`);
}

console.log("Customer names wrap instead of being cut");
