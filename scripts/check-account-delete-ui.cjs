const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

const service = read("src/modules/account/services/accountDeletionService.ts");
const section = read("src/modules/account/components/DeleteAccountSection.tsx");
const screen = read("src/screens/AccountSecurityScreen.tsx");
const reauth = read("src/modules/pin-auth/components/SensitiveActionReauthModal.tsx");

assert.match(service, /\/account\/my-account/);
assert.match(section, /deleteMyAccount/);
assert.match(section, /clearPin/);
assert.match(section, /clearPinSetupState/);
assert.match(section, /queryClient\.clear/);
assert.match(section, /submitUnlockPin/);
assert.match(section, /unlockWithBiometrics/);
assert.match(section, /SensitiveActionReauthModal/);
assert.match(screen, /DeleteAccountSection/);
assert.match(reauth, /onSubmitPin/);
assert.match(reauth, /keyboardType="number-pad"/);
assert.match(reauth, /maxLength=\{4\}/);

console.log("Account deletion UI contract passed");
