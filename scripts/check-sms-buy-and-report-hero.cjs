// Two small things the owner asked for by name.
//
// 1. Reports: the top card says "Umumiy qarz" and, while there is a debt,
//    carries no line under the amount.
// 2. SMS: the balance card has a small "Sotib olish" pill on its right that
//    opens the SMS package list directly, with no plans in between.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");

/* 1. Reports hero. */

const reports = read("src/screens/ReportsScreen.tsx");
assert.match(uz, /heroDebt: "Umumiy qarz",/);
assert.match(ru, /heroDebt: "Общий долг",/);
for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru], ["ReportsScreen.tsx", reports]]) {
  assert.doesNotMatch(source, /heroDebtCaption/, name + ": the line under the debt is gone");
}
assert.doesNotMatch(uz, /Qoldiq qarz"|To‘lash kerak bo‘lgan summa/);
assert.match(
  reports,
  /const heroCaption = hasDebt\s*\? null\s*: hasOverpayment\s*\? t\("reports\.heroOverpaymentCaption"\)\s*: t\("reports\.heroSettledCaption"\);/,
  "Only a debt goes without a caption",
);
assert.match(
  reports,
  /\{heroCaption \? \(\s*<Text style=\{styles\.heroCaption\}>\{heroCaption\}<\/Text>\s*\) : null\}/,
  "No empty line is left where the caption was",
);

/* 2. SMS balance card. */

const sms = read("src/screens/ClientSmsScreen.tsx");
assert.match(
  sms,
  /const openSmsPackages = useCallback\(\(\) => \{\s*setUpgradeReason\("sms-packages"\);\s*setIsUpgradeModalOpen\(true\);/,
  "The pill opens the package list",
);
assert.match(
  sms,
  /const openUpgradeModal = useCallback\(\(\) => \{\s*setUpgradeReason\("sms-limit"\);\s*setIsUpgradeModalOpen\(true\);/,
  "A send that hits the limit still offers plans as well",
);
assert.match(sms, /reason=\{upgradeReason\}/);
assert.match(
  sms,
  /\{smsQuota\.totalRemaining !== null \? \(\s*<Pressable\s*accessibilityRole="button"\s*accessibilityLabel=\{t\("subscription\.purchasePackage"\)\}\s*hitSlop=\{8\}\s*onPress=\{openSmsPackages\}/,
  "Shown whenever SMS are counted; unlimited leaves nothing to buy",
);
assert.match(sms, /<Text style=\{styles\.quotaBuyText\}>\{t\("sms\.buyPackage"\)\}<\/Text>/);
const banner = sms.slice(sms.indexOf("{smsQuota ? ("), sms.indexOf("styles.filters"));
assert.ok(
  banner.indexOf("styles.quotaCopy") < banner.indexOf("styles.quotaBuy,"),
  "The pill sits on the right, after the count",
);
assert.match(sms, /quotaBuy: \{\s*height: 28,/, "A small pill, not a full-size button");
assert.match(sms, /quotaCopy: \{\s*flex: 1,\s*flexDirection: "row",\s*flexWrap: "wrap",/, "The text gives way, the pill never leaves the card");
assert.match(uz, /buyPackage: "Sotib olish",/);
assert.match(ru, /buyPackage: "Купить",/);
for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru], ["ClientSmsScreen.tsx", sms]]) {
  assert.doesNotMatch(source, /quotaChoose/, name + ": wording of the old tappable banner is gone");
}

/* The sheet opens on the list when packages are all it has. */

const modal = read("src/modules/subscription/components/SubscriptionUpgradeModal.tsx");
assert.match(modal, /const packagesOnly = options\.showPackages && !options\.showPlans;/);
assert.match(
  modal,
  /const showingPackageCatalog =\s*options\.showPackages && \(showPackageCatalog \|\| packagesOnly\);/,
);
assert.match(
  modal,
  /\{showingPackageCatalog && !packagesOnly \? \(\s*<Pressable\s*accessibilityRole="button"\s*accessibilityLabel=\{t\("common\.back"\)\}/,
  "No back arrow when there is nothing to go back to",
);

console.log("Reports hero wording and the SMS 'buy' pill passed");
