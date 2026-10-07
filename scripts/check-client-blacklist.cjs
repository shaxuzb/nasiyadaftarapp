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
  /disabled=\{blacklistedOrganizations\.length === 0\}[\s\S]{0,200}?openSheet\("blacklistOrganizations", \{\s*customerName: displayName,\s*organizations: blacklistedOrganizations,\s*\}\)/,
  "The blacklist badge must open the organizations sheet",
);
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
