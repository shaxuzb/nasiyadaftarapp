// Two rules govern the device PIN, and both are easy to undo by accident.
//
// 1. Too many wrong PINs pause entry on an escalating ladder. They must never
//    sign the user out again: losing a session because a child tapped the
//    keypad is a far worse outcome than waiting 30 seconds.
// 2. Signing out on purpose clears the PIN, so the next sign-in sets one up
//    again. A session that ended on its own — an expired token, a revoked
//    session — must leave the PIN alone, or a dropped connection would look
//    like a security event and force the owner to configure it again.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function load(file) {
  const code = ts.transpileModule(read(file), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({}) }, { filename: file });
  return exports;
}

const security = read("src/modules/pin-auth/services/pinSecurity.ts");
const appLock = read("src/modules/pin-auth/context/AppLockContext.tsx");
const auth = read("src/context/AuthContext.tsx");
const factory = read("src/modules/pin-auth/services/pinStorageFactory.ts");

/* 1. Wrong PINs pause entry instead of signing out. */

assert.doesNotMatch(
  security,
  /mustLogout/,
  "Failed PIN attempts must not report a logout requirement",
);

const submitUnlockPin = appLock.slice(
  appLock.indexOf("const submitUnlockPin = useCallback"),
  appLock.indexOf("const verifyCurrentPin = useCallback"),
);
assert.ok(submitUnlockPin, "AppLockContext must keep submitUnlockPin");
assert.doesNotMatch(
  submitUnlockPin,
  /logout\(/,
  "A wrong PIN must never sign the user out",
);
assert.match(
  submitUnlockPin,
  /lockedUntilMs/,
  "A wrong PIN must report how long entry stays closed",
);

/* 2. The lockout deadline is persisted, so closing the app does not clear it. */

assert.match(
  factory,
  /lockedUntil/,
  "The stored PIN record must carry the lockout deadline",
);
assert.match(
  factory,
  /record\.lockedUntil === undefined/,
  "Records written before lockouts existed must still validate, or upgrading deletes a working PIN",
);
assert.match(
  appLock,
  /parseLockedUntil\(\s*updatedRecord\?\.lockedUntil/,
  "Startup must restore a lockout that was still running when the app closed",
);

/* 3. The escalating ladder is what the app actually uses. */

const lockout = load("src/modules/pin-auth/utils/pinLockout.ts");
assert.equal(lockout.getLockoutDurationMs(4), null, "Four failures must not lock");
assert.equal(lockout.getLockoutDurationMs(5), 30_000, "The fifth failure locks for 30s");
assert.ok(
  lockout.getLockoutDurationMs(6) > lockout.getLockoutDurationMs(5),
  "Repeated failures must wait longer each time",
);
assert.equal(
  lockout.getLockoutDurationMs(99),
  lockout.MAX_LOCKOUT_MS,
  "The ladder must stop at its longest rung rather than growing without bound",
);

/* 4. A deliberate sign-out clears the PIN; an expired session keeps it. */

assert.match(
  auth,
  /clearPinForUser/,
  "Signing out must clear the device PIN",
);
assert.match(
  auth,
  /if \(!options\?\.preservePin\) \{\s*await clearPinForUser/,
  "PIN clearing must be skippable for sessions that ended on their own",
);
assert.match(
  auth,
  /setUnauthorizedHandler\(\(\) => \{[\s\S]*?logout\(\{ preservePin: true \}\)/,
  "An expired session must keep the PIN in place",
);

/* 5. Locking the app is only offered, and only possible, with a PIN set.
 *
 * Raising the gate without a stored PIN produces a lock nothing can open: the
 * unlock screen rejects every entry because there is no record to compare
 * against, so signing out becomes the only way back in.
 */

const securityScreen = read("src/screens/AccountSecurityScreen.tsx");

assert.match(
  appLock,
  /lockNow: \(\) => \{[\s\S]*?if \(!pinEnabled\) return;[\s\S]*?setLocked\(true\);/,
  "lockNow must refuse to raise the gate when no PIN is stored",
);
assert.match(
  securityScreen,
  /\{pinEnabled \? \([\s\S]*?security\.appLockSection/,
  "The app-lock row must be hidden while no PIN is set",
);

console.log("PIN lockout ladder, sign-out clearing and lock guard contract passed");
