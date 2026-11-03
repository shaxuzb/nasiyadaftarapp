// SMS settings: how SMS reach customers.
//
//   Qarz Daftar SMS  the app's own provider: its balance, and buying more.
//   My phone         the shop's own SIM through the gateway app, paired with a
//                    code. Chosen only where the plan allows it and once a
//                    phone is connected; until then the card walks through
//                    connecting one.
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
  /<VideoLessonButton code="sms" \/>\s*<Pressable\s+accessibilityRole="button"\s+accessibilityLabel=\{t\("smsSettings\.title"\)\}[\s\S]{0,120}onPress=\{\(\) => navigation\.navigate\("SmsSettings"\)\}/,
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

/* The header: the title stays centred whether or not there is a lesson. */

assert.match(
  screen,
  /<View style=\{styles\.headerButton\}>\s*<VideoLessonButton code="sms_settings" \/>\s*<\/View>/,
);
assert.match(screen, /edges=\{\["top", "bottom"\]\}/);

/* Choosing the source. */

const select = screen.slice(screen.indexOf("const selectSource = useCallback"), screen.indexOf("const onPhoneConnected"));
assert.match(select, /if \(!provider\.data \|\| updateProvider\.isPending\) return;/, "One change at a time, and only once the current one is known");
assert.match(
  select,
  /if \(!provider\.data\.ownDeviceAllowed\) \{\s*showToast\(t\("smsSettings\.ownDeviceRestricted"\), "info"\);\s*return;/,
  "A plan without own-phone SMS says so instead of switching",
);
assert.match(
  select,
  /if \(!hasDevice && !justLinked\) \{\s*setPairingOpen\(true\);\s*return;/,
  "With no phone yet, choosing it opens the pairing rather than switching to nothing",
);
assert.match(select, /if \(provider\.data\.provider === next\) \{\s*setPairingOpen\(false\);\s*return;/, "Choosing the current source sends nothing");
assert.match(select, /await updateProvider\.mutateAsync\(next\);/);
assert.match(select, /getLocalizedApiErrorMessage\(error, "smsSettings\.providerSaveError", t\)/);
assert.match(
  screen,
  /const onPhoneConnected = useCallback\(async \(\) => \{[\s\S]{0,120}?await selectSource\("own_device", true\);/,
  "A phone paired from here becomes the source straight away",
);
assert.match(screen, /disabled=\{!sourceReady \|\| busy \|\| providerError\}/, "No switching while the state is unknown");
assert.match(screen, /\{t\("smsSettings\.sourceLoadError"\)\}[\s\S]{0,200}?\{t\("smsSettings\.autoReminderRetry"\)\}/, "A failed load says so, with a retry");

/* The provider's balance, and buying more. */

assert.match(
  screen,
  /<SubscriptionUpgradeModal visible=\{buyOpen\} reason="sms-packages"/,
  "Buying opens the same package list as the SMS screen",
);
assert.match(screen, /onPress=\{\(\) => setBuyOpen\(true\)\}/);

/* The connected phone: whether it is reachable, and that SMS wait when not. */

assert.match(
  screen,
  /connectedDevice\?\.online === null \? t\("smsSettings\.deviceUnknown"\) :\s*connectedDevice\?\.online \? t\("smsSettings\.deviceOnline"\) :\s*t\("smsSettings\.deviceOffline"\)/,
);
assert.match(screen, /t\("smsSettings\.offlineQueues"\)/);
assert.match(screen, /<SmsGatewayControls onConnected=\{onPhoneConnected\} \/>/);

/* Unlinking the last phone puts SMS back on Qarz Daftar SMS by itself: with
   no phone, "my phone" could send nothing and SMS would wait for good. */

const deviceHooks = read("src/modules/client-sms/hooks/useSmsDevices.ts");
const removal = deviceHooks.slice(deviceHooks.indexOf("export function useDeleteSmsDevice"));
assert.match(removal, /await deleteSmsDevice\(code\);/);
assert.match(removal, /if \(remaining\.length\) return \{ source: "kept" \};/, "Other phones left: nothing to switch");
assert.match(
  removal,
  /const current = await getSmsProvider\(\);\s*if \(current\.provider !== "own_device"\) \{[\s\S]{0,120}?return \{ source: "kept" \};\s*\}\s*qc\.setQueryData\(queryKeys\.clientSmsProvider\(scope\), await updateSmsProvider\("system"\)\);\s*return \{ source: "switched" \};/,
  "Asks the server, and switches only if the phone is still the source",
);
assert.match(removal, /\} catch \{[\s\S]{0,200}?return \{ source: "failed" \};/, "A failed switch does not make the unlinking look failed");
const controls = read("src/modules/client-sms/components/SmsGatewayControls.tsx");
assert.match(controls, /lastPhoneInUse\s*\? t\("smsSettings\.deviceRemoveSwitchDescription"\)/, "Said before, in the confirmation");
assert.match(controls, /source === "switched"[\s\S]{0,80}?t\("smsSettings\.deviceRemovedSwitched"\)/);
assert.match(controls, /source === "failed"[\s\S]{0,80}?t\("smsSettings\.deviceRemovedSwitchFailed"\)/);

/* The gateway's download: a button on Android, a QR code on an iPhone (the
   download happens on the Android phone), and a word in advance about the
   "unknown source" question Android asks for an app not from Google Play. */

assert.match(read("src/config/gatewayApp.ts"), /GATEWAY_APK_URL = "https:\/\/qarzdaftar\.rbsx\.uz\/gateway";/);
assert.match(screen, /Platform\.OS === "android" \? \(\s*<Pressable[\s\S]{0,300}onPress=\{downloadGateway\}/);
assert.match(
  screen,
  /<QrCode value=\{GATEWAY_APK_URL\} size=\{104\}\s+accessibilityLabel=\{t\("smsSettings\.gatewayQrA11y"\)\}/,
  "The iPhone shows the download link as a code for the Android phone to scan",
);
const hint = screen.indexOf('t("smsSettings.unknownSourcesHint")');
assert.ok(
  hint > screen.indexOf("onPress={downloadGateway}") && hint > screen.indexOf("<QrCode") && hint < screen.indexOf('t("smsSettings.step2Title")'),
  "The hint follows the download, on both platforms, still in the first step",
);

/* Every word the screen uses, in both languages. */

const used = [...new Set([...screen.matchAll(/t\("smsSettings\.([A-Za-z0-9]+)"\)/g)].map((match) => match[1]))];
assert.ok(used.length > 20);
for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru]]) {
  const start = source.indexOf("\n  smsSettings: {");
  assert.ok(start > 0, name + " has the smsSettings section");
  const section = source.slice(start, source.indexOf("\n  },", start));
  for (const key of used) {
    assert.match(section, new RegExp("\\n    " + key + ":"), name + ": smsSettings." + key);
  }
}

console.log("SMS settings: two ways in, choosing the source, the phone and its download passed");
