const assert = require("node:assert/strict");
const fs = require("node:fs");

const types = fs.readFileSync("src/types/index.ts", "utf8");
const navigation = fs.readFileSync("src/navigation/index.tsx", "utf8");

assert.match(types, /RootStackParamList[\s\S]*PaymentHistory:\s*undefined/);
assert.match(types, /OrganizationStackParamList[\s\S]*PaymentHistory:\s*undefined/);

const registrations = navigation.match(/name="PaymentHistory"/g) ?? [];
assert.equal(
  registrations.length,
  2,
  "PaymentHistory must be registered in both main and organization stacks",
);

console.log("Payment navigation contexts contract passed");
