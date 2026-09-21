const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

const api = read("src/services/organizationsApi.ts");
const types = read("src/modules/organization/types/index.ts");
const hook = read("src/modules/organization/hooks/useOrganizationProfileUpdate.ts");
const sheet = read("src/bottom-sheet/sheets/OrganizationProfileSheet.tsx");
const sheetTypes = read("src/bottom-sheet/types.ts");
const registry = read("src/bottom-sheet/registry.ts");
const settings = read("src/screens/SettingsScreen.tsx");
const keyboardBridge = read("src/bottom-sheet/AndroidSheetKeyboardBridge.tsx");

assert.match(types, /interface UpdateCurrentOrganizationRequest/);
assert.match(types, /name:\s*string/);
assert.match(types, /address:\s*string/);
assert.match(api, /apiClient\.put\("\/organizations\/current", payload\)/);
assert.match(hook, /await updateCurrentOrganization\(normalized\.value\)/);
assert.match(hook, /await getCurrentOrganization\(\)/);
assert.match(hook, /await refreshOrganizations\(\)/);
assert.doesNotMatch(hook, /updateUserProfile/);
assert.match(sheetTypes, /"organizationProfile"/);
assert.match(registry, /organizationProfile:/);
assert.match(sheet, /props\.onSubmit/);
assert.match(
  sheet,
  /import\s+\{\s*BottomSheetScrollView\s*\}\s+from\s+"@gorhom\/bottom-sheet"/,
  "Organization profile sheet must use Gorhom's scrollable container",
);
assert.match(
  sheet,
  /return\s*\(\s*<BottomSheetScrollView\s+style=\{styles\.scroll\}/,
  "Organization profile sheet content must be rendered inside BottomSheetScrollView",
);
assert.match(
  sheet,
  /AndroidSheetKeyboardBridge/,
  "Organization profile sheet must bridge Android's first keyboard measurement",
);
assert.match(
  keyboardBridge,
  /keyboardDidShow/,
  "Android keyboard bridge must recover the first keyboardDidShow height",
);
assert.match(
  sheet,
  /useSafeAreaInsets/,
  "Organization profile sheet must read the device safe-area inset",
);
assert.match(
  sheet,
  /Keyboard\.addListener\("keyboardDidShow"/,
  "Organization profile sheet must track Android keyboard visibility",
);
assert.match(
  sheet,
  /Keyboard\.addListener\("keyboardDidHide"/,
  "Organization profile sheet must restore safe-area spacing after keyboard hide",
);
assert.match(
  sheet,
  /paddingBottom:\s*(?:Platform\.OS\s*===\s*"android"\s*&&\s*)?keyboardVisible\s*\?\s*0\s*:\s*insets\.bottom/,
  "Organization profile sheet must not add safe-area padding while keyboard is open",
);
assert.match(
  sheet,
  /keyboardShouldPersistTaps="handled"/,
  "Organization profile sheet must keep button taps reliable while keyboard is open",
);
assert.match(
  sheet,
  /keyboardDismissMode="interactive"/,
  "Organization profile sheet must dismiss the keyboard interactively",
);
assert.doesNotMatch(
  sheet,
  /paddingBottom:\s*Math\.max|paddingBottom:\s*24/,
  "Organization profile sheet must not add extra or fixed bottom padding",
);
assert.match(settings, /openSheet\("organizationProfile"/);
assert.match(settings, /handleOrganizationSwitch/);
assert.match(settings, /organization\.selectTitle/);

console.log("Organization profile update contract passed");
