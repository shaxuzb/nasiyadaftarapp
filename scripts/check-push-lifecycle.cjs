const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const app = read("App.tsx");
const context = read("src/modules/push/context/PushNotificationContext.tsx");
const auth = read("src/context/AuthContext.tsx");
const registration = read("src/modules/push/services/pushRegistration.ts");

assert.match(app, /<PushNotificationProvider>/);
assert.match(app, /<AuthProvider>[\s\S]*<PushNotificationProvider>[\s\S]*<AppLockProvider>/);
assert.match(context, /onTokenRefresh/);
assert.match(context, /onNotificationOpenedApp/);
assert.match(context, /getInitialNotification/);
assert.match(context, /onMessage/);
assert.match(context, /AppState\.addEventListener/);
assert.match(context, /refreshPermission/);
assert.match(registration, /getOrCreateUniqueId/);
assert.match(registration, /registerPushDevice/);
assert.match(auth, /unregisterPushDevice/);
assert.match(auth, /session\.uniqueId/);
assert.match(auth, /clearAuthSession/);

console.log("Push notification lifecycle contract passed");
