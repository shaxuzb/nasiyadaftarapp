const assert = require("node:assert/strict");
const fs = require("node:fs");

const navigation = fs.readFileSync("src/navigation/index.tsx", "utf8");
const settings = fs.readFileSync("src/screens/SettingsScreen.tsx", "utf8");
const types = fs.readFileSync("src/types/index.ts", "utf8");

assert.match(
  types,
  /export type MainTabParamList = \{[\s\S]*ClientSms:/,
  "ClientSms must be part of the typed main tab navigator",
);
assert.match(
  navigation,
  /ClientSms:\s*\{\s*active:\s*"chatbubble-ellipses"/,
  "ClientSms must have a focused and accessible tab icon",
);
assert.match(
  navigation,
  /<Tab\.Screen\s+name="ClientSms"\s+component=\{ClientSmsScreen\}/,
  "ClientSms must be registered as a bottom tab",
);
assert.doesNotMatch(
  settings,
  /title="Mijozlarga SMS"/,
  "The SMS entry must be removed from profile settings",
);

console.log("Client SMS bottom tab routing checks passed");
