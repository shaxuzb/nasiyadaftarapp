const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");

const source = fs.readFileSync(
  "src/modules/subscription/utils/entitlements.ts",
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleExports = {};
vm.runInNewContext(code, { exports: moduleExports });
const free = { maxOrganizations: 1, unlimitedOrganizations: false };
const pro = { maxOrganizations: null, unlimitedOrganizations: true };
assert.equal(moduleExports.canCreateOrganization(free, 1), false);
assert.equal(moduleExports.canCreateOrganization(free, 0), true);
assert.equal(moduleExports.canCreateOrganization(pro, 99), true);
assert.equal(moduleExports.getOrganizationLimitLabel(free, 1), "1/1");
console.log("Subscription organization entitlements passed");
