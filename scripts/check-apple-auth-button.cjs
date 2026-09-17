const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const filePath = (...parts) => path.join(root, ...parts);
const read = (...parts) => fs.readFileSync(filePath(...parts), "utf8");

assert.equal(
  fs.existsSync(filePath("src", "components", "AppleAuthButton.tsx")),
  true,
  "Apple auth must be extracted into a reusable component",
);
const button = read("src", "components", "AppleAuthButton.tsx");
const login = read("src", "screens", "LoginScreen.tsx");
const register = read("src", "screens", "RegisterScreen.tsx");
const uz = read("src", "i18n", "translations", "uz.ts");
const ru = read("src", "i18n", "translations", "ru.ts");

assert.match(
  button,
  /logo-apple/,
  "Apple auth component must show the Apple brand icon",
);
assert.match(
  button,
  /Pressable/,
  "Apple auth component must expose a custom pressable design",
);
assert.match(
  button,
  /fontSize:\s*15/,
  "Apple auth label must use a compact design-system font size",
);
assert.match(
  button,
  /auth\.appleSigningIn/,
  "Apple loading state must use a localized accessibility label",
);
assert.doesNotMatch(
  button,
  /AppleAuthenticationButton/,
  "Apple auth component must not lock the visual label to the native button",
);

assert.match(login, /import \{ AppleAuthButton \} from "\.\.\/components\/AppleAuthButton";/);
assert.match(login, /<AppleAuthButton[\s\S]*variant="signIn"[\s\S]*loading=\{appleLoading\}/);
assert.match(register, /import \{ AppleAuthButton \} from "\.\.\/components\/AppleAuthButton";/);
assert.match(register, /<AppleAuthButton[\s\S]*variant="signUp"[\s\S]*loading=\{appleLoading\}/);
assert.doesNotMatch(login, /AppleAuthentication\.AppleAuthenticationButton/);
assert.doesNotMatch(register, /AppleAuthentication\.AppleAuthenticationButton/);

assert.match(uz, /appleSigningIn:/);
assert.match(uz, /appleSignIn:/);
assert.match(uz, /appleSignUp:/);
assert.match(ru, /appleSigningIn:/);
assert.match(ru, /appleSignIn:/);
assert.match(ru, /appleSignUp:/);

console.log("Apple auth button consistency and localization checks passed");
