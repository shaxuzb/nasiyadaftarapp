// What each plan card says comes from the server: GET /subscriptions/plans
// gives every plan a "presentation" with its icon, its badge and the list of
// what it includes, each item with a stable key, its wording and an icon.
//
//   presentation: {
//     icon: "box", badge: "Tavsiya etiladi",
//     features: [{ key: "sms", text: "500 ta SMS / oy", icon: "mail" }, ...]
//   }
//
// The app draws it as it comes, so a new capability ("ownDeviceSms", say)
// needs no app release. The plans screen shows it as chips; the upgrade sheet
// lines the free plan up against the chosen one by key.

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

const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");
const screen = read("src/screens/SubscriptionScreen.tsx");
const modal = read("src/modules/subscription/components/SubscriptionUpgradeModal.tsx");

/* 1. Reading the presentation. */

const parsing = load("src/modules/subscription/utils/subscriptionParsing.ts");
const [plan, bare] = parsing.parseSubscriptionPlans([
  {
    id: 2,
    code: "PREMIUM",
    name: "Premium",
    price: 49900,
    presentation: {
      icon: "box",
      badge: { text: " Tavsiya etiladi " },
      features: [
        { key: "sms", text: " 500 ta SMS / oy ", icon: "mail" },
        { key: "ownDeviceSms", title: "O‘z telefoningizdan SMS", icon: "shield" },
        "Hisobotlar",
        { key: "hidden", text: "Yashirin", enabled: false },
        { key: "empty", text: "  " },
        "  ",
      ],
    },
  },
  { id: 1, code: "FREE", name: "Bepul", price: 0 },
]);
assert.deepEqual(plain(plan.presentation), {
  icon: "box",
  badge: "Tavsiya etiladi",
  features: [
    { key: "sms", text: "500 ta SMS / oy", icon: "mail", enabled: true },
    { key: "ownDeviceSms", text: "O‘z telefoningizdan SMS", icon: "shield", enabled: true },
    { key: "Hisobotlar", text: "Hisobotlar", icon: null, enabled: true },
  ],
}, "Switched-off and wordless items are left out; the rest keep the server's order");
assert.deepEqual(plain(bare.presentation), { icon: null, badge: null, features: [] }, "No presentation: an empty card, not a crash");

/* 2. Icons: the server's names in the app's icon set, and a safe default. */

const icons = load("src/modules/subscription/utils/planIcon.ts");
assert.equal(icons.normalizePlanIcon("mail"), "mail-outline");
assert.equal(icons.normalizePlanIcon(" Telegram "), "paper-plane-outline");
assert.equal(icons.normalizePlanIcon("rocket-outline"), "rocket-outline", "An Ionicons name passes through");
assert.equal(icons.normalizePlanIcon(null), "checkmark-circle-outline");
assert.match(
  screen,
  /function serverIcon\(raw: string \| null\): PlanIconName \{\s*const icon = normalizePlanIcon\(raw\);\s*if \(Object\.prototype\.hasOwnProperty\.call\(Ionicons\.glyphMap, icon\)\) \{[\s\S]{0,60}?return "checkmark-circle-outline";/,
  "A name the icon set does not know shows the default, never a blank square",
);

/* 3. The plans screen draws the server's card. */

assert.match(screen, /const visibleFeatures = plan\.presentation\.features;/);
assert.match(screen, /const displayIcon = serverIcon\(plan\.presentation\.icon\);/);
assert.match(screen, /const displayBadge = plan\.presentation\.badge;/);
assert.match(
  screen,
  /\{visibleFeatures\.map\(\(feature, index\) => \(\s*<FeatureChip\s+key=\{`\$\{feature\.key\}-\$\{index\}`\}\s+icon=\{serverIcon\(feature\.icon\)\}\s+text=\{feature\.text\}/,
);
assert.match(
  screen,
  /\{isCurrent \? \([\s\S]{0,160}?copy\.currentBadge[\s\S]{0,120}?\) : displayBadge \? \(/,
  "The current plan is marked as such; otherwise the server's badge",
);
assert.doesNotMatch(
  screen,
  /\b(20|200|500) ta SMS|featureTransactionSms|featureBlacklistAutoSms|plan\.blacklistEnabled/,
  "No capability or allowance is written into the screen any more",
);

/* 4. Each chip carries the capability's own icon, and no tick: everything on a
      card is included, so a tick per chip said nothing. */

const chip = screen.slice(
  screen.indexOf("function FeatureChip({"),
  screen.indexOf("const createStyles = (theme: AppTheme) =>"),
);
assert.match(chip, /<Ionicons\s+name=\{icon\}\s+size=\{15\}\s+color=\{iconColor \?\? theme\.textSecondary\}/);
assert.doesNotMatch(chip, /name="checkmark"|featureStatus/, "No tick in front of a capability");

/* 5. The plans screen opens on the plans. The large "current plan" card that
      used to sit above them is gone; the current plan is marked on its own card. */

assert.doesNotMatch(
  screen,
  /currentCard|currentStat|currentStatusText|daysUntil|activeBadge|renewsIn|loadingCurrent/,
  "Part of the removed current-plan card is still on the screen",
);
for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru]]) {
  const section = source.slice(source.indexOf("\n  subscription: {"));
  assert.doesNotMatch(
    section.slice(0, section.indexOf("\n  },")),
    /^ {4}(active|remainingSms|blacklist|loadingCurrent|planActiveUntil):/m,
    name + ": wording of the removed card is still there",
  );
}

/* 6. A monthly plan's price says so, in small print on the same line. */

assert.ok(uz.includes('    pricePerMonth: "/ oy",'));
assert.ok(ru.includes('    pricePerMonth: "/ мес.",'));
assert.match(
  screen,
  /<Text style=\{styles\.priceAmount\}>\s*\{formatLocalizedCurrency\(plan\.price, locale\)\}[\s\S]{0,260}\{isMonthlyPlan\(plan\.durationDays\) \? \(\s*<Text style=\{styles\.pricePeriod\}>\s*\{" "\}\s*\{t\("subscription\.pricePerMonth"\)\}/,
  "The period is part of the price line, not a line of its own",
);
assert.match(screen, /pricePeriod: \{\s*\.\.\.typography\.caption,\s*color: theme\.textMuted,/);
assert.match(
  modal,
  /selectedPlan\.price > 0 &&\s*isMonthlyPlan\(selectedPlan\.durationDays\)/,
  "The sheet's plan price carries the same label",
);

/* 7. The upgrade sheet: the free plan against the chosen one, matched by the
      server's key, never by wording that differs between languages. */

const rows = modal.slice(
  modal.indexOf("function planComparisonRows("),
  modal.indexOf("export function SubscriptionUpgradeModal("),
);
assert.match(rows, /new Map\(freePlan\.presentation\.features\.map\(\(item\) => \[item\.key, item\]\)\)/);
assert.match(rows, /new Map\(selectedPlan\.presentation\.features\.map\(\(item\) => \[item\.key, item\]\)\)/);
assert.match(rows, /const order = \[\.\.\.new Set\(\[\.\.\.base\.keys\(\), \.\.\.selected\.keys\(\)\]\)\];/, "Free plan's order first, then what only the paid plan has");
// Where both plans have a capability in different amounts ("20 ta SMS" against
// "500 ta SMS") the row is named for what is compared, and shows both values.
assert.match(rows, /key === "sms" && differing \? t\("subscription\.featureSmsLimit"\)/);
assert.match(rows, /key === "organizations" && differing \? t\("subscription\.featureOrganizations"\)/);
assert.match(rows, /key === "clients" && differing \? t\("subscription\.featureClients"\)/);
assert.match(rows, /label, freeValue: free\.text, selectedValue: paid\.text,/);
assert.match(rows, /label, freeEnabled: !!free, selectedEnabled: !!paid,/);
for (const key of ["featureSmsLimit", "featureOrganizations", "featureClients"]) {
  assert.match(uz, new RegExp("\\n    " + key + ": \""), "uz: subscription." + key);
  assert.match(ru, new RegExp("\\n    " + key + ": \""), "ru: subscription." + key);
}
assert.match(modal, /selectedPlan\.presentation\.badge \? \(/, "The sheet shows the server's badge too");

console.log("Plan cards: the server's presentation, icons, comparison by key and the price label passed");
