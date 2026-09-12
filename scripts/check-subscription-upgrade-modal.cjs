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
assert.equal(freeSms.showPlans, true);
assert.equal(freeSms.recommendedPlanCode, "PREMIUM");
assert.equal(freeSms.showPackages, true);
assert.deepEqual(Object.keys(freeSms).sort(), [
  "recommendedPlanCode",
  "showPackages",
  "showPlans",
]);

const standardSms = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "STANDARD" },
  "sms-limit",
);
assert.equal(standardSms.showPlans, true);
assert.equal(standardSms.recommendedPlanCode, "PREMIUM");
assert.equal(standardSms.showPackages, true);

const premiumSms = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "PREMIUM" },
  "sms-limit",
);
assert.equal(premiumSms.showPlans, false);
assert.equal(premiumSms.showPackages, true);

const freeTelegram = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "FREE" },
  "telegram",
);
assert.equal(freeTelegram.showPlans, true);
assert.equal(freeTelegram.recommendedPlanCode, "PREMIUM");
assert.equal(freeTelegram.showPackages, false);

const freeBlacklist = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "FREE" },
  "blacklist",
);
assert.equal(freeBlacklist.showPlans, true);
assert.equal(freeBlacklist.recommendedPlanCode, "PREMIUM");
assert.equal(freeBlacklist.showPackages, false);

const standardBlacklist = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "STANDARD" },
  "blacklist",
);
assert.equal(standardBlacklist.showPlans, false);
assert.equal(standardBlacklist.showPackages, false);

const freeOrganizations = moduleExports.getSubscriptionUpgradeOptions(
  { planCode: "FREE" },
  "organization-limit",
);
assert.equal(freeOrganizations.recommendedPlanCode, "PREMIUM");

const screen = fs.readFileSync("src/screens/ClientSmsScreen.tsx", "utf8");
const settings = fs.readFileSync("src/screens/SettingsScreen.tsx", "utf8");
const organizations = fs.readFileSync(
  "src/screens/OrganizationSelectScreen.tsx",
  "utf8",
);
assert.match(screen, /SubscriptionUpgradeModal/);
assert.match(settings, /SubscriptionUpgradeModal/);
assert.match(organizations, /SubscriptionUpgradeModal/);
assert.match(settings, /title=\{t\("profile\.blacklistSettings"\)\}/);
assert.match(settings, /setUpgradeReason\("blacklist"\)/);
assert.doesNotMatch(settings, /planCode\?\.toUpperCase\(\) === "PRO"/);
assert.doesNotMatch(settings, /\bPRO\b/);
assert.doesNotMatch(settings, /onViewSubscription/);
assert.doesNotMatch(screen, /onViewSubscription/);
assert.doesNotMatch(organizations, /onViewSubscription/);
assert.doesNotMatch(organizations, />PRO</);

const upgradeModal = fs.readFileSync(
  "src/modules/subscription/components/SubscriptionUpgradeModal.tsx",
  "utf8",
);
assert.doesNotMatch(upgradeModal, /useNavigation/);
assert.doesNotMatch(upgradeModal, /navigation\.navigate\("Subscription"\)/);
assert.match(upgradeModal, /t\("subscription\.standardPlan"\)/);
assert.match(upgradeModal, /t\("subscription\.premiumPlan"\)/);
assert.match(upgradeModal, /selectedPlanCode/);
assert.match(upgradeModal, /comparison/);
assert.match(upgradeModal, /setSelectedPlanCode/);
assert.match(upgradeModal, /t\("subscription\.choosePlan"\)/);
assert.doesNotMatch(upgradeModal, /options\.title/);
assert.doesNotMatch(upgradeModal, /options\.description/);
assert.doesNotMatch(upgradeModal, /options\.steps/);
assert.doesNotMatch(upgradeModal, /options\.showQuota/);
assert.doesNotMatch(upgradeModal, /onViewSubscription/);
assert.doesNotMatch(upgradeModal, /subscription\.upgrade\.viewPlans/);
assert.doesNotMatch(upgradeModal, /subscription\.nowNot/);
assert.doesNotMatch(upgradeModal, /showPro/);
assert.match(upgradeModal, /t\("subscription\.packageCatalog"\)/);

const types = fs.readFileSync("src/types/index.ts", "utf8");
const navigation = fs.readFileSync("src/navigation/index.tsx", "utf8");
assert.match(types, /OrganizationStackParamList[\s\S]*Subscription: undefined/);
assert.match(
  navigation,
  /OrganizationStack\.Screen[\s\S]*name="Subscription"[\s\S]*component=\{SubscriptionScreen\}/,
);

console.log("Subscription upgrade choices and entry points passed");
