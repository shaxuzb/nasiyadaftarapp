const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/screens/CustomerDetailScreen.tsx", "utf8");

assert.match(
  source,
  /function openTransactionSheet\(\)/,
  "Customer detail must expose a dedicated transaction FAB handler",
);
assert.match(
  source,
  /function openTransactionSheet\(\)[\s\S]*?openSheet\("transaction",/,
  "The FAB handler must open the existing transaction sheet",
);
assert.match(
  source,
  /function openTransactionSheet\(\)[\s\S]*?customerId,/,
  "The transaction sheet must receive the current customer id",
);
assert.match(
  source,
  /styles\.floatingActionButton/,
  "Customer detail must render a floating action button",
);
assert.match(
  source,
  /setFooterHeight/,
  "Customer detail must measure the footer height",
);
assert.match(
  source,
  /footerHeight[\s\S]*insets\.bottom[\s\S]*\+\s*12/,
  "FAB position must use the measured footer height",
);
assert.match(
  source,
  /insets\.bottom/,
  "FAB position must include the device safe-area bottom inset",
);
assert.match(source, /zIndex:\s*10/, "FAB must render above the footer layer");

console.log("Customer detail transaction FAB contract passed");
