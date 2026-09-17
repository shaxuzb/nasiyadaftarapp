const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

const app = JSON.parse(read("app.json"));
const pkg = JSON.parse(read("package.json"));
const login = read("src/screens/LoginScreen.tsx");
const register = read("src/screens/RegisterScreen.tsx");
const appleButton = read("src/components/AppleAuthButton.tsx");
const context = read("src/context/AuthContext.tsx");
const appleApi = read("src/modules/auth/services/appleAuthApi.ts");
const appleNative = read("src/modules/auth/services/appleSignInService.ts");
const appleCredential = read("src/modules/auth/services/appleCredential.ts");
const axios = read("src/services/axiosService.ts");
const route = read("src/services/accountRoute.ts");

assert.equal(app.expo.ios.usesAppleSignIn, true, "iOS Apple Sign In capability must be enabled");
assert.ok(app.expo.plugins.includes("expo-apple-authentication"), "Apple auth config plugin must be present");
assert.equal(pkg.dependencies["expo-apple-authentication"], "~55.0.17");

assert.match(appleApi, /\/account\/apple/);
assert.match(appleNative, /AppleAuthentication\.signInAsync/);
assert.match(appleNative, /AppleAuthenticationScope\.FULL_NAME/);
assert.match(appleNative, /AppleAuthenticationScope\.EMAIL/);
assert.match(appleNative, /formatFullName/);
assert.match(appleNative, /ERR_REQUEST_CANCELED/);
assert.match(appleCredential, /getAppleEmailFromIdentityToken/);

assert.match(context, /loginWithAppleCredential/);
assert.match(context, /appleAccount\(payload\)/);
assert.match(context, /completeAuth\(response\)/);
assert.match(context, /loginWithGoogleIdToken/);

for (const source of [login, register]) {
  assert.match(source, /Platform\.OS === "ios"/);
  assert.match(source, /<AppleAuthButton/);
  assert.doesNotMatch(source, /AppleAuthentication\.AppleAuthenticationButton/);
  assert.match(source, /requestAppleCredential/);
  assert.match(source, /loginWithAppleCredential/);
}

assert.match(register, /pendingAppleCredential/);
assert.match(register, /appleNameRequired/);
assert.match(register, /fullName: resolvedFullName/);

assert.match(appleButton, /logo-apple/);
assert.doesNotMatch(appleButton, /AppleAuthenticationButton/);
assert.match(login, /variant="signIn"/);
assert.match(register, /variant="signUp"/);

assert.match(axios, /isPublicAccountRoute/);
assert.match(route, /"\/account\/apple"/);
assert.doesNotMatch(route, /includes\(/);

console.log("Apple auth native, backend, session and UI integration checks passed");
