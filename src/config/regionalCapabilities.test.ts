// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { resolveRegionalProductCapabilities } from "./regionalCapabilities.ts";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

assert(
  resolveRegionalProductCapabilities({
    platform: "android",
    locale: "en-US",
    timeZone: "America/New_York",
  }).subscriptionVisible,
  "Android must keep the current commerce UI regardless of region",
);

for (const timeZone of [
  "Asia/Tashkent",
  "Asia/Almaty",
  "Asia/Bishkek",
  "Asia/Dushanbe",
  "Asia/Ashgabat",
  "Europe/Moscow",
  "Europe/Istanbul",
]) {
  const result = resolveRegionalProductCapabilities({
    platform: "ios",
    locale: "en-US",
    timeZone,
  });
  assert(result.subscriptionVisible, `${timeZone} must be supported on iOS`);
  assert(result.paymentHistoryVisible, `${timeZone} must expose payment history`);
  assert(result.clientSmsVisible, `${timeZone} must expose client SMS`);
}

const outsideRegion = resolveRegionalProductCapabilities({
  platform: "ios",
  locale: "ru-RU",
  timeZone: "America/New_York",
});
assert(
  !outsideRegion.subscriptionVisible,
  "A concrete unsupported timezone must win over a supported saved locale",
);
assert(!outsideRegion.clientSmsVisible, "Client SMS must be hidden outside the supported iOS region");

assert(
  resolveRegionalProductCapabilities({
    platform: "ios",
    locale: "uz-UZ",
    timeZone: "UTC",
  }).subscriptionVisible,
  "Locale must be used as a fallback when timezone is generic",
);

assert(
  !resolveRegionalProductCapabilities({
    platform: "ios",
    locale: "en-US",
    timeZone: "UTC",
  }).subscriptionVisible,
  "Unsupported locale fallback must hide iOS regional commerce",
);

console.log("Regional product capability tests passed");
