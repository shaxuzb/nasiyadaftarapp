const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const code = ts.transpileModule(
  fs.readFileSync("src/modules/client-sms/utils/recipientSelection.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const moduleExports = {};
vm.runInNewContext(code, { exports: moduleExports });
assert.deepEqual(
  [...moduleExports.toggleRecipientSelection(new Set([1]), 2)],
  [1, 2],
);
assert.deepEqual(
  [...moduleExports.toggleRecipientSelection(new Set([1, 2]), 1)],
  [2],
);
assert.deepEqual(
  [
    ...moduleExports.selectEligibleRecipients([
      { id: 1, canSend: true, phone: "+998901234567" },
      { id: 2, canSend: false, phone: "+998901234567" },
      { id: 3, canSend: true, phone: "+998901234568" },
    ]),
  ],
  [1, 3],
);
assert.equal(
  moduleExports.reconcileRecipientSelection(new Set([1, 2]), new Set([2, 3]))
    .size,
  0,
);
console.log("SMS recipient selection, eligibility and filter reset passed");
