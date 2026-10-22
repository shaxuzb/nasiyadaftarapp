// The server's link list (GET /app/links) and where each link is used:
//
//   instagram, telegram_group      icons in the profile header
//   support                        the "contact and support" row: straight to
//                                  the admin
//   organization_bot, client_bot   the sheet behind the "Telegram bot" row:
//                                  the owner's daily-report bot, and the bot
//                                  customers get their messages from

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const links = read("src/modules/support/utils/appLinks.ts");
const profile = read("src/screens/SettingsScreen.tsx");
const sheet = read("src/bottom-sheet/sheets/TelegramBotsSheet.tsx");
const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");

/* The model. */

assert.match(links, /export const HEADER_APP_LINK_KEYS = \["instagram", "telegram_group"\] as const;/);
assert.match(links, /export const TELEGRAM_BOT_LINK_KEYS = \["organization_bot", "client_bot"\] as const;/);
assert.match(
  links,
  /TELEGRAM_BOT_LINK_KEYS\.flatMap\(\s*\(key\) => findAppLink\(links, key\) \?\? findAppLink\(DEFAULT_APP_LINKS, key\) \?\? \[\],/,
  "A bot the server did not list falls back to the bundled address, if there is one",
);
assert.doesNotMatch(links, /telegram_channel|getSupportSheetLinks/, "The channel link and the support sheet are gone");
assert.doesNotMatch(
  links,
  /diller_royal|_test_bot/,
  "A test bot's address must not be bundled as a fallback",
);

/* The profile row: phone first (as before), then the sheet with both bots. */

assert.match(
  profile,
  /const handleOpenBot = useCallback\(\(\) => \{\s*requireVerifiedPhone\(\(\) => openSheet\("telegramBots", \{\}\), "telegram"\);\s*\}, \[openSheet, requireVerifiedPhone\]\);/,
);
assert.match(profile, /onPress=\{handleOpenBot\}/, "Both bots open on every plan");
assert.doesNotMatch(profile, /telegramEnabled|setUpgradeReason\("telegram"\)/, "No subscription gating");
assert.doesNotMatch(profile, /openTelegramBot|isOpeningBot|botOpenError|https?:\/\/|t\.me\//);
assert.equal(fs.existsSync("src/modules/bot"), false, "The fixed bot address lived here");

/* The sheet. */

assert.match(read("src/bottom-sheet/types.ts"), /\| "telegramBots"/);
assert.match(
  read("src/bottom-sheet/registry.ts"),
  /telegramBots: \{\s*component: TelegramBotsSheet,\s*enableDynamicSizing: true,\s*enablePanDownToClose: true,\s*\},/,
);
assert.match(sheet, /const links = useAppLinks\(\);/);
assert.match(sheet, /getTelegramBotLinks\(links\)\.map\(\(link\) => \(\{/);
// The owner's bot opens in Telegram. The customers' bot does not open here:
// its row shows a QR code for the customer to scan, with a button under it
// that opens the link on this phone.
assert.match(sheet, /const SHOWN_AS_QR: readonly string\[\] = \["client_bot"\];/);
assert.match(
  sheet,
  /onPress=\{\(\) =>\s*bot\.asQr\s*\? setQrTarget\(\{\s*title: bot\.title,\s*description: bot\.description,\s*url: bot\.link\.url,\s*\}\)\s*: void open\(bot\.link\)\s*\}/,
);
assert.match(sheet, /name=\{bot\.asQr \? "qr-code-outline" : "open-outline"\}/);

// The code is a step inside this sheet. As a sheet of its own it had to close
// the list to open, and closing it left the user on the profile with the list
// gone. Now the arrow, and Android's back button, lead back to the list.
assert.match(
  sheet,
  /\{qrTarget \? \(\s*<LinkQrView\s+title=\{qrTarget\.title\}\s+description=\{qrTarget\.description\}\s+url=\{qrTarget\.url\}\s+onBack=\{hideQr\}\s*\/>\s*\) : \(/,
);
assert.match(sheet, /const hideQr = useCallback\(\(\) => setQrTarget\(null\), \[\]\);/);
assert.match(sheet, /useBottomSheetBackHandler\(qrTarget !== null, hideQr\);/);
assert.doesNotMatch(sheet, /openSheet\(/, "The list never closes itself to show the code");
assert.equal(fs.existsSync("src/bottom-sheet/sheets/LinkQrSheet.tsx"), false);
assert.doesNotMatch(read("src/bottom-sheet/types.ts"), /linkQr/);
assert.doesNotMatch(read("src/bottom-sheet/registry.ts"), /linkQr|LinkQrSheet/);

const qrView = read("src/modules/support/components/LinkQrView.tsx");
const qrCode = read("src/modules/support/components/QrCode.tsx");
const qrMatrix = read("src/modules/support/utils/qrMatrix.ts");
assert.match(qrView, /<QrCode\s+value=\{url\}/, "The code says exactly the link the server sent");
assert.ok(
  qrView.indexOf("<QrCode") < qrView.indexOf('t("support.openInTelegram")}</Text>'),
  "The button that opens the link sits under the code",
);
assert.match(qrView, /onPress=\{\(\) => void open\(\{ key: OPEN_KEY, url \}\)\}/);
assert.match(
  qrView,
  /accessibilityLabel=\{t\("common\.back"\)\}\s*onPress=\{onBack\}/,
  "An arrow back to the list, not a close button",
);
assert.doesNotMatch(qrView, /name="close"|closeSheet/, "Leaving the code must not close the list");
assert.doesNotMatch(qrView, /useWindowDimensions|https:\/\/t\.me|t\.me\//);

// Dark on white whatever the theme, a quiet zone around it, and edges on whole
// pixels: without those a phone camera may not read it.
assert.match(qrCode, /const DARK = "#000000";\s*const LIGHT = "#FFFFFF";/);
assert.doesNotMatch(qrCode, /useTheme|theme\./, "A code must not follow the dark theme");
assert.match(qrCode, /const QUIET_MODULES = 4;/);
assert.match(qrCode, /PixelRatio\.roundToNearestPixel\(modules \* moduleSize\)/);
assert.match(qrCode, /accessibilityRole="image"/);
assert.match(qrMatrix, /import \{ toQR \} from "toqr";/);
assert.match(read("package.json"), /"toqr": "0\.1\.1"/, "The encoder is a declared dependency, pinned");

for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru]]) {
  for (const key of ["qrHint", "qrAccessibility", "openInTelegram"]) {
    assert.match(source, new RegExp("    " + key + ': "[^"]+",'), name + ": support." + key);
  }
}
assert.match(sheet, /disabled=\{busy\}/, "One bot at a time");
assert.match(sheet, /<BottomSheetView/, "The sheet's content reports its height");
assert.match(
  sheet,
  /paddingBottom: Math\.max\(insets\.bottom, 12\) \+ spacing\.lg/,
  "Clear of the Android navigation bar, with room to spare under the rows",
);
assert.doesNotMatch(sheet, /https?:\/\/|t\.me\//, "No address is written into the sheet");

/* Each bot is named for what it does, in both languages. */

const presentation = read("src/modules/support/utils/appLinkPresentation.ts");
assert.match(presentation, /organization_bot: "bar-chart-outline",/);
assert.match(presentation, /client_bot: "people-outline",/);
assert.match(uz, /organization_bot: \{\s*title: "Kunlik hisobot boti",/);
assert.match(uz, /client_bot: \{\s*title: "Mijozlar uchun bot",/);
assert.match(ru, /organization_bot: \{\s*title: "Бот ежедневных отчётов",/);
assert.match(ru, /client_bot: \{\s*title: "Бот для клиентов",/);
for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru]]) {
  assert.match(source, /botsSheetTitle: "[^"]+",/, name);
  assert.doesNotMatch(source, /telegram_channel|botOpenError|sheetSubtitle: "(Qulay usulni tanlang|Выберите удобный способ)"/, name);
}

console.log("App links: header icons, direct admin contact and the two Telegram bots passed");
