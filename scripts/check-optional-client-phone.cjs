// A customer's phone is optional: an empty field is valid and is sent as "",
// a half-typed number is not, a whole one is sent as +<code><number>.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const filename = "src/modules/phone/utils/phoneNumber.ts";
const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const phone = {};
vm.runInNewContext(
  code,
  {
    exports: phone,
    require(name) {
      if (name === "libphonenumber-js") return require("libphonenumber-js");
      throw new Error(`Unexpected dependency: ${name}`);
    },
  },
  { filename },
);

const empty = phone.emptyPhone("UZ");
assert.equal(phone.isOptionalPhoneValid(empty), true, "an empty phone is valid for an optional field");
assert.equal(phone.toE164(empty), "", "an empty phone is sent as an empty string");

const whole = phone.readPhoneInput("90 123 45 67", "UZ");
assert.equal(phone.isOptionalPhoneValid(whole), true, "a complete Uzbek number is valid");
assert.equal(phone.toE164(whole), "+998901234567", "a complete number is sent with its code");

assert.equal(phone.isOptionalPhoneValid(phone.readPhoneInput("90 123", "UZ")), false, "a half-typed number is not");

const american = phone.readPhoneInput("+1 202 555 0123", "UZ");
assert.equal(phone.isOptionalPhoneValid(american), true, "another country's number is valid too");
assert.equal(phone.toE164(american), "+12025550123");

// The customer forms use exactly these.
for (const file of ["src/screens/CustomersScreen.tsx", "src/modules/clients/components/CustomerEditSheet.tsx"]) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /isOptionalPhoneValid\(phone\)/, `${file}: optional phone validation`);
  assert.match(source, /toE164\(phone\)/, `${file}: the number as sent`);
}

console.log("Optional client phone validation and API normalization passed");
