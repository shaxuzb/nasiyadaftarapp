// The SMS screen lists the customers a debt reminder can go to: those who owe
// something. That is built in, not a filter chip. The three chips it used to
// have (blacklist, debtor, "SMS possible") are gone, and so is the unused
// "filter debtors" button the search bar carried.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const sms = read("src/screens/ClientSmsScreen.tsx");
const search = read("src/components/SearchBar.tsx");
const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");

/* Always customers with a debt; search is the only thing the user changes. */

assert.match(
  sms,
  /const queryFilters = useMemo<SmsRecipientFilters>\(\s*\(\) => \(\{\s*search: debouncedSearch \|\| undefined,\s*hasDebt: true,\s*\}\),\s*\[debouncedSearch\],\s*\);/,
  "The recipients request always asks for customers with a debt",
);
assert.match(sms, /useSmsRecipients\(queryFilters\)/);

/* No chips, and nothing they needed. */

assert.doesNotMatch(
  sms,
  /BooleanFilter|setFilters|toggleFilter|blacklistAvailable|styles\.chip|styles\.filters|sms\.filter|ScrollView/,
  "Part of the filter chips is still on the SMS screen",
);
assert.doesNotMatch(sms, /\bblacklisted: |\bcanSend: true/, "No other filter is sent behind the user's back");
for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru]]) {
  assert.doesNotMatch(
    source,
    /filterBlacklist|filterDebtor|filterCanSend|filterDebtors/,
    name + ": wording of the removed filters is still there",
  );
}

/* The screen says what it is showing, and an empty list says why. */

assert.match(uz, /    count: "\{count\} ta qarzdor mijoz",/);
assert.match(ru, /    count: "Должников: \{count\}",/);
assert.match(uz, /    emptyTitle: "Qarzdor mijoz yo'q",/);
assert.match(ru, /    emptyTitle: "Должников нет",/);
assert.doesNotMatch(uz, /filterlarni o'zgartirib/, "The empty state must not point at filters that do not exist");
assert.match(
  sms,
  /title=\{\s*debouncedSearch\s*\? t\("sms\.searchEmptyTitle"\)\s*: t\("sms\.emptyTitle"\)\s*\}/,
  "No debtors and nothing found are different things to say",
);

/* The search bar is a search bar. */

assert.doesNotMatch(search, /onFilterPress|filterActive|filterButton|options-outline/);
for (const file of [
  "src/screens/CustomersScreen.tsx",
  "src/screens/ClientSmsScreen.tsx",
  "src/screens/ClientSmsHistoryScreen.tsx",
]) {
  assert.match(read(file), /<SearchBar\b/, file + " still uses the search bar");
}

console.log("SMS screen: debtors only, no filter chips, no leftovers passed");
