const assert = require("node:assert/strict");
const fs = require("node:fs");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const packageJson = readJson("package.json");
const appJson = readJson("app.json").expo;

assert.ok(
  packageJson.dependencies?.["@react-native-firebase/app"],
  "@react-native-firebase/app must be installed",
);
assert.ok(
  packageJson.dependencies?.["@react-native-firebase/messaging"],
  "@react-native-firebase/messaging must be installed",
);

assert.equal(appJson.android?.package, "com.rbsx.nasiyadaftarapp");
assert.equal(appJson.ios?.bundleIdentifier, "com.rbsx.nasiyadaftarapp");
assert.equal(appJson.android?.googleServicesFile, "./google-services.json");
assert.equal(appJson.ios?.googleServicesFile, "./GoogleService-Info.plist");
assert.ok(
  appJson.android?.permissions?.includes("android.permission.POST_NOTIFICATIONS"),
  "Android POST_NOTIFICATIONS permission must be declared",
);
assert.equal(
  appJson.ios?.entitlements?.["aps-environment"],
  "production",
);

const androidConfig = readJson("google-services.json");
assert.equal(androidConfig.project_info?.project_id, "nasiya-daftar-8b362");
assert.equal(androidConfig.project_info?.project_number, "1047856631244");
assert.equal(
  androidConfig.client?.[0]?.client_info?.android_client_info?.package_name,
  "com.rbsx.nasiyadaftarapp",
);

const iosConfig = fs.readFileSync("GoogleService-Info.plist", "utf8");
assert.match(iosConfig, /<key>PROJECT_ID<\/key>\s*<string>nasiya-daftar-8b362<\/string>/);
assert.match(iosConfig, /<key>GCM_SENDER_ID<\/key>\s*<string>1047856631244<\/string>/);
assert.match(iosConfig, /<key>BUNDLE_ID<\/key>\s*<string>com\.rbsx\.nasiyadaftarapp<\/string>/);

const androidManifest = fs.readFileSync(
  "android/app/src/main/AndroidManifest.xml",
  "utf8",
);
assert.match(
  androidManifest,
  /android\.permission\.POST_NOTIFICATIONS/,
  "Checked-in Android manifest must declare POST_NOTIFICATIONS",
);

console.log("Firebase native configuration contract passed");
