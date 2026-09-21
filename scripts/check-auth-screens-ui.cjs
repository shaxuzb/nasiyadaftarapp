const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const phoneAuth = read("src/screens/PhoneAuthScreen.tsx");
const verify = read("src/screens/PhoneAuthVerifyScreen.tsx");
const navigation = read("src/navigation/index.tsx");
const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");

for (const screen of [phoneAuth]) {
  assert.match(screen, /ScreenContainer[\s\S]*padded=\{false\}/);
  assert.match(screen, /ScreenContainer[\s\S]*style=\{styles\.screenInner\}/);
  assert.match(screen, /LanguageSelectorButton/);
  assert.match(screen, /AppleAuthButton/);
  assert.match(screen, /AdminContactButton/);
  assert.match(screen, /styles\.divider/);
  assert.match(screen, /styles\.authAction/);
  assert.match(screen, /screenInner:\s*\{\s*flex:\s*1/);
  assert.match(screen, /paddingHorizontal:\s*spacing\.lg/);
  assert.match(screen, /title:\s*\{[\s\S]*?\.\.\.typography\.displayMedium/);
  assert.match(screen, /desc:\s*\{[\s\S]*?\.\.\.typography\.bodyMedium/);
  assert.match(screen, /logoWrap:\s*\{[\s\S]*?width:\s*88,[\s\S]*?height:\s*88/);
  assert.doesNotMatch(screen, /PhoneAuthMode|auth\.register|onGoToOtherMode/);
}

assert.match(phoneAuth, /t\("common\.or"\)/);
assert.match(uz, /or:\s*"yoki"/);
assert.match(ru, /or:\s*"или"/);
assert.doesNotMatch(navigation, /name="Register"|RegisterScreen/);
assert.equal(
  fs.existsSync("src/screens/RegisterScreen.tsx"),
  false,
  "The passwordless flow must expose one phone auth screen",
);
assert.doesNotMatch(verify, /styles\.card|borderWidth:\s*1/);
assert.match(verify, /Keyboard\.addListener\("keyboardDidHide"/);

console.log("Auth screens UI contract passed");
