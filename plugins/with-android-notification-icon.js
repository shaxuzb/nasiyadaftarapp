const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");

const ICON_RESOURCE_NAME = "ic_stat_notification";
const ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M4,4.5C6.8,3.6 9.4,4.1 12,6c2.6,-1.9 5.2,-2.4 8,-1.5v15c-2.8,-0.9 -5.4,-0.4 -8,1.5c-2.6,-1.9 -5.2,-2.4 -8,-1.5zM12,6v15M6.2,7.1c1.5,0 2.9,0.4 4.3,1.3v8.4c-1.4,-0.8 -2.8,-1.2 -4.3,-1.2zM17.8,7.1c-1.5,0 -2.9,0.4 -4.3,1.3v8.4c1.4,-0.8 2.8,-1.2 4.3,-1.2z" />
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M13,12.8l2,-2l1.3,1.3l3.2,-3.2v-1.4h1.5v3.4h-1.5v-0.5l-3.2,3.2l-1.3,-1.3l-1,1z" />
</vector>
`;

function upsertMetaData(application, name, resource) {
  const metadata = application["meta-data"] || [];
  const existing = metadata.find((item) => item.$?.["android:name"] === name);

  if (existing) {
    existing.$["android:resource"] = resource;
  } else {
    metadata.push({
      $: {
        "android:name": name,
        "android:resource": resource,
      },
    });
  }

  application["meta-data"] = metadata;
}

function withAndroidNotificationIcon(config) {
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) return config;

    upsertMetaData(
      application,
      "com.google.firebase.messaging.default_notification_icon",
      `@drawable/${ICON_RESOURCE_NAME}`,
    );
    return config;
  });

  return withDangerousMod(config, ["android", async (config) => {
    const drawableDirectory = path.join(
      config.modRequest.platformProjectRoot,
      "app",
      "src",
      "main",
      "res",
      "drawable",
    );
    fs.mkdirSync(drawableDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(drawableDirectory, `${ICON_RESOURCE_NAME}.xml`),
      ICON_XML,
      "utf8",
    );
    return config;
  }]);
}

module.exports = withAndroidNotificationIcon;
