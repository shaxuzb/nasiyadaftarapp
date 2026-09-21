const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const entry = path.join(root, "src", "i18n", "translate.ts");
const languageContext = path.join(root, "src", "i18n", "LanguageContext.tsx");
const languageSheet = path.join(
  root,
  "src",
  "bottom-sheet",
  "sheets",
  "LanguageSheet.tsx",
);
const languageSelector = path.join(
  root,
  "src",
  "components",
  "LanguageSelectorButton.tsx",
);
const apiErrors = path.join(root, "src", "i18n", "apiErrors.ts");
const bottomSheetTypes = fs.readFileSync(
  path.join(root, "src", "bottom-sheet", "types.ts"),
  "utf8",
);
const bottomSheetRegistry = fs.readFileSync(
  path.join(root, "src", "bottom-sheet", "registry.ts"),
  "utf8",
);
const settingsSource = fs.readFileSync(
  path.join(root, "src", "screens", "SettingsScreen.tsx"),
  "utf8",
);
const phoneAuthSource = fs.readFileSync(
  path.join(root, "src", "screens", "PhoneAuthScreen.tsx"),
  "utf8",
);
const authScreenPaths = [
  "PhoneAuthVerifyScreen.tsx",
].map((filename) => path.join(root, "src", "screens", filename));
const accountFeaturePaths = [
  path.join(root, "src", "navigation", "index.tsx"),
  path.join(root, "src", "screens", "OrganizationSelectScreen.tsx"),
  path.join(root, "src", "screens", "OrganizationSetupScreen.tsx"),
  path.join(root, "src", "screens", "BlacklistSettingsScreen.tsx"),
  path.join(root, "src", "screens", "SubscriptionScreen.tsx"),
  path.join(
    root,
    "src",
    "modules",
    "organization",
    "components",
    "OrganizationCreateSheetContent.tsx",
  ),
  path.join(
    root,
    "src",
    "modules",
    "subscription",
    "components",
    "SubscriptionUpgradeModal.tsx",
  ),
  path.join(root, "src", "screens", "CustomersScreen.tsx"),
  path.join(root, "src", "screens", "CustomerDetailScreen.tsx"),
  path.join(root, "src", "bottom-sheet", "sheets", "TransactionSheet.tsx"),
  path.join(
    root,
    "src",
    "bottom-sheet",
    "sheets",
    "TransactionDetailSheet.tsx",
  ),
  path.join(
    root,
    "src",
    "modules",
    "clients",
    "components",
    "CustomerEditSheet.tsx",
  ),
  path.join(root, "src", "screens", "AccountSecurityScreen.tsx"),
  path.join(root, "src", "modules", "pin-auth", "screens", "PinGateScreen.tsx"),
  path.join(root, "src", "modules", "pin-auth", "screens", "PinChangeScreen.tsx"),
  path.join(root, "src", "screens", "ReportsScreen.tsx"),
  path.join(root, "src", "screens", "NotificationsScreen.tsx"),
  path.join(root, "src", "screens", "NotificationSettingsScreen.tsx"),
];
const appSource = fs.readFileSync(path.join(root, "App.tsx"), "utf8");

assert.equal(fs.existsSync(entry), true, "src/i18n/translate.ts must exist");
assert.equal(
  fs.existsSync(languageContext),
  true,
  "src/i18n/LanguageContext.tsx must exist",
);
assert.match(appSource, /LanguageProvider/);
assert.equal(fs.existsSync(languageSheet), true, "LanguageSheet must exist");
assert.equal(
  fs.existsSync(languageSelector),
  true,
  "LanguageSelectorButton must exist",
);
assert.equal(fs.existsSync(apiErrors), true, "apiErrors.ts must exist");
assert.match(bottomSheetTypes, /"language"/);
assert.match(bottomSheetRegistry, /language:/);
assert.match(settingsSource, /openSheet\("language", \{\}\)/);
assert.match(phoneAuthSource, /LanguageSelectorButton/);
for (const filename of [
  path.join(root, "src", "screens", "PhoneAuthScreen.tsx"),
  ...authScreenPaths,
]) {
  assert.match(fs.readFileSync(filename, "utf8"), /useTranslation/);
}
for (const filename of accountFeaturePaths) {
  assert.match(fs.readFileSync(filename, "utf8"), /useTranslation/);
}

const previousTsLoader = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

try {
  const translator = require(entry);
  const apiErrorMessages = require(apiErrors);
  const { AxiosError } = require("axios");
  const uz = translator.createTranslator("uz");
  const ru = translator.createTranslator("ru");

  assert.equal(translator.isSupportedLocale("uz"), true);
  assert.equal(translator.isSupportedLocale("ru"), true);
  assert.equal(translator.isSupportedLocale("en"), false);
  assert.equal(uz("common.save"), "Saqlash");
  assert.equal(ru("common.save"), "Сохранить");
  assert.equal(
    uz("common.greeting", { fullName: "Ali" }),
    "Salom, Ali",
  );
  assert.equal(ru("common.greeting", { fullName: "Ali" }), "Привет, Ali");
  assert.equal(ru("common.missing"), uz("common.missing"));
  const unauthorized = new AxiosError(
    "unauthorized",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    { status: 401, data: {} },
  );
  assert.equal(
    apiErrorMessages.getLocalizedApiErrorMessage(
      unauthorized,
      "errors.generic",
      ru,
    ),
    "Сессия завершена. Войдите снова",
  );
} finally {
  if (previousTsLoader) {
    require.extensions[".ts"] = previousTsLoader;
  } else {
    delete require.extensions[".ts"];
  }
}

console.log("Localization core checks passed");
