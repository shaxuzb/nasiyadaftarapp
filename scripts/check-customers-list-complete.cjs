// The customers list always shows every customer.
//
// It used to have a "debtors only" switch next to the count. Someone would
// turn it on, forget about it, add a customer with no debt yet, and not find
// them in the list. The switch is gone, and nothing may narrow the list again
// behind the user's back: search is the only thing that changes what is shown,
// and it is visible in the search field.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

const screen = read("src/screens/CustomersScreen.tsx");
const utils = read("src/modules/clients/utils/clientList.ts");

/* Nothing of the filter is left: state, button, styles, wording, helpers. */

for (const [name, source] of [
  ["CustomersScreen.tsx", screen],
  ["clientList.ts", utils],
  ["uz.ts", read("src/i18n/translations/uz.ts")],
  ["ru.ts", read("src/i18n/translations/ru.ts")],
]) {
  assert.doesNotMatch(
    source,
    /debtorOnly|setDebtorOnly|debtorFilter|countDebtors|emptyDebtors|getCustomerCountLabel/,
    name + " still carries part of the debtor filter",
  );
}

/* The list is built from every customer the screen has. */

assert.match(
  screen,
  /const sourceCustomers = isSearchActive \? searchResult\.customers : customers;/,
  "Search is the only thing that changes which customers are listed",
);
assert.match(
  screen,
  /const listData = useMemo\(\(\) => \{\s*return sortCustomerList\(\s*sourceCustomers\.map\(\(customer\) => \(\{/,
  "Every customer goes into the list",
);
assert.doesNotMatch(screen, /sourceCustomers\.filter\(|filteredCustomers/, "No hidden narrowing of the list");
assert.match(utils, /export function sortCustomerList\(\s*items: readonly CustomerListItem\[\],\s*\): CustomerListItem\[\]/);
assert.doesNotMatch(utils, /\.filter\(/, "Sorting never drops a customer");

/* The row under the search field is just the count now. */

assert.match(
  screen,
  /<View style=\{styles\.searchMeta\}>\s*<Text style=\{styles\.customerCount\}>\{customerCountLabel\}<\/Text>\s*<\/View>/,
);

/* An empty list always offers to add the first customer, unless a search is
   what emptied it. */

assert.match(screen, /action=\{\s*!isSearchActive \? \(\s*<PrimaryButton\s*label=\{t\("customers\.addAction"\)\}/);

console.log("Customers list: always complete, no debtor filter left passed");
