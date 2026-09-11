const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const appInput = read("src/components/AppInput.tsx");
const searchBar = read("src/components/SearchBar.tsx");
const transaction = read("src/bottom-sheet/sheets/TransactionSheet.tsx");
const blacklist = read("src/screens/BlacklistSettingsScreen.tsx");

assert.match(appInput, /nativeInputRef/);
assert.match(appInput, /nativeInputRef\.current\?\.focus\(\)/);
assert.match(searchBar, /inputRef\.current\?\.focus\(\)/);
assert.match(transaction, /amountRef\.current\?\.focus\(\)/);
assert.match(transaction, /noteRef\.current\?\.focus\(\)/);
assert.match(blacklist, /inputRef\.current\?\.focus\(\)/);
console.log("Input container focus coverage passed");
