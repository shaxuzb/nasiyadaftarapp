const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("App.tsx", "utf8");

assert.doesNotMatch(
  app,
  /OnboardingScreen|showOnboarding|ONBOARDING_DONE_KEY|handleFinishOnboarding/,
  "App must not contain the first-launch onboarding flow",
);
assert.match(app, /<AppNavigator\s*\/>/, "App must render the main navigator directly");
assert.match(
  app,
  /<PaymentRecoveryGate\s+enabled=\{true\}\s*\/>/,
  "Payment recovery must remain enabled after onboarding removal",
);

console.log("Onboarding disabled flow contract passed");
