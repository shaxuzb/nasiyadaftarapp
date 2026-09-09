const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const code = ts.transpileModule(
  fs.readFileSync("src/modules/client-sms/utils/smsPermissions.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const moduleExports = {};
vm.runInNewContext(code, { exports: moduleExports });
assert.deepEqual(
  JSON.parse(
    JSON.stringify(moduleExports.getClientSmsCapabilities(["CLIENT_SMS_VIEW"])),
  ),
  {
    canView: true,
    canSendOne: false,
    canSendBulk: false,
    canViewHistory: false,
  },
);
assert.equal(
  moduleExports.getClientSmsCapabilities(["client_sms_view"]).canView,
  false,
);
assert.deepEqual(
  JSON.parse(
    JSON.stringify(
      moduleExports.getClientSmsCapabilities([
        "CLIENT_SMS_VIEW",
        "CLIENT_SMS_SEND",
        "CLIENT_SMS_BULK_SEND",
        "CLIENT_SMS_HISTORY_VIEW",
      ]),
    ),
  ),
  { canView: true, canSendOne: true, canSendBulk: true, canViewHistory: true },
);
console.log("Client SMS exact permission decisions passed");
