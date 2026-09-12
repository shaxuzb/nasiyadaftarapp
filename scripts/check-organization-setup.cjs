const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const screenPath = path.join(
  root,
  "src",
  "screens",
  "OrganizationSetupScreen.tsx",
);
const screenSource = fs.readFileSync(screenPath, "utf8");

assert.doesNotMatch(
  screenSource,
  /BottomSheetModal|OrganizationCreateSheetContent|enablePanDownToClose/,
  "mandatory setup must not depend on a dismissible bottom sheet",
);
assert.match(
  screenSource,
  /buildOrganizationSetupPayload\(/,
  "setup must submit the dedicated minimal organization payload",
);
assert.match(
  screenSource,
  /BackHandler\.addEventListener\(\s*"hardwareBackPress"/,
  "mandatory setup must consume Android back presses",
);
assert.match(
  screenSource,
  /organization\.setupLogout/,
  "setup must provide a subtle account-switch escape action",
);

const previousTsLoader = require.extensions[".ts"];
const loadTypeScript = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

require.extensions[".ts"] = loadTypeScript;

try {
  const { buildOrganizationSetupPayload } = require(
    path.join(
      root,
      "src",
      "modules",
      "organization",
      "utils",
      "organizationSetup.ts",
    ),
  );

  assert.deepEqual(
    buildOrganizationSetupPayload("  Korzinka  "),
    { name: "Korzinka", address: "", note: "" },
    "setup must trim the name and submit empty optional fields",
  );
  assert.equal(
    buildOrganizationSetupPayload("   "),
    null,
    "setup must reject an empty organization name",
  );
} finally {
  if (previousTsLoader) require.extensions[".ts"] = previousTsLoader;
  else delete require.extensions[".ts"];
}

console.log("Mandatory organization setup checks passed");
