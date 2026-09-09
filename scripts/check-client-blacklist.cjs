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
console.log("Client blacklist mapping and defaults passed");
