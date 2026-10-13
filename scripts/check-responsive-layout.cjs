// On a tablet every screen is a centred column instead of a phone layout
// stretched edge to edge. The limit lives in one component, applied by the
// navigators, so no screen has to know about it and a new screen gets it for
// free.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const frame = read("src/components/ResponsiveScreen.tsx");
const navigation = read("src/navigation/index.tsx");

assert.match(frame, /export const CONTENT_MAX_WIDTH = \d+;/);
assert.match(
  frame,
  /column: \{ flex: 1, width: "100%", maxWidth: CONTENT_MAX_WIDTH \}/,
  "The column fills a phone and stops growing on a tablet",
);
assert.match(frame, /frame: \{ flex: 1, alignItems: "center" \}/, "The column is centred");
// Adding the frame only past some width would remount the screen whenever an
// iPad window is resized across it, losing whatever was being typed.
assert.doesNotMatch(
  frame,
  /useWindowDimensions|Dimensions\.get/,
  "The frame must be pure layout, always present",
);

for (const navigator of ["Tab", "AuthStack", "OrganizationStack"]) {
  assert.match(
    navigation,
    new RegExp(`<${navigator}\\.Navigator[\\s\\S]{0,160}?screenLayout=\\{renderResponsiveScreen\\}`),
    `${navigator} screens must be framed`,
  );
}
assert.match(
  navigation,
  /<Stack\.Navigator\s+screenOptions=\{\{ headerShown: false \}\}\s+screenLayout=\{renderMainStackScreen\}/,
  "Main stack screens must be framed",
);
assert.match(
  navigation,
  /route\.name === "MainTabs" \? \(\s*<>\{children\}<\/>/,
  "The tabs screen is passed through so the tab bar keeps the full width",
);

// Nothing may size itself from the window's width: inside the column that
// would overflow on a tablet.
const widthUsers = [];
(function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = directory + "/" + entry.name;
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) {
      const source = fs.readFileSync(full, "utf8");
      if (/const \{[^}]*\bwidth\b[^}]*\} = useWindowDimensions\(\)|Dimensions\.get\(["']window["']\)\.width/.test(source)) {
        widthUsers.push(full);
      }
    }
  }
})("src");
// The one exception: a bottom sheet is drawn over the whole window and
// positions itself from both edges, so its margins have to come from the width.
assert.deepEqual(
  widthUsers,
  ["src/hooks/useSheetFrameStyle.ts"],
  "Use the space the layout gives, not the window's width",
);

/* Sheets, dialogs and banners follow the same column. */

const sheetHook = read("src/hooks/useSheetFrameStyle.ts");
assert.match(sheetHook, /\(width - CONTENT_MAX_WIDTH\) \/ 2/, "Sheets share the screens' width limit");
assert.match(
  sheetHook,
  /inset > 0 \? \{ marginHorizontal: inset \} : undefined/,
  "On a phone a sheet gets no style at all",
);

const sheets = [];
(function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = directory + "/" + entry.name;
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx$/.test(entry.name)) {
      const source = fs.readFileSync(full, "utf8");
      const opened = (source.match(/<BottomSheetModal\s/g) ?? []).length;
      if (opened === 0) continue;
      sheets.push(full);
      assert.equal(
        (source.match(/style=\{sheetFrame\}/g) ?? []).length,
        opened,
        `${full}: every bottom sheet must take the sheet frame`,
      );
    }
  }
})("src");
assert.equal(sheets.length, 6, "A new bottom sheet was added: give it the sheet frame and update this count");

for (const [file, pattern] of [
  ["src/context/ConfirmDialogContext.tsx", /maxWidth: 440/],
  ["src/modules/pin-auth/components/SensitiveActionReauthModal.tsx", /maxWidth: 440/],
  ["src/modules/account/components/PhoneVerificationModal.tsx", /maxWidth: 440/],
  ["src/modules/push/components/PushInAppBanner.tsx", /maxWidth: 520/],
  ["src/context/ToastContext.tsx", /maxWidth: 520/],
]) {
  assert.match(read(file), pattern, `${file}: must not stretch across a tablet`);
}

console.log("Screens, sheets, dialogs and banners keep to a centred column on wide displays");
