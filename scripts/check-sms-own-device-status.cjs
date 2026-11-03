// When SMS go out from the shop's own phone (GET /sms/provider says
// "own_device"), the SMS screen's status line is the phone's:
//
//   📱• Bugun yana 45 ta raqamga yuborish mumkin   ›
//
// read off GET /sms/devices. Those SMS spend nothing from a package, so the
// balance ("120 ta SMS qoldi") and its "Sotib olish" pill are not shown. A tap
// opens the SMS settings, where the phone is managed.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const screen = read("src/screens/ClientSmsScreen.tsx");
const status = read("src/modules/client-sms/components/OwnDeviceSmsStatus.tsx");
const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");

/* The screen picks the line by the source. */

assert.match(screen, /const sendsFromOwnPhone = smsProvider\.data\?\.provider === "own_device";/);
assert.match(
  screen,
  /\{sendsFromOwnPhone \? \(\s*<OwnDeviceSmsStatus onPress=\{openSmsSettings\} \/>\s*\) : smsQuota && smsProvider\.isLoading \? \(\s*(\/\/[^\n]*\n\s*)*<View style=\{styles\.quotaBanner\} \/>\s*\) : smsQuota \? \(/,
  "Own phone: its line. Loading: the line's place held. Otherwise, or if the source failed to load: the balance, as before",
);
// isLoading, not isPending: a query that never runs stays pending for ever.
assert.doesNotMatch(screen, /smsProvider\.isPending/);
assert.match(screen, /const openSmsSettings = useCallback\(\s*\(\) => navigation\.navigate\("SmsSettings"\),/);

/* The line itself: one line, nothing to buy, a way to the settings. */

assert.doesNotMatch(status, /buyPackage|purchasePackage|quotaRemaining|totalRemaining/, "Nothing about a package");
assert.match(status, /const status = getOwnDeviceStatus\(devices\.data\);/);
assert.match(status, /const known = devices\.data !== undefined;/, "No count or warning before the phone's state has arrived");
assert.match(status, /t\("sms\.ownDeviceRemaining", \{ count: status\.remainingToday \}\)/);
assert.match(status, /t\("smsSettings\.offlineQueues"\)/);
assert.match(status, /status\.reason \|\| t\("sms\.ownDeviceBlocked"\)/, "The server's own reason, when it gives one");
assert.match(status, /onPress=\{onPress\}/);
assert.match(status, /numberOfLines=\{2\}/);
assert.match(status, /minHeight: 38,/, "The balance line's size, so the list does not move");

/* A send uses up the phone's numbers for today: the count is refreshed. */

assert.match(
  read("src/modules/client-sms/hooks/useClientSms.ts"),
  /function useSmsInvalidation\(\)[\s\S]{0,700}?queryKeys\.clientSmsDevices\(scope\)/,
);

/* Back on Qarz Daftar SMS: the balance line names its source, as the phone's
   line does, leads to the settings, and shows a fresh count. */

assert.match(
  screen,
  /<Pressable\s+accessibilityRole="button"\s+accessibilityHint=\{t\("smsSettings\.title"\)\}\s+onPress=\{openSmsSettings\}[\s\S]{0,600}?\{t\("smsSettings\.platformTitle"\)\}\s*\{" · "\}[\s\S]{0,200}?t\("sms\.quotaRemaining", \{ count: smsQuota\.totalRemaining \}\)/,
);
const deviceHooks = read("src/modules/client-sms/hooks/useSmsDevices.ts");
assert.match(
  deviceHooks.slice(deviceHooks.indexOf("export function useUpdateSmsProvider")),
  /qc\.setQueryData\(queryKeys\.clientSmsProvider\(scope\), data\);\s*refreshSmsBalance\(\);/,
  "Choosing a source fetches the balance again",
);
assert.match(deviceHooks, /if \(removal\.source === "switched"\) refreshSmsBalance\(\);/, "So does the switch made by unlinking the last phone");

/* Wording. */

for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru]]) {
  for (const key of ["ownDeviceRemaining", "ownDeviceLimitReached", "ownDeviceVia", "ownDeviceNotConnected", "ownDeviceBlocked", "ownDeviceConnect"]) {
    assert.match(source, new RegExp("\\n    " + key + ': "[^"]+",'), name + ": sms." + key);
  }
}
assert.match(uz, /ownDeviceRemaining: "Bugun yana \{count\} ta raqamga yuborish mumkin",/);

console.log("SMS screen: the own phone's line in place of the package balance passed");
