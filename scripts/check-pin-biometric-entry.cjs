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

// The provider holds two similarly named things: `setBiometricEnabledState` is
// the useState setter, while `setBiometricEnabled` is the action that prompts
// the system biometric dialog and writes the preference. They take the same
// boolean, so TypeScript cannot tell them apart at a call site that ignores the
// return value.
//
// Restoring the saved preference on startup must use the setter. Calling the
// action there reads `biometric` from a closure captured before the capability
// was known, bails out with `biometricUnavailable`, and leaves the flag false:
// the Settings toggle then reads as off and the PIN gate hides the biometric
// key entirely, even though the preference is still in SecureStore.
const loadStart = context.indexOf("const load = async () => {");
const loadEnd = context.indexOf("}, [isBootstrapping, user?.id]);", loadStart);
assert.ok(
  loadStart >= 0 && loadEnd > loadStart,
  "PIN provider must keep a load effect keyed on the signed-in user",
);
const loadEffect = context.slice(loadStart, loadEnd);

// `setBiometricEnabledState(` does not contain `setBiometricEnabled(`, so a
// plain search finds only calls to the action.
assert.doesNotMatch(
  loadEffect,
  /setBiometricEnabled\(/,
  "Startup must restore the biometric flag with setBiometricEnabledState, not the action",
);
assert.match(
  loadEffect,
  /setBiometricEnabledState\(\s*updatedRecord\?\.biometricEnabled/,
  "Startup must restore the biometric flag from the stored PIN record",
);

console.log("PIN biometric keypad entry, sizing and startup restore passed");
