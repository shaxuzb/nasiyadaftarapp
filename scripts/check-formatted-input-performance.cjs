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

// Every phone field is PhoneNumberInput, which formats in the local input:
// the parent hears the number, not every formatted keystroke round-tripped.
for (const filename of [
  "src/screens/CustomersScreen.tsx",
  "src/modules/clients/components/CustomerEditSheet.tsx",
  "src/screens/PhoneAuthScreen.tsx",
  "src/modules/account/components/PhoneVerificationModal.tsx",
]) {
  assert(
    /<PhoneNumberInput\b/.test(read(filename)),
    `${filename} must use the local formatted phone input`,
  );
}
const phoneInput = read("src/modules/phone/components/PhoneNumberInput.tsx");
assert(
  /uncontrolled[\s\S]{0,200}transformText=\{transformText\}/.test(phoneInput),
  "the phone input must format locally",
);
assert(
  /inputResetKey=\{resetKey\}/.test(phoneInput),
  "a number set from outside must reach the field without remounting it",
);

console.log("Formatted input performance checks passed.");
