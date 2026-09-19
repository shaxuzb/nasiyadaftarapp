// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { createPushDevicePayload, mapAndroidPermissionStatus, mapAuthorizationStatus } from "./pushRegistrationUtils.ts";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

assert(mapAuthorizationStatus(1) === "granted", "Authorized must be granted");
assert(mapAuthorizationStatus(2) === "granted", "Provisional must be granted");
assert(mapAuthorizationStatus(0) === "denied", "Denied must be denied");
assert(
  mapAuthorizationStatus(-1) === "undetermined",
  "Not determined must be undetermined",
);
assert(
  mapAndroidPermissionStatus("granted") === "granted",
  "Android granted permission must be granted",
);
assert(
  mapAndroidPermissionStatus("never_ask_again") === "denied",
  "Android blocked permission must be denied",
);

const payload = createPushDevicePayload({
  installationId: " device-1 ",
  platform: "android",
  token: " fcm-token ",
});
assert(payload.installationId === "device-1", "Installation ID must be trimmed");
assert(payload.platform === "android", "Platform must be preserved");
assert(payload.token === "fcm-token", "FCM token must be trimmed");

let emptyTokenRejected = false;
try {
  createPushDevicePayload({
    installationId: "device-1",
    platform: "ios",
    token: " ",
  });
} catch {
  emptyTokenRejected = true;
}
assert(emptyTokenRejected, "Empty FCM token must be rejected");

console.log("Push registration utility tests passed");
