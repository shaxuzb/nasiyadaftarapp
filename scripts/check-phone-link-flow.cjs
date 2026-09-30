// Verifying the phone from inside a screen (SMS send, Telegram bot, Settings)
// must leave the user on that screen and carry on with what they started.
//
// Linking used to replay sign-in, which cleared the organization; the navigator
// fell back to its loading screen and remounted on Customers. An organization
// response could also overwrite the new phone with null.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const between = (source, from, to) => {
  const start = source.indexOf(from);
  assert.ok(start >= 0, `Missing: ${from}`);
  return source.slice(start, source.indexOf(to, start));
};

/* 1. Linking a phone does not replay sign-in. */

const auth = read("src/context/AuthContext.tsx");
const link = between(auth, "const linkPhoneWithCode = useCallback", "const loginWithGoogleIdToken");
assert.doesNotMatch(
  link,
  /completeAuth|resolveOrganizations|setCurrentOrganization|setIsOrganizationLoading|clearOrganizationQueries/,
  "Linking a phone must not reset the organization; that remounts the app on Customers",
);
assert.match(
  link,
  /phoneNumber: response\.user\?\.phoneNumber\?\.trim\(\) \|\| phoneNumber,/,
  "The confirmed phone must end up on the profile even if a later response carries null",
);
assert.match(link, /phoneVerified: true,/);
assert.match(
  link,
  /invalidateQueries\(\{\s*queryKey: queryKeys\.clientSmsRoot\(\),\s*\}\)/,
  "The SMS lists must refetch once the owner's phone is verified",
);

/* 2. The started action continues only after the modal has closed. */

const security = read("src/modules/account/context/AccountSecurityContext.tsx");
const verified = between(security, "const handleVerified = useCallback", "const value = useMemo");
assert.doesNotMatch(
  verified,
  /afterVerified\?\.\(\)/,
  "Running the action while the modal is open can hide its own confirmation on iOS",
);
assert.match(verified, /afterClosedRef\.current = afterVerifiedRef\.current;/);
assert.match(
  security,
  /if \(Platform\.OS !== "ios"\) runAfterClosed\(\);/,
  "Android has no Modal onDismiss, so it continues when the modal is closed",
);
assert.match(security, /onClosed=\{runAfterClosed\}/);

const modal = read("src/modules/account/components/PhoneVerificationModal.tsx");
assert.match(
  modal,
  /onDismiss=\{onClosed\}/,
  "iOS continues from the Modal's onDismiss, after it has animated out",
);

console.log("Phone link keeps the screen, updates the profile and continues after the modal closes");
