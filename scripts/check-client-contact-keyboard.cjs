const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(filename) {
  return fs.readFileSync(filename, "utf8");
}

const customersScreen = read("src/screens/CustomersScreen.tsx");
const appInput = read("src/components/AppInput.tsx");

assert.match(
  customersScreen,
  /phoneInputRef\.current\?\.blur\(\);[\s\S]{0,120}await KeyboardController\.dismiss\(\);/,
  "contact picker must release phone input focus before dismissing the keyboard",
);
assert.match(
  customersScreen,
  /inputResetKey=\{phoneInputKey\}/,
  "customer contact selection must reset the local phone value without remounting the input",
);
assert.doesNotMatch(
  customersScreen,
  /key=\{phoneInputKey\}/,
  "customer contact selection must not remount BottomSheetTextInput",
);
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
