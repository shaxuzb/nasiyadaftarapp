const assert = require("node:assert/strict");
const fs = require("node:fs");

// The organization's currency (organization-currency.md): debts, payments
// and balances in it; plans and SMS packages always in so'm; changed only by
// someone who may edit the organization, after a plain warning.
const read = (file) => fs.readFileSync(file, "utf8");

/* Debts, payments and balances: in the organization's currency. */

for (const file of [
  "src/components/CustomerCard.tsx",
  "src/screens/CustomerDetailScreen.tsx",
  "src/screens/ReportsScreen.tsx",
  "src/bottom-sheet/sheets/TransactionSheet.tsx",
  "src/bottom-sheet/sheets/TransactionDetailSheet.tsx",
  "src/modules/client-sms/components/SmsRecipientRow.tsx",
  "src/modules/client-sms/components/AutoReminderCard.tsx",
]) {
  const source = read(file);
  assert.match(source, /useMoney\(\)/, `${file}: amounts in the organization's currency`);
  assert.doesNotMatch(source, /formatLocalizedCurrency\([^)]*, locale\)|formatLocalizedDisplayedBalance\([^)]*, locale\)/, `${file}: no amount left in so'm`);
}
assert.match(read("src/screens/ReportsScreen.tsx"), /formatLocalizedCurrency\(item\.balance, locale, currencyCode\)/);
assert.doesNotMatch(read("src/utils/index.ts"), /so'm/, "No amount helper with so'm written into it");

/* Plans and SMS packages: always so'm (the default). */

for (const file of [
  "src/screens/SubscriptionScreen.tsx",
  "src/modules/subscription/components/SmsPackageRow.tsx",
  "src/modules/subscription/components/PlanPeriodPicker.tsx",
  "src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx",
  "src/screens/PaymentHistoryScreen.tsx",
]) {
  assert.doesNotMatch(read(file), /useMoney|currencyCode/, `${file}: paid in so'm, whatever the book's currency`);
}

const formatters = read("src/i18n/formatters.ts");
assert.match(formatters, /currencyCode: string = BASE_CURRENCY_CODE/, "So'm unless told otherwise");
assert.match(formatters, /maximumFractionDigits: 2/, "Cents to two places");

/* Where the currency comes from, and how it changes. */

const api = read("src/services/organizationsApi.ts");
assert.match(api, /apiClient\.put<unknown>\("\/organizations\/current\/currency", \{ currencyCode \}\)/);
assert.match(api, /currencyCode:\s*typeof item\.currencyCode === "string"/, "The organization list keeps its currency");
assert.match(read("src/modules/currency/services/currencyService.ts"), /apiClient\.get<unknown>\("\/currencies"/);
const auth = read("src/context/AuthContext.tsx");
assert.match(auth, /const applyOrganizationUpdate = useCallback/);
assert.match(auth, /if \(organization\.currencyCode\) return;\s*void getCurrentOrganization\(\)/, "Asked once, only when the list does not say it");

// Chosen once, right after an organization is created; never on first launch.
assert.match(auth, /await markCurrencySetupPending\(user\.id, target\.id\);\s*setIsOrganizationLoading\(true\);/);
const gate = read("src/modules/currency/components/OrganizationCurrencySetupGate.tsx");
assert.match(gate, /currentOrganization\?\.id === pending\.organizationId/);
assert.match(gate, /await clearCurrencySetupPending\(\);/, "Chosen: never asked again");
assert.match(gate, /onRequestClose=\{\(\) => undefined\}/, "Not skipped with the back button");
assert.match(read("App.tsx"), /<OrganizationCurrencySetupGate \/>/);
assert.doesNotMatch(read("src/modules/setup/screens/FirstLaunchSetup.tsx"), /useNamedCurrencies/);

// Told by code ("UZS", "USD"), not by a flag that reads like a language.
for (const file of ["src/bottom-sheet/sheets/OrganizationCurrencySheet.tsx", "src/screens/SettingsScreen.tsx", "src/modules/currency/components/OrganizationCurrencySetupGate.tsx"]) {
  assert.doesNotMatch(read(file), /currencyFlag/, `${file}: no currency flags`);
}

const settings = read("src/screens/SettingsScreen.tsx");
assert.match(settings, /\.includes\("ORGANIZATION_UPDATE"\)/, "Only someone who may edit the organization");
assert.match(settings, /openSheet\("organizationCurrency", \{\}\)/);
const sheet = read("src/bottom-sheet/sheets/OrganizationCurrencySheet.tsx");
assert.match(sheet, /const accepted = await confirm\(\{\s*title: t\("currency\.confirmTitle"\)/, "Asked before changing");
assert.match(sheet, /if \(!accepted\) return;/);
assert.match(read("src/modules/offline/state/connectionNotice.ts"), /"organizationCurrency"/, "Needs the server");

for (const [name, source] of [["uz", read("src/i18n/translations/uz.ts")], ["ru", read("src/i18n/translations/ru.ts")]]) {
  for (const key of ["rowTitle", "sheetTitle", "note", "confirmTitle", "confirmMessage", "confirm", "changed", "changeError"]) {
    assert.match(source.slice(source.indexOf("\n  currency: {")), new RegExp(`\\n    ${key}: "`), `${name}: currency.${key}`);
  }
  assert.match(source, /confirmMessage: "[^"]*\{from\}[^"]*\{to\}/, `${name}: the warning shows what an amount turns into`);
}

console.log("Organization currency: amounts in it, plans in so'm, from the server, changed with a warning");
