const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source =
  fs.readFileSync("src/services/clientsApi.ts", "utf8") +
  "\nexport const mapClientUnderTest = mapClient;";
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleExports = {};
vm.runInNewContext(code, {
  exports: moduleExports,
  require(name) {
    if (name === "./axiosService") return { apiClient: {} };
    if (name.includes("clientList"))
      return { getClientResultCount: (_count, fallback) => fallback };
    return {};
  },
});

const mapped = moduleExports.mapClientUnderTest({
  id: 82,
  fullName: "Ali",
  phoneNumber: "+998901234567",
  isBlacklisted: true,
  overdueBalance: "125000",
  blacklistedOrganizationCount: "2",
  blacklistedOrganizations: [
    { id: 7, name: "Chorsu savdo" },
    { organizationId: 9, organizationName: "Yangi bozor" },
    { id: 0, name: "" },
  ],
});
assert.deepEqual(JSON.parse(JSON.stringify(mapped.blacklistedOrganizations)), [
  { id: 7, name: "Chorsu savdo" },
  { id: 9, name: "Yangi bozor" },
]);
assert.equal(mapped.isBlacklisted, true);
assert.equal(mapped.overdueBalance, 125000);
assert.equal(mapped.blacklistedOrganizationCount, 2);

const defaults = moduleExports.mapClientUnderTest({
  id: 1,
  fullName: "Test",
  phoneNumber: "+998",
});
assert.equal(defaults.isBlacklisted, false);
assert.equal(defaults.overdueBalance, 0);
assert.equal(defaults.blacklistedOrganizationCount, 0);
assert.deepEqual(
  JSON.parse(JSON.stringify(defaults.blacklistedOrganizations)),
  [],
);
// The client detail response, as documented by the backend.
const detailed = moduleExports.mapClientUnderTest({
  id: 82,
  fullName: "Зохиджон akam",
  phoneNumber: "+998913746666",
  isBlacklisted: true,
  blacklistedOrganizationCount: 2,
  blacklistedOrganizations: [
    {
      organizationId: 18,
      organizationName: "Korzinka",
      blacklistedSince: "2026-09-02",
      overdueBalance: 150000.0,
      blacklistAfterDays: 12,
    },
    {
      organizationId: 11,
      organizationName: "Sarvara",
      blacklistedSince: "2026-08-20T00:00:00",
      overdueBalance: "200000.00",
      blacklistAfterDays: 30,
    },
    // Unusable values are left out, not shown as zero or "Invalid date".
    {
      organizationId: 5,
      organizationName: "Chala",
      blacklistedSince: "soon",
      overdueBalance: null,
      blacklistAfterDays: 0,
    },
  ],
});
assert.deepEqual(JSON.parse(JSON.stringify(detailed.blacklistedOrganizations)), [
  { id: 18, name: "Korzinka", blacklistedSince: "2026-09-02", blacklistAfterDays: 12 },
  { id: 11, name: "Sarvara", blacklistedSince: "2026-08-20", blacklistAfterDays: 30 },
  { id: 5, name: "Chala" },
]);
// The per-organization amount arrives in the response and is deliberately not
// carried into the app, so no screen can show it by accident.
assert.equal(
  JSON.stringify(detailed.blacklistedOrganizations).includes("overdueBalance"),
  false,
);

// The profile badge opens the sheet, and only when there is a list to show.
const detailScreen = fs.readFileSync("src/screens/CustomerDetailScreen.tsx", "utf8");
assert.match(
  detailScreen,
  /openSheet\("blacklistOrganizations", \{\s*customerId,\s*customerName: displayName,[\s\S]{0,400}?organizations: blacklistedOrganizations,\s*\}\)/,
  "The profile's blacklist badge must open the organizations sheet",
);

// One rule and one pill everywhere a customer is listed. The lists send only a
// count, with isBlacklisted false when the customer is blacklisted elsewhere:
//   { isBlacklisted: false, blacklistedOrganizationCount: 3 }
const rule = (() => {
  const code = ts.transpileModule(
    fs.readFileSync("src/modules/clients/utils/blacklist.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const out = {};
  vm.runInNewContext(code, { exports: out, require: () => ({}) });
  return out.isCustomerBlacklisted;
})();
assert.equal(rule({ isBlacklisted: false, blacklistedOrganizationCount: 3 }), true);
assert.equal(rule({ isBlacklisted: false, blacklistedOrganizationCount: 0 }), false);

const smsRow = fs.readFileSync("src/modules/client-sms/components/SmsRecipientRow.tsx", "utf8");
assert.match(
  smsRow,
  /isCustomerBlacklisted\(recipient\) \? \(\s*<BlacklistBadge\s+style=\{styles\.blacklistCorner\}\s+customerId=\{recipient\.id\}/,
  "The SMS list must show the badge from the count too, and open the sheet",
);
// Both lists pin the badge to the same corner of the card, and both lists
// leave room above their first row for it.
const corner = /blacklistCorner: \{ position: "absolute", top: -5, right: 12 \}/;
assert.match(smsRow, corner, "The SMS row pins the badge like the customer card does");
assert.match(fs.readFileSync("src/components/CustomerCard.tsx", "utf8"), corner);
assert.match(
  fs.readFileSync("src/screens/ClientSmsScreen.tsx", "utf8"),
  /list: \{ paddingHorizontal: spacing\.md, paddingTop: 6 \}/,
  "Without top padding the first SMS row's badge would be clipped",
);
assert.doesNotMatch(smsRow, /recipient\.isBlacklisted \?/, "isBlacklisted alone misses customers blacklisted elsewhere");

const card = fs.readFileSync("src/components/CustomerCard.tsx", "utf8");
assert.match(
  card,
  /<BlacklistBadge\s+style=\{styles\.blacklistCorner\}\s+customerId=\{customer\.id\}/,
  "The customer list's badge must open the sheet",
);

// The lists do not carry the organizations, so the sheet reads the customer's
// record when it was not handed them.
const blacklistHook = fs.readFileSync("src/modules/clients/hooks/useClientBlacklist.ts", "utf8");
assert.match(blacklistHook, /queryKey: queryKeys\.client\(scope, customerId\)/, "Shares the profile's cached record");
assert.match(blacklistHook, /enabled: enabled && !hasKnown/, "No request when the organizations are already known");

for (const file of ["src/i18n/translations/uz.ts", "src/i18n/translations/ru.ts"]) {
  assert.doesNotMatch(
    fs.readFileSync(file, "utf8"),
    /otherOrganizationsBlacklist/,
    `${file}: the 'other organizations' wording is gone`,
  );
}
const sheet = fs.readFileSync("src/bottom-sheet/sheets/BlacklistOrganizationsSheet.tsx", "utf8");
assert.match(
  sheet,
  /paddingBottom: Math\.max\(insets\.bottom, 12\)/,
  "The sheet must clear the bottom safe area",
);
for (const key of ["blacklistSince", "blacklistLimit"]) {
  assert.match(sheet, new RegExp(`customers\\.${key}"`), `The sheet must show ${key}`);
}
assert.doesNotMatch(
  sheet,
  /overdue|formatLocalizedCurrency/i,
  "The sheet must not show any amount",
);
assert.match(
  fs.readFileSync("src/bottom-sheet/registry.ts", "utf8"),
  /blacklistOrganizations: \{\s*component: BlacklistOrganizationsSheet,/,
);

console.log("Client blacklist mapping and defaults passed");
