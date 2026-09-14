const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const moduleConfigPath = path.join(
  root,
  "modules",
  "sms-user-consent",
  "expo-module.config.json",
);
const nativeModulePath = path.join(
  root,
  "modules",
  "sms-user-consent",
  "android",
  "src",
  "main",
  "java",
  "com",
  "rbsx",
  "smsuserconsent",
  "SmsUserConsentModule.kt",
);
const bridgePath = path.join(
  root,
  "src",
  "modules",
  "auth",
  "smsUserConsent.ts",
);
const nativeBridgePath = path.join(
  root,
  "modules",
  "sms-user-consent",
  "src",
  "index.ts",
);
const hookPath = path.join(
  root,
  "src",
  "modules",
  "auth",
  "hooks",
  "useOtpAutoFill.ts",
);
const verifyPath = path.join(
  root,
  "src",
  "screens",
  "RegisterSmsVerifyScreen.tsx",
);

assert.equal(
  fs.existsSync(moduleConfigPath),
  true,
  "local SMS Consent module config must exist",
);
assert.equal(
  fs.existsSync(nativeModulePath),
  true,
  "Android SMS Consent native module must exist",
);
assert.equal(
  fs.existsSync(bridgePath),
  true,
  "JS SMS Consent bridge must exist",
);
assert.equal(
  fs.existsSync(nativeBridgePath),
  true,
  "local module JS bridge must exist",
);

const moduleConfig = JSON.parse(fs.readFileSync(moduleConfigPath, "utf8"));
const nativeSource = fs.readFileSync(nativeModulePath, "utf8");
const bridgeSource = fs.readFileSync(bridgePath, "utf8");
const nativeBridgeSource = fs.readFileSync(nativeBridgePath, "utf8");
const hookSource = fs.readFileSync(hookPath, "utf8");
const verifySource = fs.readFileSync(verifyPath, "utf8");

assert.deepEqual(moduleConfig.platforms, ["android"]);
assert.deepEqual(moduleConfig.android.modules, [
  "com.rbsx.smsuserconsent.SmsUserConsentModule",
]);
assert.match(nativeSource, /startSmsUserConsent\(null\)/);
assert.match(nativeSource, /EXTRA_CONSENT_INTENT/);
assert.match(nativeSource, /OnActivityResult/);
assert.match(
  nativeSource,
  /Events\(EVENT_CODE_RECEIVED, EVENT_CONSENT_CANCELLED, EVENT_ERROR\)/,
);
assert.doesNotMatch(nativeSource, /READ_SMS|RECEIVE_SMS/);
assert.match(nativeBridgeSource, /requireOptionalNativeModule/);
assert.match(bridgeSource, /addCodeListener/);
assert.match(bridgeSource, /startListening/);
assert.match(hookSource, /startListening/);
assert.doesNotMatch(
  hookSource,
  /appHash/,
  "OTP hook must not expose the obsolete app-hash contract",
);
assert.match(
  hookSource,
  /void armListener\(\)\.catch\(\(\) => \{/,
  "OTP hook must arm the Consent listener automatically for non-registration flows",
);
assert.match(
  hookSource,
  /return \(\) => \{\s*stopListening\(\)/,
  "OTP hook must stop the native listener when the OTP flow unmounts",
);
assert.doesNotMatch(hookSource, /@ebrimasamba\/react-native-sms-retriever/);
assert.match(
  verifySource,
  /await restartListening\(\)[\s\S]{0,240}await sendSmsCode\(/,
);

const previousTsLoader = require.extensions[".ts"];
const loadTypeScript = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

require.extensions[".ts"] = loadTypeScript;

try {
  const { extractOtpCode } = require(
    path.join(root, "src", "modules", "auth", "utils", "otp.ts"),
  );
  assert.equal(
    extractOtpCode(
      "Nasiya Daftar ilovaga ro‘yxatdan o‘tish uchun tasdiqlash kodi: 803541",
    ),
    "803541",
  );
} finally {
  if (previousTsLoader) require.extensions[".ts"] = previousTsLoader;
  else delete require.extensions[".ts"];
}

console.log("SMS User Consent integration checks passed");
