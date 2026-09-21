const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const registerSource = fs.readFileSync(
  path.join(root, "src", "screens", "PhoneAuthScreen.tsx"),
  "utf8",
);
const verifySource = fs.readFileSync(
  path.join(root, "src", "screens", "PhoneAuthVerifyScreen.tsx"),
  "utf8",
);
const autoFillSource = fs.readFileSync(
  path.join(root, "src", "modules", "auth", "hooks", "useOtpAutoFill.ts"),
  "utf8",
);

assert.doesNotMatch(
  registerSource,
  /sendSmsCode\(/,
  "registration form must not send SMS before the OTP screen arms the listener",
);
assert.match(
  registerSource,
  /requestPhoneAuthCode\([\s\S]*onGoToVerify\(/,
  "phone auth form must request a code before navigating to verification",
);
assert.match(
  verifySource,
  /const \{ restartListening \} = useOtpAutoFill\(/,
  "OTP screen must control the retriever lifecycle",
);
assert.match(
  verifySource,
  /await restartListening\(\)[\s\S]{0,240}requestPhoneAuthCode\(/,
  "OTP listener must be restarted before sending a resend",
);
assert.match(
  autoFillSource,
  /const restartListening = useCallback\(async/,
  "restartListening must be awaitable",
);
assert.match(
  autoFillSource,
  /addCodeListener|startListening/,
  "OTP hook must use the hashless SMS User Consent bridge",
);
assert.doesNotMatch(
  autoFillSource,
  /@ebrimasamba\/react-native-sms-retriever/,
  "OTP hook must not depend on app-hash SMS Retriever",
);
assert.match(verifySource, /autoStart:\s*true/);

const previousTsLoader = require.extensions[".ts"];
const previousTsxLoader = require.extensions[".tsx"];
const loadTypeScript = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

require.extensions[".ts"] = loadTypeScript;
require.extensions[".tsx"] = loadTypeScript;

try {
  const { AxiosError } = require("axios");
  const { createTranslator } = require(
    path.join(root, "src", "i18n", "translate.ts"),
  );
  const { getLocalizedApiErrorMessage } = require(
    path.join(root, "src", "i18n", "apiErrors.ts"),
  );
  const uz = createTranslator("uz");
  const detail = "Bunday telefon raqamli foydalanuvchi allaqachon mavjud.";
  const conflict = new AxiosError(
    "Conflict",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    { status: 409, data: { detail, status: 409, title: "Conflict" } },
  );

  assert.equal(
    getLocalizedApiErrorMessage(conflict, "auth.register.smsError", uz),
    detail,
    "409 API detail must be shown to the user",
  );

  const unauthorizedDetail = "Login yoki parol noto'g'ri";
  const unauthorized = new AxiosError(
    "Unauthorized",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    {
      status: 401,
      data: {
        title: "Unauthorized",
        status: 401,
        detail: unauthorizedDetail,
      },
    },
  );

  assert.equal(
    getLocalizedApiErrorMessage(unauthorized, "auth.login.error", uz),
    unauthorizedDetail,
    "401 login detail must be shown to the user",
  );
} finally {
  if (previousTsLoader) require.extensions[".ts"] = previousTsLoader;
  else delete require.extensions[".ts"];
  if (previousTsxLoader) require.extensions[".tsx"] = previousTsxLoader;
  else delete require.extensions[".tsx"];
}

console.log("OTP autofill ordering and 409 error checks passed");
