const assert = require("node:assert/strict");
const fs = require("node:fs");

const modal = fs.readFileSync(
  "src/modules/subscription/components/SubscriptionUpgradeModal.tsx",
  "utf8",
);
const backHandlerHook = fs.readFileSync(
  "src/bottom-sheet/useBottomSheetBackHandler.ts",
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
assert.match(
  modal,
  /<BottomSheetFooter \{\.\.\.footerProps\} bottomInset=\{0\}>/,
);
assert.match(modal, /paddingBottom:\s*spacing\.md/);
assert.match(
  modal,
  /<View style=\{\{ flex: 1, paddingBottom: contentBottomInset \}\}>/,
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
assert.match(modal, /const paidPlanCatalog = useMemo/);
assert.match(modal, /isPaidPlanCode/);
assert.match(modal, /options\.showPlans/);
assert.match(modal, /selectedPlanCode/);
assert.match(modal, /planSelector/);
assert.match(modal, /comparison/);
assert.match(modal, /subscription\.choosePlan/);
assert.match(
  modal,
  /<View style=\{styles\.header\}>\s*[\s\S]*?<Text style=\{styles\.title\}>[\s\S]*?<\/Text>/,
);
assert.match(
  modal,
  /const showingPackageCatalog = options\.showPackages && showPackageCatalog/,
);
assert.match(
  modal,
  /showingPackageCatalog\s*\?\s*t\("subscription\.packageSelect"\)\s*:\s*t\("subscription\.choosePlan"\)/,
);
assert.match(modal, /options\.showPlans && !showingPackageCatalog/);
assert.match(modal, /options\.showPackages\s*\?/);
assert.match(modal, /showingPackageCatalog\s*\?/);
assert.match(modal, /onPress=\{\(\) => setShowPackageCatalog\(false\)\}/);
assert.match(modal, /setShowPackageCatalog\(false\)/);
assert.doesNotMatch(modal, /styles\.headerSpacer/);
assert.match(modal, /paddingTop: 2/);
assert.match(modal, /minWidth: 88/);
assert.match(modal, /minHeight: 40/);
assert.match(
  modal,
  /maxDynamicContentSize=\{\s*Math\.max\(\s*1,\s*height - insets\.top - contentBottomInset,\s*\)\}\s*topInset=\{insets\.top\}/,
);
assert.doesNotMatch(modal, /SubscriptionUpgradeIcon/);
assert.doesNotMatch(modal, /UPGRADE_ICONS/);
assert.doesNotMatch(modal, /options\.title/);
assert.doesNotMatch(modal, /options\.description/);
assert.doesNotMatch(modal, /options\.steps/);
assert.doesNotMatch(modal, /options\.showQuota/);
assert.doesNotMatch(modal, /viewSubscriptionAfterDismissRef/);
assert.doesNotMatch(modal, /subscription\.upgrade\.viewPlans/);
assert.doesNotMatch(modal, /subscription\.nowNot/);
assert.match(modal, /transactionSmsEnabled/);
assert.match(modal, /prioritySupportEnabled/);
assert.doesNotMatch(modal, /function proPlan/);
assert.doesNotMatch(modal, /showPro/);
assert.match(backHandlerHook, /BackHandler/);
assert.match(backHandlerHook, /hardwareBackPress/);
assert.match(backHandlerHook, /onBackRef\.current\(\)/);
assert.match(backHandlerHook, /return true/);
console.log("Subscription upgrade bottom sheet checks passed");
