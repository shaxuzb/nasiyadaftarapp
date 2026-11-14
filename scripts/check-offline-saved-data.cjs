// Offline, phase 1: what the server last sent is kept on the phone, in an
// encrypted SQLite database in the app's own files (not its cache), so the
// customers, a customer's history and the reports still open with the server
// down. Writing while it is down is phase 2.
//
// The fallback rules themselves are in src/modules/offline/utils/savedData.test.ts.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

/* The database: encrypted, migrated, and never in the way. */

const app = JSON.parse(read("app.json")).expo;
assert.deepEqual(
  app.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-sqlite"),
  ["expo-sqlite", { useSQLCipher: true }],
  "Encrypted with SQLCipher",
);
const database = read("src/modules/offline/db/database.ts");
assert.match(database, /await raw\.execAsync\(`PRAGMA key = "x'\$\{key\}'"`\);/, "The key is set before anything else");
assert.match(database, /SecureStore\.setItemAsync\(KEY_STORAGE_KEY, key, \{\s*keychainAccessible: SecureStore\.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,/);
assert.match(database, /Crypto\.getRandomBytes\(32\)/, "A random 256-bit key per install");
assert.match(database, /await deleteDatabaseAsync\(DATABASE_NAME\)/, "A file it cannot open is started again");
assert.match(database, /return null;\s*\}\s*\}/, "Unavailable: the app works without it");
assert.match(database, /await migrate\(db, migrations\);/);

const migration = fs.readdirSync("drizzle").filter((file) => file.endsWith(".sql")).map((file) => read(`drizzle/${file}`)).join("\n");
for (const table of ["clients", "client_transactions", "snapshots"]) {
  assert.match(migration, new RegExp("CREATE TABLE `" + table + "`"), `Migrated: ${table}`);
}
assert.match(read("babel.config.js"), /\['inline-import', \{ extensions: \['\.sql'\] \}\],\s*\/\/ Must stay last\.\s*'react-native-reanimated\/plugin',/);
assert.match(read("metro.config.js"), /config\.resolver\.sourceExts\.push\("sql"\);/);

const repository = read("src/modules/offline/db/savedDataRepository.ts");
assert.match(repository, /if \(!changed\(scope, CLIENTS_LIST_KEY, json\)\) return;/, "An unchanged list is not written again");
assert.match(repository, /setTimeout\(\(\) => \{\s*void task\(\)\.catch/, "Saving waits until the screen has drawn, and never throws");
assert.match(repository, /async function read<T>[\s\S]{0,200}?catch \(error\)[\s\S]{0,120}?return null;/, "Reading never throws");

/* The screens. */

const HOOKS = {
  "src/modules/clients/hooks/useClientQueries.ts": ["saveCustomers(scope, customers)", "loadCustomers(scope)", "saveCustomer(scope, fresh)"],
  "src/modules/clients/hooks/useClientDetail.ts": ["saveCustomer(scope, customer)", "saveHistory(scope, id, transactions)", "loadHistory(scope, id)"],
  "src/modules/clients/hooks/useClientSearch.ts": ["searchOnPhone(scope, normalizedSearch)"],
  // Server down: the total owed from the customers sync brought; the last report kept otherwise.
  "src/modules/reports/hooks/useReports.ts": ["saveSnapshot(scope, snapshotKey, report)", "load: loadWhileDown", "reportFromSavedCustomers(customers.data)"],
};
for (const [file, calls] of Object.entries(HOOKS)) {
  const source = read(file);
  assert.match(source, /withSavedDataFallback\(\{/, `${file}: falls back on the saved copy`);
  assert.match(source, /onFresh: reportServerAnswered,\s*onSaved: reportSavedDataShown,/, `${file}: says which it showed`);
  for (const call of calls) assert.ok(source.includes(call), `${file}: ${call}`);
}
for (const file of ["src/modules/clients/hooks/useClientQueries.ts", "src/modules/clients/hooks/useClientDetail.ts", "src/modules/reports/hooks/useReports.ts"]) {
  assert.match(read(file), /useSeedFromSaved\(/, `${file}: opens at once with the saved copy`);
}
assert.match(
  read("src/modules/clients/hooks/useClientSearch.ts"),
  /if \(isServerDown\(\)\) \{\s*const saved = await searchOnPhone/,
  "With the server known down, search does not wait for a timeout per letter",
);
for (const file of ["src/screens/CustomersScreen.tsx", "src/screens/CustomerDetailScreen.tsx", "src/screens/ReportsScreen.tsx"]) {
  assert.match(read(file), /<SavedDataNotice\b/, `${file}: says when the data is the saved copy`);
}
// While it is down, GET /health is asked until it answers (check-offline-sync).
assert.match(read("App.tsx"), /<ServerHealthMonitor \/>/, "The server is tried again while it is down");

/* Signing out. */

assert.match(read("src/context/AuthContext.tsx"), /clearOrganizationQueries\(\);\s*\/\/[^\n]*\n\s*await clearSavedData\(\);/, "Nothing of the account stays on the phone");

/* Wording. */

for (const file of ["src/i18n/translations/uz.ts", "src/i18n/translations/ru.ts"]) {
  assert.match(read(file), /\n  offline: \{\n?\r?\n?\s*savedNotice: "[^"]*\{time\}",/, `${file}: offline.savedNotice`);
}

console.log("Offline phase 1: customers, history and reports kept on the phone, encrypted");
