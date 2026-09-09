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

const organizationTypes = load("src/modules/organization/types/index.ts");
assert.equal(
  organizationTypes.MAX_ORGANIZATIONS_PER_USER,
  1,
  "Only one organization may be created per user",
);

const settingsScreen = fs.readFileSync(
  "src/screens/BlacklistSettingsScreen.tsx",
  "utf8",
);
assert.match(
  settingsScreen,
  /useCurrentOrganization/,
  "Blacklist settings must read the current organization",
);
assert.match(
  settingsScreen,
  /blacklistAfterDays/,
  "Blacklist settings must use the server-provided day value",
);

const hookSource = fs.readFileSync(
  "src/modules/organization/hooks/useBlacklistSettings.ts",
  "utf8",
);
assert.match(
  hookSource,
  /invalidateQueries/,
  "Saving blacklist settings must invalidate the current organization cache",
);

let request;
const api = load("src/services/organizationsApi.ts", {
  "./axiosService": {
    apiClient: {
      get: async (url, config) => {
        request = { url, config };
        return {
          data: {
            id: 18,
            name: "Korzinka",
            blacklistAfterDays: 1,
          },
        };
      },
    },
  },
});

(async () => {
  const signal = { aborted: false };
  const current = await api.getCurrentOrganization(signal);
  assert.equal(request.url, "/organizations/current");
  assert.equal(request.config.signal, signal);
  assert.equal(current.blacklistAfterDays, 1);
  console.log(
    "Organization blacklist settings and one-org limit checks passed",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
