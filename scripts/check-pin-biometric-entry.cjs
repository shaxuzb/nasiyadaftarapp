const assert = require("node:assert/strict");
const fs = require("node:fs");

const context = fs.readFileSync(
  "src/modules/pin-auth/context/AppLockContext.tsx",
  "utf8",
);
const gate = fs.readFileSync(
  "src/modules/pin-auth/screens/PinGateScreen.tsx",
  "utf8",
);

assert.match(
  gate,
  /index === 9[\s\S]*biometricEnabled[\s\S]*finger-print-outline/,
);
assert.match(gate, /fontSize: 30/);
console.log("PIN biometric keypad entry and sizing passed");
