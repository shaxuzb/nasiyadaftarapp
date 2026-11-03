// Every phone field is one component, PhoneNumberInput: the flag and fixed
// calling code on the left open every country in a sheet; the national number
// on the right is formatted the way that country writes it; and whatever is
// typed or pasted is read through one rule (readPhoneInput), so
// "+998 93 998 70 55", "998939987055" and "93 998 70 55" all become
// +998 93 998 70 55. The cases themselves are in phoneNumber.test.ts.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

/* The fields: sign-in, phone verification, adding and editing a customer. */

const FIELDS = [
  "src/screens/PhoneAuthScreen.tsx",
  "src/modules/account/components/PhoneVerificationModal.tsx",
  "src/screens/CustomersScreen.tsx",
  "src/modules/clients/components/CustomerEditSheet.tsx",
];
for (const file of FIELDS) {
  const source = read(file);
  assert.match(source, /<PhoneNumberInput\b/, `${file}: the shared phone field`);
  assert.doesNotMatch(source, /uzPhoneMask|formatUzPhoneFromDigits|toStoredUzPhone|isValidUzPhone/, `${file}: no Uzbek-only helper left`);
}
assert.equal(fs.existsSync("src/utils/masks.ts"), false, "The Uzbek-only helpers are gone");

/* New customers start on the account's own country; sign-in on Uzbekistan. */

const accountCountry = read("src/modules/phone/hooks/useAccountPhoneCountry.ts");
assert.match(accountCountry, /countryOfStored\(phoneNumber\) \?\? DEFAULT_PHONE_COUNTRY/);
assert.match(read("src/screens/CustomersScreen.tsx"), /setPhone\(emptyPhone\(accountCountry\)\);/, "Each new customer form starts there again");
assert.match(read("src/modules/clients/components/CustomerEditSheet.tsx"), /phoneFromStored\(customer\.phone, accountCountry\)/);
assert.match(read("src/screens/PhoneAuthScreen.tsx"), /useState<PhoneValue>\(\(\) => emptyPhone\(\)\)/);

/* The field. */

const input = read("src/modules/phone/components/PhoneNumberInput.tsx");
assert.match(input, /const next = readPhoneInput\(text, valueRef\.current\.country\);/, "Typed and pasted text goes through the one rule");
assert.match(input, /leadingAccessory=\{/);
assert.match(input, /<Text style=\{styles\.flag\}>\{flagOf\(value\.country\)\}<\/Text>\s*<Text style=\{styles\.code\}>\{callingCode\}<\/Text>/);
assert.match(input, /\{pickerOpen \? \(\s*<CountryPickerSheet/, "The country list is mounted only while open");
assert.match(input, /getExampleNumber\(value\.country, examples\)/, "The placeholder is that country's own example");
assert.match(input, /inputResetKey=\{resetKey\}/, "A value set from outside reaches the field without remounting it");

/* The country sheet: over whatever the field is in, searchable, light. */

const sheet = read("src/modules/phone/components/CountryPickerSheet.tsx");
assert.match(sheet, /<Modal transparent statusBarTranslucent/, "In a Modal of its own, so it opens over sheets and dialogs");
assert.match(sheet, /<GestureHandlerRootView/);
assert.match(sheet, /<BottomSheetFlatList/);
assert.match(sheet, /useDeferredValue\(query\)/);
assert.match(sheet, /const CountryRow = memo\(/);
assert.match(sheet, /style=\{sheetFrame\}/, "A centred column on a tablet");
const countries = read("src/modules/phone/data/countries.ts");
assert.match(countries, /const cache = new Map<Locale, readonly PhoneCountry\[\]>\(\);/, "Built once per language");
assert.match(countries, /POPULAR_PHONE_COUNTRIES: readonly CountryCode\[\] = \[\s*"UZ", "RU", "KZ", "KG", "TJ", "TM", "TR", "US",/);

/* What reaches the server and the screens. */

assert.match(read("src/modules/phone/utils/phoneNumber.ts"), /return value\.digits \? `\$\{callingCodeOf\(value\.country\)\}\$\{value\.digits\}` : "";/, "E.164");
assert.match(read("src/screens/PhoneAuthVerifyScreen.tsx"), /maskPhoneForDisplay\(phoneNumber\)/);

console.log("Phone fields: one component, every country, one rule for typed and pasted numbers");
