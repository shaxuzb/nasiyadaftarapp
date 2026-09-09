const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const out = {};
  vm.runInNewContext(code, {
    exports: out,
    require: (name) => mocks[name] ?? {},
  });
  return out;
}
const validation = load("src/modules/organization/utils/blacklistSettings.ts");
assert.equal(validation.parseBlacklistDays("30"), 30);
assert.equal(validation.parseBlacklistDays("1"), 1);
assert.equal(validation.parseBlacklistDays("3650"), 3650);
for (const value of ["", "0", "1.5", "-1", "3651", "abc"])
  assert.equal(validation.parseBlacklistDays(value), null);
let put;
const api = load("src/services/organizationsApi.ts", {
  "./axiosService": {
    apiClient: {
      put: async (url, body) => {
        put = { url, body };
        return { data: undefined };
      },
    },
  },
});
(async () => {
  await api.updateBlacklistSettings({ blacklistAfterDays: 30 });
  assert.deepEqual(JSON.parse(JSON.stringify(put)), {
    url: "/organizations/current/blacklist-settings",
    body: { blacklistAfterDays: 30 },
  });
  console.log("Blacklist day validation and organization PUT payload passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
