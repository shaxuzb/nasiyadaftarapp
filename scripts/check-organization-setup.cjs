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

// The public offer on the first organization: the checkbox is always shown and
// always required. Nothing the server says switches it off or makes it
// optional. The agreement is the user's own act: never ticked for them, and
// sent as `offerAccepted: true`.
const consentSource = fs.readFileSync(
  path.join(root, "src", "modules", "organization", "components", "OfferConsent.tsx"),
  "utf8",
);
const legalLinks = fs.readFileSync(path.join(root, "src", "config", "legalLinks.ts"), "utf8");
assert.match(
  legalLinks,
  /TERMS_OF_SERVICE_URL = "https:\/\/qarzdaftar\.rbsx\.uz\/terms-of-service";/,
);
assert.doesNotMatch(
  screenSource,
  /useOrganizationOffer|useOffer\b|requiredForOrganization|consent\.(visible|required)|isLoading/,
  "the first organization's checkbox does not depend on the offer API",
);
assert.match(
  screenSource,
  /const \[offerAccepted, setOfferAccepted\] = useState\(false\);/,
  "the offer is never accepted on the user's behalf",
);
assert.match(
  screenSource,
  /buildOrganizationSetupPayload\(name, offerAccepted\)/,
  "the user's agreement travels with the request",
);
assert.match(
  screenSource,
  /<View style=\{styles\.consent\}>\s*<OfferConsent/,
  "the checkbox is always on the screen",
);
assert.doesNotMatch(screenSource, /\? \(\s*<View style=\{styles\.consent\}>/, "never behind a condition");
assert.ok(
  screenSource.indexOf("if (!offerAccepted) {") > 0 &&
    screenSource.indexOf("if (!offerAccepted) {") <
      screenSource.indexOf("await handleCreateOrganization(payload);"),
  "no organization is created before the offer is accepted",
);
assert.match(
  screenSource,
  /if \(!offerAccepted\) \{\s*setOfferError\(true\);\s*void hapticError\(\);\s*return;/,
  "going on without agreeing says what is missing",
);
assert.match(
  screenSource,
  /disabled=\{!name\.trim\(\) \|\| !offerAccepted \|\| isSaving\}/,
  "the create button is off until the offer is accepted",
);
assert.match(consentSource, /accessibilityRole="checkbox"/);
assert.match(consentSource, /accessibilityState=\{\{ checked, disabled \}\}/);
assert.match(consentSource, /borderRadius: radius\.full/, "the checkbox is round");
assert.match(
  consentSource,
  /accessibilityRole="link"\s*onPress=\{\(\) =>\s*void open\(\{ key: "terms_of_service", url: TERMS_OF_SERVICE_URL \}\)/,
  "the document's name opens the offer without ticking the box",
);
assert.doesNotMatch(consentSource, /\burl\??: string/, "the link is not a prop: it is always the app's own");
for (const file of ["uz.ts", "ru.ts"]) {
  const translations = fs.readFileSync(
    path.join(root, "src", "i18n", "translations", file),
    "utf8",
  );
  assert.match(translations, /offerConsent: "[^"]*\{link\}[^"]*",/, file + " keeps the slot for the link");
  assert.match(translations, /offerLinkLabel: "[^"]+",/);
  assert.match(translations, /offerRequired: "[^"]+",/);
}

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
  assert.deepEqual(
    buildOrganizationSetupPayload("Korzinka", true),
    { name: "Korzinka", address: "", note: "", offerAccepted: true },
    "an accepted offer travels with the request",
  );
  assert.equal(
    "offerAccepted" in buildOrganizationSetupPayload("Korzinka", false),
    false,
    "without an agreement the field is left out, never sent as false",
  );
} finally {
  if (previousTsLoader) require.extensions[".ts"] = previousTsLoader;
  else delete require.extensions[".ts"];
}

console.log("Mandatory organization setup checks passed");
