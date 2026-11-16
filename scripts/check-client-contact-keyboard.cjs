const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(filename) {
  return fs.readFileSync(filename, "utf8");
}

const customersScreen = read("src/screens/CustomersScreen.tsx");
const appInput = read("src/components/AppInput.tsx");

// Adding and editing a customer share one picker (useContactPicker): each
// releases its phone field, then the picker dismisses the keyboard before it
// asks for access.
const picker = read("src/modules/clients/hooks/useContactPicker.ts");
assert.match(
  picker,
  /await KeyboardController\.dismiss\(\);\s*const existingPermission = await Contacts\.getPermissionsAsync\(\);/,
  "the picker dismisses the keyboard before anything else",
);
assert.match(picker, /permission\.canAskAgain === false[\s\S]{0,160}?Linking\.openSettings\(\)/, "Blocked access leads to the settings");
assert.match(
  customersScreen,
  /phoneInputRef\.current\?\.blur\(\);\s*const contact = await pickContact\(\);/,
  "contact picker must release phone input focus before dismissing the keyboard",
);
const editSheet = read("src/modules/clients/components/CustomerEditSheet.tsx");
assert.match(
  editSheet,
  /phoneRef\.current\?\.blur\(\);\s*const contact = await pickContact\(\);/,
  "Editing a customer picks from contacts the same way",
);
// A picked number reaches the field through its value; PhoneNumberInput
// writes a value set from outside into the field without remounting it.
for (const [name, source] of [["CustomersScreen", customersScreen], ["CustomerEditSheet", editSheet]]) {
  assert.match(source, /if \(contact\.phone\) setPhone\(readPhoneInput\(contact\.phone, phone\.country\)\);/, `${name}: a picked number reaches the phone field`);
  assert.doesNotMatch(source, /<PhoneNumberInput[^>]*\bkey=/, `${name}: the phone field is never remounted`);
}
assert.match(read("src/modules/phone/components/PhoneNumberInput.tsx"), /inputResetKey=\{resetKey\}/);
assert.match(editSheet, /onPress=\{\(\) => void fillFromContact\(\)\}/);
for (const [name, source] of [["CustomersScreen", customersScreen], ["CustomerEditSheet", editSheet]]) {
  assert.match(source, /if \(contact\.fullName\) /, `${name}: a contact without a name leaves the name as typed`);
}
// The note is no longer edited here, and saving keeps the one already there.
assert.doesNotMatch(editSheet, /label=\{t\("transactions\.note"\)\}|setNote/);
assert.match(editSheet, /note: customer\.note \?\? "",/);
assert.match(
  appInput,
  /inputResetKey\?: string \| number/,
  "AppInput must expose a reset key for locally-controlled fields",
);
assert.match(
  appInput,
  /resetKey\?: string \| number/,
  "local input implementation must receive the reset key",
);
assert.match(
  appInput,
  /initialValueRef\.current = initialValue/,
  "local input must retain the latest parent value for an explicit reset",
);
assert.match(
  appInput,
  /useEffect\(\(\) => \{[\s\S]*?resetKey[\s\S]*?valueRef\.current = nextValue[\s\S]*?setValue\(nextValue\)/,
  "local input must synchronize its display value when the reset key changes",
);
assert.match(
  appInput,
  /resetKey=\{inputResetKey\}/,
  "AppInput must pass the reset key to the local input",
);

console.log("Client contact picker keyboard regression contract passed");
