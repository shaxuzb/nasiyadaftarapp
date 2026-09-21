const fs = require("node:fs");

function read(filename) {
  return fs.readFileSync(filename, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Formatted input performance check failed: ${message}`);
  }
}

const appInput = read("src/components/AppInput.tsx");
const transactionSheet = read("src/bottom-sheet/sheets/TransactionSheet.tsx");

assert(
  /Local(?:Mask|Text)Input/.test(appInput),
  "AppInput must isolate local text and mask input state",
);
assert(
  /uncontrolled\?: boolean/.test(appInput),
  "AppInput must expose an uncontrolled/local state mode",
);
assert(
  /TransactionAmountInput/.test(transactionSheet),
  "transaction amount must use an isolated local input",
);
assert(
  !/value=\{tx\.amount\}[\s\S]{0,180}onChangeText=\{\(value\) => tx\.setAmount\(/.test(
    transactionSheet,
  ),
  "transaction amount must not round-trip formatted value through the parent on every keypress",
);

for (const filename of [
  "src/screens/CustomersScreen.tsx",
  "src/modules/clients/components/CustomerEditSheet.tsx",
  "src/screens/PhoneAuthScreen.tsx",
  "src/modules/account/components/PhoneVerificationModal.tsx",
]) {
  assert(
    /uncontrolled/.test(read(filename)),
    `${filename} must use the local formatted input mode`,
  );
}

assert(
  /uncontrolled[\s\S]{0,120}transformText=\{formatUzPhoneFromDigits\}/.test(
    read("src/screens/CustomersScreen.tsx"),
  ),
  "customer creation phone input must format locally",
);
assert(
  /uncontrolled[\s\S]{0,120}transformText=\{formatUzPhoneFromDigits\}/.test(
    read("src/modules/clients/components/CustomerEditSheet.tsx"),
  ),
  "customer edit phone input must format locally",
);

console.log("Formatted input performance checks passed.");
