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
assert.match(modal, /BottomSheetScrollView/);
// The sheet has no footer any more: a package row goes straight on to payment,
// so nothing is "selected" and nothing needs a sticky button under the list.
assert.doesNotMatch(modal, /footerComponent|renderFooter|enableFooterMarginAdjustment/);
assert.match(
  modal,
  /const contentBottomInset = Math\.max\(insets\.bottom, spacing\.md\) \+ 10/,
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
// Packages are one tappable row each, the same row the plans screen uses; a
// tap goes on to payment, so there is no selected state and no sticky footer.
assert.match(
  modal,
  /<SmsPackageRow\s+key=\{item\.id\}\s+item=\{item\}\s+onPress=\{openPackagePayment\}/,
);
assert.doesNotMatch(modal, /stickyAction|selectedPackage|BottomSheetFooter|packageGrid|packageCard/);
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
// The package list shows when the user asked for it, or straight away when
// packages are all the sheet has to offer.
assert.match(
  modal,
  /const showingPackageCatalog =\s*options\.showPackages && \(showPackageCatalog \|\| packagesOnly\);/,
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
// 24/7 help comes with every plan, the free one included, so the comparison
// ticks it for both columns instead of reading the server's switch.
assert.match(
  modal,
  /label: t\("subscription\.featurePrioritySupport"\),\s*freeEnabled: true,\s*selectedEnabled: true,/,
);
assert.doesNotMatch(modal, /function proPlan/);
assert.doesNotMatch(modal, /showPro/);
assert.match(backHandlerHook, /BackHandler/);
assert.match(backHandlerHook, /hardwareBackPress/);
assert.match(backHandlerHook, /onBackRef\.current\(\)/);
assert.match(backHandlerHook, /return true/);
console.log("Subscription upgrade bottom sheet checks passed");
