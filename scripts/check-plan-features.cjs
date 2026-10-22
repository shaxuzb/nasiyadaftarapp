// What each plan card says, as the owner wrote it:
//
//   Bepul    — Boshlash uchun yetarli
//              1 ta tashkilot · Cheksiz mijoz · 20 ta SMS / oy · Hisobotlar
//              · 24/7 yordam (on every plan)
//   Standard — Do'koningiz uchun qulay
//              Cheksiz tashkilot · Cheksiz mijoz · 200 ta SMS / oy · Hisobotlar
//              · Qora ro'yxat · Telegramda kunlik hisobot · Mijozga Telegram xabar
//   Premium  — Hammasi avtomatik
//              everything in Standard, 500 ta SMS / oy, plus
//              Har qarzga avto SMS · Qora ro'yxatga avto SMS · 24/7 yordam
//
// The numbers (organizations, SMS) come from the server's plan; the wording is
// the app's. The plans screen (chips) and the upgrade sheet (comparison table)
// use the same wording, in the same order.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");
const screen = read("src/screens/SubscriptionScreen.tsx");
const modal = read("src/modules/subscription/components/SubscriptionUpgradeModal.tsx");

/* The wording. */

const WORDING = {
  taglineFree: ["Boshlash uchun yetarli", "Достаточно, чтобы начать"],
  taglineStandard: ["Do'koningiz uchun qulay", "Удобно для вашего магазина"],
  taglinePremium: ["Hammasi avtomatik", "Всё автоматически"],
  featureReports: ["Hisobotlar", "Отчёты"],
  featureBlacklist: ["Qora ro'yxat", "Чёрный список"],
  featureTelegram: ["Tashkilot uchun bot", "Бот для магазина"],
  featureTelegramMessage: ["Mijozlar uchun bot", "Бот для клиентов"],
  featureTransactionSms: ["Avto eslatma", "Автонапоминание"],
  featureBlacklistAutoSms: ["Qora ro'yxatga avto SMS", "Авто-SMS для чёрного списка"],
  featurePrioritySupport: ["24/7 yordam", "Поддержка 24/7"],
  organizationsPerPlan: ["{count} ta tashkilot", "Организаций: {count}"],
  smsPerMonth: ["{count} ta SMS / oy", "{count} SMS / мес."],
};
for (const [key, [uzText, ruText]] of Object.entries(WORDING)) {
  assert.ok(uz.includes(`    ${key}: "${uzText}",`), `uz: subscription.${key} must read "${uzText}"`);
  assert.ok(ru.includes(`    ${key}: "${ruText}",`), `ru: subscription.${key} must read "${ruText}"`);
}
assert.match(screen, /unlimitedOrganizations: "Cheksiz tashkilot"/);
assert.match(screen, /unlimitedClients: "Cheksiz mijoz"/);

/* The plans screen: chips, in the owner's order, each tied to what the server
   says the plan includes. */

const order = [
  'key: "organizations"',
  'key: "clients"',
  'key: "sms"',
  'key: "reports"',
  'key: "blacklist"',
  'key: "telegramDailyReport"',
  'key: "telegramMessage"',
  'key: "debtAutoSms"',
  'key: "blacklistAutoSms"',
  'key: "support"',
];
let last = -1;
for (const marker of order) {
  const at = screen.indexOf(marker);
  assert.ok(at > last, `${marker} is missing or out of order on the plans screen`);
  last = at;
}
const pair = (key, flag, wording) =>
  new RegExp(
    `key: "${key}",\\s*enabled: plan\\.${flag},\\s*text: t\\("subscription\\.${wording}"\\),`,
  );
assert.match(screen, pair("blacklist", "blacklistEnabled", "featureBlacklist"));
assert.match(screen, /key: "telegramDailyReport",\s*enabled: true,\s*text: t\("subscription\.featureTelegram"\)/);
assert.match(screen, /key: "telegramMessage",\s*enabled: true,\s*text: t\("subscription\.featureTelegramMessage"\)/);
assert.match(screen, /key: "debtAutoSms",\s*enabled: isPremium,\s*text: t\("subscription\.featureTransactionSms"\)/);
assert.match(screen, pair("blacklistAutoSms", "transactionSmsEnabled", "featureBlacklistAutoSms"));
// 24/7 help belongs to every plan, the free one included: it is never read
// from the server's switch.
assert.match(
  screen,
  /key: "support",\s*enabled: true,\s*text: t\("subscription\.featurePrioritySupport"\),/,
);
assert.match(
  screen,
  /plan\.maxOrganizations === null\s*\? copy\.unlimitedOrganizations\s*: t\("subscription\.organizationsPerPlan", \{\s*count: plan\.maxOrganizations,/,
  "The organization allowance is the server's number",
);
assert.match(
  screen,
  /t\("subscription\.smsPerMonth", \{\s*count: plan\.monthlySmsLimit,/,
  "The SMS allowance is the server's number",
);
assert.doesNotMatch(
  screen,
  /\b(20|200|500) ta SMS|freeDescription|standardDescription|premiumDescription/,
  "No allowance or pitch is written into the screen",
);
assert.match(
  screen,
  /const taglineKey = getPlanTaglineKey\(code\);\s*return taglineKey \? t\(taglineKey\) : fallback;/,
  "A plan the app has no pitch for shows the server's own description",
);

/* Each chip carries the capability's own icon, and no tick: everything on a
   card is included, so a tick per chip said nothing. */

const ICONS = {
  organizations: "business-outline",
  clients: "people-outline",
  sms: "mail-outline",
  reports: "bar-chart-outline",
  blacklist: "ban-outline",
  telegramDailyReport: "paper-plane",
  telegramMessage: "paper-plane",
  debtAutoSms: "time-outline",
  blacklistAutoSms: "settings-outline",
  support: "headset-outline",
};
for (const [key, icon] of Object.entries(ICONS)) {
  const at = screen.indexOf(`key: "${key}",`);
  const item = screen.slice(at, screen.indexOf("\n                },", at));
  assert.ok(item.includes(`icon: "${icon}",`), `${key} must show the ${icon} icon`);
}
const chip = screen.slice(
  screen.indexOf("function FeatureChip({"),
  screen.indexOf("const createStyles = (theme: AppTheme) =>"),
);
assert.match(chip, /<Ionicons\s+name=\{icon\}\s+size=\{15\}\s+color=\{iconColor \?\? theme\.textSecondary\}/);
assert.doesNotMatch(chip, /name="checkmark"|featureStatus/, "No tick in front of a capability");
assert.doesNotMatch(screen, /featureStatus/);
assert.match(
  screen,
  /<FeatureChip\s+key=\{feature\.key\}\s+icon=\{feature\.icon\}\s+iconColor=\{feature\.iconColor\}\s+text=\{feature\.text\}/,
);

/* The plans screen opens on the plans. The large "current plan" card that
   used to sit above them is gone; the current plan is marked on its own card. */

assert.doesNotMatch(
  screen,
  /currentCard|currentStat|currentStatusText|daysUntil|activeBadge|renewsIn|loadingCurrent/,
  "Part of the removed current-plan card is still on the screen",
);
assert.match(screen, /copy\.currentBadge/, "The current plan is still marked on its card");
for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru]]) {
  const section = source.slice(source.indexOf("\n  subscription: {"));
  assert.doesNotMatch(
    section.slice(0, section.indexOf("\n  },")),
    /^ {4}(active|remainingSms|blacklist|loadingCurrent|planActiveUntil):/m,
    name + ": wording of the removed card is still there",
  );
}

/* A monthly plan's price says so, in small print on the same line. */

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

/* The upgrade sheet: the same rows, the same order, the same wording. */

const rows = modal.slice(
  modal.indexOf("function planComparisonRows("),
  modal.indexOf("export function SubscriptionUpgradeModal("),
);
const labels = [...rows.matchAll(/label: t\("subscription\.([A-Za-z]+)"\)/g)].map((match) => match[1]);
assert.deepEqual(labels, [
  "featureOrganizations",
  "featureClients",
  "featureSmsLimit",
  "featureReports",
  "featureBlacklist",
  "featureTelegram",
  "featureTelegramMessage",
  "featureTransactionSms",
  "featureBlacklistAutoSms",
  "featurePrioritySupport",
]);
assert.match(
  rows,
  /label: t\("subscription\.featureTelegramMessage"\),\s*freeEnabled: true,\s*selectedEnabled: true,/,
);
assert.match(
  rows,
  /label: t\("subscription\.featureBlacklistAutoSms"\),\s*freeEnabled: freePlan\.transactionSmsEnabled,\s*selectedEnabled: selectedPlan\.transactionSmsEnabled,/,
);
assert.match(
  rows,
  /label: t\("subscription\.featurePrioritySupport"\),\s*freeEnabled: true,\s*selectedEnabled: true,/,
  "24/7 help is ticked for the free plan too",
);
assert.doesNotMatch(rows, /prioritySupportEnabled/);
assert.match(
  modal,
  /const taglineKey = getPlanTaglineKey\(selectedPlan\.code\);/,
);
assert.match(
  modal,
  /\{taglineKey \? \(\s*<Text style=\{styles\.planTagline\}>\{t\(taglineKey\)\}<\/Text>\s*\) : null\}/,
  "The pitch sits under the plan's name in the sheet too",
);

console.log("Plan cards: pitches, capabilities and server-driven allowances passed");
