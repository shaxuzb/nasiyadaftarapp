const assert = require("node:assert/strict");
const fs = require("node:fs");

const files = [
  "PaymentCheckoutSheet.tsx",
  "PaymentStatusSheet.tsx",
  "PaymentDetailSheet.tsx",
  "PendingPaymentsSheet.tsx",
];

for (const file of files) {
  const source = fs.readFileSync(`src/bottom-sheet/sheets/${file}`, "utf8");
  assert.match(source, /useSafeAreaInsets/);
  assert.match(
    source,
    /paddingBottom:\s*Math\.max\(insets\.bottom \+ spacing\.md, spacing\.xl\)/,
  );
}

console.log("Payment bottom-sheet safe-area contract passed");
