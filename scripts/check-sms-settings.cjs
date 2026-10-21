// SMS settings: how SMS reach customers.
//
//   Qarz Daftar SMS  the app's own provider; live (real balance, buy more).
//   My phone         the shop's own SIM through a gateway app. Not built yet:
//                    shown as a demo, its guide readable, its actions off, so
//                    nobody believes a phone was connected.
//
// Reached from the SMS screen's header and from the profile.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const screen = read("src/screens/SmsSettingsScreen.tsx");
const sms = read("src/screens/ClientSmsScreen.tsx");
const profile = read("src/screens/SettingsScreen.tsx");
const navigation = read("src/navigation/index.tsx");
const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");

/* The route lives where the SMS screen lives. */

assert.match(read("src/types/index.ts"), /  SmsSettings: undefined;/);
assert.match(
  navigation,
  /\{regionalCapabilities\.clientSmsVisible \? \([\s\S]{0,400}<Stack\.Screen name="SmsSettings" component=\{SmsSettingsScreen\} \/>/,
  "Shown only where the SMS screen itself is",
);

/* Two ways in. */

assert.match(
  sms,
  /<VideoLessonButton lessonId="sms" \/>\s*<Pressable\s+accessibilityRole="button"\s+accessibilityLabel=\{t\("smsSettings\.title"\)\}[\s\S]{0,120}onPress=\{\(\) => navigation\.navigate\("SmsSettings"\)\}/,
  "A settings button in the SMS screen's header",
);
assert.match(sms, /name="settings-outline"/);
assert.match(
  profile,
  /const canOpenSmsSettings =\s*regionalCapabilities\.clientSmsVisible &&\s*getClientSmsCapabilities\(user\?\.permissions\)\.canView;/,
  "The profile row follows the SMS screen's region rule and permission",
);
assert.match(
  profile,
  /\{canOpenSmsSettings \? \(\s*<ProfileMenuRow[\s\S]{0,200}title=\{t\("smsSettings\.title"\)\}[\s\S]{0,120}onPress=\{\(\) => navigation\.navigate\("SmsSettings"\)\}/,
);

/* The live part: the provider in use, its balance, buying more. */

assert.match(screen, /t\("smsSettings\.active"\)/);
assert.match(screen, /smsQuota\.totalRemaining === null\s*\? t\("sms\.quotaUnlimited"\)/);
assert.match(
  screen,
  /<SubscriptionUpgradeModal\s+visible=\{buyOpen\}\s+reason="sms-packages"/,
  "Buying opens the same package list as the SMS screen",
);

/* The demo part: labelled, explained, and unable to do anything. */

assert.match(screen, /t\("smsSettings\.demoBadge"\)/);
assert.match(screen, /accessibilityState=\{\{ expanded: guideOpen \}\}/);
assert.match(screen, /\{guideOpen \? \(/, "The guide opens when the card is tapped");
const demoActions = screen.slice(screen.indexOf("function DisabledAction("));
assert.match(demoActions, /accessibilityState=\{\{ disabled: true \}\}/);
assert.doesNotMatch(demoActions, /onPress/, "A demo action cannot be pressed");
assert.equal((screen.match(/<DisabledAction/g) ?? []).length, 2, "Scan and enter code, both off");
assert.match(screen, /t\("smsSettings\.comingSoon"\)/);
assert.doesNotMatch(
  screen,
  /apiClient|fetch\(|useMutation|useQuery|navigation\.navigate/,
  "The demo talks to no server and pretends nothing",
);
assert.match(screen, /edges=\{\["top", "bottom"\]\}/);

/* The gateway's download: a button on Android, a QR code on an iPhone (the
   download happens on the Android phone), and a word in advance about the
   "unknown source" question Android asks for an app not from Google Play. */

assert.match(read("src/config/gatewayApp.ts"), /GATEWAY_APK_URL = "https:\/\/qarzdaftar\.rbsx\.uz\/gateway";/);
assert.match(screen, /Platform\.OS === "android" \? \(\s*<Pressable[\s\S]{0,500}onPress=\{downloadGateway\}/);
assert.match(
  screen,
  /<QrCode\s+value=\{GATEWAY_APK_URL\}\s+size=\{GATEWAY_QR_SIZE\}/,
  "The iPhone shows the download link as a code for the Android phone to scan",
);
assert.match(screen, /t\("smsSettings\.unknownSourcesHint"\)/);
assert.ok(
  screen.indexOf('t("smsSettings.unknownSourcesHint")') > screen.indexOf("onPress={downloadGateway}") &&
    screen.indexOf('t("smsSettings.unknownSourcesHint")') > screen.indexOf("<QrCode"),
  "The hint follows the download, on both platforms",
);
assert.doesNotMatch(screen, /smsSettings\.openOnAndroid/);

/* Wording in both languages. */

const KEYS = [
  "title", "profileRowDescription", "intro", "platformTitle", "platformDescription",
  "active", "deviceTitle", "deviceDescription", "demoBadge", "guideA11y", "howToConnect",
  "step1Title", "step1Text", "step2Title", "step2Text", "step3Title", "step3Text",
  "scanQr", "enterCode", "comingSoon", "androidOnly",
  "downloadGateway", "downloadA11y", "downloadError", "scanOnAndroid", "gatewayQrA11y",
  "unknownSourcesHint",
];
for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru]]) {
  const start = source.indexOf("\n  smsSettings: {");
  assert.ok(start > 0, name + " has the smsSettings section");
  const section = source.slice(start, source.indexOf("\n  },", start));
  for (const key of KEYS) {
    assert.match(section, new RegExp("\\n    " + key + ":"), name + ": smsSettings." + key);
  }
}
assert.match(uz, /demoBadge: "Demo",/);

console.log("SMS settings: two ways in, live provider card, demo phone card passed");
