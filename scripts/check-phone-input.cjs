// Every phone field reads a number through one rule, normalizeUzPhoneDigits:
// "+998 93 998 70 55", "998939987055" and "93 998 70 55", typed or pasted
// after the field's own "+998 ", all become +998 93 998 70 55. The cases
// themselves are in src/utils/masks.test.ts; this keeps every field on the
// rule.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

// The mask library kept the first "998" of a pasted number and shifted the
// rest, so a field given the phone mask goes through the shared formatter.
const appInput = read("src/components/AppInput.tsx");
assert.match(appInput, /const isUzPhone = mask === uzPhoneMask;/);
assert.match(appInput, /\{mask && uncontrolled && !isUzPhone \? \(\s*<LocalMaskInput/);
assert.match(appInput, /onChangeText=\{isUzPhone \? handlePhoneText : onChangeText\}/);
assert.match(appInput, /transformText=\{isUzPhone \? formatUzPhoneFromDigits : transformText\}/);
assert.match(appInput, /onChangeRawText\?\.\(normalizeUzPhoneDigits\(formatted\)\);/, "Screens still get the nine digits");

// The fields: sign-in, phone verification, adding and editing a customer.
for (const file of ["src/screens/PhoneAuthScreen.tsx", "src/modules/account/components/PhoneVerificationModal.tsx"]) {
  assert.match(read(file), /mask=\{uzPhoneMask\}/, `${file}: the phone mask, so the shared rule`);
}
for (const file of ["src/screens/CustomersScreen.tsx", "src/modules/clients/components/CustomerEditSheet.tsx"]) {
  assert.match(read(file), /transformText=\{formatUzPhoneFromDigits\}/, `${file}: the shared formatter`);
}

const masks = read("src/utils/masks.ts");
assert.match(masks, /while \(digits\.length >= 12 && digits\.startsWith\("998"\)\) digits = digits\.slice\(3\);/, "Only a full number loses its 998");
assert.match(masks, /if \("\+998"\.startsWith\(compact\)\) return "";/, "Backspacing into the prefix leaves no number");

console.log("Phone fields: one rule for typed and pasted numbers");
