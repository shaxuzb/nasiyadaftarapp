const assert = require("node:assert/strict");
const fs = require("node:fs");

const modal = fs.readFileSync(
  "src/modules/subscription/components/SubscriptionUpgradeModal.tsx",
  "utf8",
);

assert.doesNotMatch(modal, /\bModal\b/);
assert.match(modal, /BottomSheetModal/);
assert.match(modal, /BottomSheetBackdrop/);
assert.match(modal, /BottomSheetFooter/);
assert.match(modal, /BottomSheetScrollView/);
assert.match(modal, /enableFooterMarginAdjustment/);
assert.match(modal, /footerComponent=\{renderFooter\}/);
assert.match(
  modal,
  /const contentBottomInset = Math\.max\(insets\.bottom, spacing\.md\) \+ 10/,
);
assert.doesNotMatch(
  modal,
  /topInset=\{insets\.top\}[\s\S]{0,120}bottomInset=\{sheetBottomInset\}/,
);
assert.match(
  modal,
  /<BottomSheetFooter \{\.\.\.footerProps\} bottomInset=\{contentBottomInset\}>/,
);
assert.match(
  modal,
  /paddingBottom:\s*selectedPackage \? spacing\.md : contentBottomInset/,
);
assert.match(modal, /sheet\.current\?\.present\(\)/);
assert.match(modal, /sheet\.current\?\.dismiss\(\)/);
assert.match(modal, /presentedRef/);
assert.match(
  modal,
  /if \(!visible\)\s*\{\s*if \(presentedRef\.current\)\s*\{\s*sheet\.current\?\.dismiss\(\)/,
);
assert.match(modal, /enablePanDownToClose/);
assert.match(modal, /onDismiss=\{handleDismiss\}/);
assert.match(modal, /styles\.stickyAction/);
assert.match(modal, /const planCatalog = useMemo/);
assert.match(modal, /isPaidPlanCode/);
assert.match(modal, /options\.showPlans/);
assert.match(modal, /selectedPlanCode/);
assert.match(modal, /planSelector/);
assert.match(modal, /comparison/);
assert.match(modal, /transactionSmsEnabled/);
assert.match(modal, /prioritySupportEnabled/);
assert.doesNotMatch(modal, /function proPlan/);
assert.doesNotMatch(modal, /showPro/);
console.log("Subscription upgrade bottom sheet checks passed");
