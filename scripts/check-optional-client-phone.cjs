const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("src/utils/masks.ts", "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleExports = {};
vm.runInNewContext(
  code,
  {
    exports: moduleExports,
    require(name) {
      if (name === "react-native-mask-input") {
        return { createNumberMask: () => [] };
      }
      throw new Error(`Unexpected dependency: ${name}`);
    },
  },
  { filename: "src/utils/masks.ts" },
);

assert.equal(
  moduleExports.isOptionalUzPhoneValid(""),
  true,
  "an empty phone value should be valid for optional client phone input",
);
assert.equal(
  moduleExports.isOptionalUzPhoneValid("+998 "),
  true,
  "the empty formatted phone prefix should be treated as no phone",
);
assert.equal(
  moduleExports.isOptionalUzPhoneValid("+998 90 123 45 67"),
  true,
  "a complete Uzbekistan phone should be valid",
);
assert.equal(
  moduleExports.isOptionalUzPhoneValid("+998 90 123"),
  false,
  "a partially entered phone should remain invalid",
);
assert.equal(
  moduleExports.toOptionalStoredUzPhone("+998 "),
  "",
  "an empty phone should be sent as an empty API string",
);
assert.equal(
  moduleExports.toOptionalStoredUzPhone("+998 90 123 45 67"),
  "+998901234567",
  "a complete phone should be normalized for the API",
);

console.log("Optional client phone validation and API normalization passed");
