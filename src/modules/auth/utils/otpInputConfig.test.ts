import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { getOtpAutofillConfig } from "./otpInputConfig.ts";

const iosConfig = getOtpAutofillConfig("ios");

assert.equal(iosConfig.textContentType, "oneTimeCode");
// React Native never forwards autoComplete to iOS, so setting it there only
// made the config look like it was doing something it was not.
assert.equal("autoComplete" in iosConfig, false);

const androidConfig = getOtpAutofillConfig("android");

assert.equal(androidConfig.autoComplete, "sms-otp");
assert.equal(androidConfig.importantForAutofill, "yes");

console.log("OTP AutoFill platform configuration tests passed");
