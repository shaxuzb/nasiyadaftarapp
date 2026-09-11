const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");

const utilityPath = "src/modules/subscription/utils/upgradeOptions.ts";
const source = fs.readFileSync(utilityPath, "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleExports = {};
vm.runInNewContext(code, { exports: moduleExports });

const freeSms = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "FREE" },
  "sms-limit",
);
assert.equal(freeSms.showPro, true);
assert.equal(freeSms.showPackages, true);
assert.match(freeSms.title, /SMS/);
assert.equal(freeSms.icon, "sms");
assert.equal(freeSms.showQuota, true);

const proSms = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "PRO" },
  "sms-limit",
);
assert.equal(proSms.showPro, false);
assert.equal(proSms.showPackages, true);

const freeTelegram = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "FREE" },
  "telegram",
);
assert.equal(freeTelegram.showPro, true);
assert.equal(freeTelegram.showPackages, false);
assert.equal(freeTelegram.icon, "telegram");
assert.equal(freeTelegram.steps.length, 3);

const freeBlacklist = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "FREE" },
  "blacklist",
);
assert.equal(freeBlacklist.showPro, true);
assert.equal(freeBlacklist.showPackages, false);
assert.match(freeBlacklist.title, /Qora ro'yxat/);
assert.equal(freeBlacklist.icon, "blacklist");
assert.equal(freeBlacklist.steps.length, 3);

const proBlacklist = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "PRO" },
  "blacklist",
);
assert.equal(proBlacklist.showPro, false);
assert.equal(proBlacklist.showPackages, false);

const freeOrganizations = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "FREE" },
  "organization-limit",
);
assert.equal(freeOrganizations.icon, "organization");
assert.equal(freeOrganizations.steps.length, 1);

const screen = fs.readFileSync("src/screens/ClientSmsScreen.tsx", "utf8");
const settings = fs.readFileSync("src/screens/SettingsScreen.tsx", "utf8");
const organizations = fs.readFileSync(
  "src/screens/OrganizationSelectScreen.tsx",
  "utf8",
);
assert.match(screen, /SubscriptionUpgradeModal/);
assert.match(settings, /SubscriptionUpgradeModal/);
assert.match(organizations, /SubscriptionUpgradeModal/);
assert.match(settings, /title="Qora ro'yxat sozlamasi"/);
assert.match(settings, /setUpgradeReason\("blacklist"\)/);
assert.match(settings, /planCode\?\.toUpperCase\(\) === "PRO"/);
assert.match(
  settings,
  /onViewSubscription=\{\(\) => navigation\.navigate\("Subscription"\)\}/,
);
assert.match(
  screen,
  /onViewSubscription=\{\(\) => navigation\.navigate\("Subscription"\)\}/,
);
assert.match(
  organizations,
  /onViewSubscription=\{\(\) => navigation\.navigate\("Subscription"\)\}/,
);

const upgradeModal = fs.readFileSync(
  "src/modules/subscription/components/SubscriptionUpgradeModal.tsx",
  "utf8",
);
assert.match(upgradeModal, /onViewSubscription: \(\) => void/);
assert.doesNotMatch(upgradeModal, /useNavigation/);
assert.doesNotMatch(upgradeModal, /navigation\.navigate\("Subscription"\)/);
assert.match(upgradeModal, /onViewSubscription\(\)/);
assert.match(upgradeModal, /PRO tarifini ko'rish/);
assert.match(upgradeModal, /Hozir emas/);
assert.match(upgradeModal, /SMS paketlarini ko'rish/);
assert.match(upgradeModal, /options\.steps/);

const types = fs.readFileSync("src/types/index.ts", "utf8");
const navigation = fs.readFileSync("src/navigation/index.tsx", "utf8");
assert.match(types, /OrganizationStackParamList[\s\S]*Subscription: undefined/);
assert.match(
  navigation,
  /OrganizationStack\.Screen[\s\S]*name="Subscription"[\s\S]*component=\{SubscriptionScreen\}/,
);

console.log("Subscription upgrade choices and entry points passed");
