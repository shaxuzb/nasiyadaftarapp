const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const login = read("src/screens/LoginScreen.tsx");
const register = read("src/screens/RegisterScreen.tsx");
const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");

for (const screen of [login, register]) {
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
  assert.doesNotMatch(screen, /styles\.card/);
  assert.doesNotMatch(screen, /style=\{\{ marginTop: spacing\.xs \}\}/);
}

assert.match(login, /t\("common\.or"\)/);
assert.match(register, /t\("common\.or"\)/);
assert.match(uz, /or:\s*"yoki"/);
assert.match(ru, /or:\s*"или"/);

console.log("Auth screens UI contract passed");
