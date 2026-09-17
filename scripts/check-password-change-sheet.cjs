const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

const types = read("src/bottom-sheet/types.ts");
const registry = read("src/bottom-sheet/registry.ts");
const security = read("src/screens/AccountSecurityScreen.tsx");
const sheetPath = "src/bottom-sheet/sheets/PasswordChangeSheet.tsx";
const sheet = fs.existsSync(sheetPath) ? read(sheetPath) : "";

assert.match(types, /\|\s*"passwordChange"/);
assert.match(types, /passwordChange:\s*PasswordChangeSheetProps/);
assert.match(registry, /passwordChange:/);
assert.match(registry, /passwordChange:[\s\S]*?enableDynamicSizing:\s*true/);
assert.match(sheet, /requestPasswordChange/);
assert.match(sheet, /confirmPasswordChange/);
assert.match(sheet, /BottomSheetScrollView/);
assert.match(sheet, /AndroidSheetKeyboardBridge/);
assert.match(sheet, /setDismissLocked\(loading\)/);
assert.match(
  sheet,
  /Keyboard\.dismiss\(\);\s*setDismissLocked\(false\);\s*closeSheet\(\(\) => showToast/,
  "Successful password changes must unlock the sheet before dismissing it",
);
assert.match(sheet, /paddingBottom:\s*insets\.bottom/);
assert.match(security, /useBottomSheet/);
assert.match(security, /openSheet\("passwordChange",\s*\{\}\)/);
assert.doesNotMatch(security, /passwordStep/);
assert.doesNotMatch(security, /PasswordSmsAutoFill/);

console.log("Password change bottom sheet contract passed");
