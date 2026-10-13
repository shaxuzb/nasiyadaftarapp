// Plans and SMS packages can be on offer. The backend adds two fields to each:
//
//   oldPrice         the price before the discount, or null
//   discountPercent  the discount, or null
//
// With an old price the app shows "49 900  39 900 so'm  -20%"; without one it
// shows the price as it always did. Both fields are for display only: what is
// charged is always `price`.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const read = (file) => fs.readFileSync(file, "utf8");
const plain = (value) => JSON.parse(JSON.stringify(value));

function load(file) {
  const code = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({}) }, { filename: file });
  return exports;
}

const parser = load("src/modules/subscription/utils/subscriptionParsing.ts");
const discount = load("src/modules/subscription/utils/discount.ts");

/* 1. Both lists read the new fields. */

const plans = parser.parseSubscriptionPlans([
  { id: 1, code: "STANDARD", name: "Standard", price: 39900, oldPrice: 49900, discountPercent: 20 },
  { id: 2, code: "PREMIUM", name: "Premium", price: "79900.00", oldPrice: "99900.00", discountPercent: "20" },
  { id: 3, code: "PLAIN", name: "Plain", price: 59900, oldPrice: null, discountPercent: null },
  { id: 4, code: "OLD_API", name: "Old API", price: 59900 },
]);
assert.deepEqual(
  plans.map((plan) => [plan.price, plan.oldPrice, plan.discountPercent]),
  [
    [39900, 49900, 20],
    [79900, 99900, 20],
    [59900, null, null],
    [59900, null, null],
  ],
);

const packages = parser.parseSmsPackages([
  { id: 1, smsCount: 100, price: 8000, oldPrice: 10000, discountPercent: 20 },
  { id: 2, smsCount: 500, price: 35000, oldPrice: null, discountPercent: null },
  { id: 3, smsCount: 50, price: 5000, oldPrice: 0, discountPercent: 0 },
]);
assert.deepEqual(
  packages.map((item) => [item.price, item.oldPrice, item.discountPercent]),
  [
    [8000, 10000, 20],
    [35000, null, null],
    [5000, null, null],
  ],
);

/* 2. What is shown for each. */

assert.deepEqual(plain(discount.getPriceDiscount(plans[0])), { oldPrice: 49900, percent: 20 });
assert.equal(discount.formatDiscountPercent(20), "-20%");
assert.equal(discount.getPriceDiscount(plans[2]), null, "No old price: the price alone, as before");
assert.equal(discount.getPriceDiscount(plans[3]), null, "A server without the fields changes nothing");
assert.deepEqual(
  plain(discount.getPriceDiscount({ price: 39900, oldPrice: 49900, discountPercent: null })),
  { oldPrice: 49900, percent: null },
  "Without a percentage only the old price is struck through; nothing is computed",
);
assert.equal(
  discount.getPriceDiscount({ price: 39900, oldPrice: 39900, discountPercent: 20 }),
  null,
  "An old price that is not higher is not a discount",
);

/* 3. Everywhere a price is shown, the discount is shown with it. */

const screen = read("src/screens/SubscriptionScreen.tsx");
assert.match(
  screen,
  /<DiscountSummary product=\{plan\} \/>\s*<Text style=\{styles\.priceAmount\}>/,
  "Plan cards show the old price and badge above the price",
);
// SMS packages are drawn by one shared row, on the plans screen and in the
// "buy SMS" sheet alike.
const packageRow = read("src/modules/subscription/components/SmsPackageRow.tsx");
assert.match(
  packageRow,
  /<View style=\{styles\.priceColumn\}>\s*<DiscountSummary product=\{item\} \/>\s*<Text style=\{styles\.price\}/,
  "SMS package rows show the old price and badge above the price",
);
// One package per row, so the discount has room next to the name.
assert.match(screen, /packageGrid: \{ gap: 10 \}/);
assert.match(screen, /<SmsPackageRow\s+key=\{item\.id\}\s+item=\{item\}\s+onPress=\{openPackagePayment\}/);
assert.doesNotMatch(screen, /width: "48\.7%"/, "Half-width package cards cannot hold a discount");
assert.match(
  packageRow,
  /perSms !== null \? \([\s\S]{0,200}?t\("subscription\.perSms"/,
  "A package says what one SMS costs, when that can be worked out",
);
const modal = read("src/modules/subscription/components/SubscriptionUpgradeModal.tsx");
assert.match(modal, /<DiscountedPriceLine\s+product=\{selectedPlan\}/, "The upgrade modal's plan shows it");
assert.match(modal, /<SmsPackageRow\s+key=\{item\.id\}\s+item=\{item\}/, "The upgrade modal's packages show it, through the shared row");
const checkout = read("src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx");
assert.match(checkout, /<DiscountSummary product=\{product\} withCurrency \/>/, "The checkout shows it");

/* 4. The amount to pay is still the price, and only the price. */

assert.match(checkout, /const amount = product\.price;/);
const payers = [];
(function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = directory + "/" + entry.name;
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name) && /oldPrice|discountPercent/.test(fs.readFileSync(full, "utf8"))) {
      payers.push(full);
    }
  }
})("src/modules/payments");
assert.deepEqual(payers, [], "Nothing that takes payment may read the old price or the percentage");

/* 5. The badge is green and the old price is struck through. */

const components = read("src/modules/subscription/components/PriceDiscount.tsx");
assert.match(components, /textDecorationLine: "line-through"/);
assert.match(components, /backgroundColor: theme\.paymentBg/);
assert.match(components, /color: theme\.paymentColor/);

console.log("Plan and SMS package discounts: parsing, display and the charged amount passed");
