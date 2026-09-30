const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "src", "components", "OtpInput.tsx"),
  "utf8",
);
const config = fs.readFileSync(
  path.join(root, "src", "modules", "auth", "utils", "otpInputConfig.ts"),
  "utf8",
);

assert.match(
  config,
  /textContentType:\s*"oneTimeCode"/,
  "iOS OTP input must use the native oneTimeCode content type",
);
assert.match(
  config,
  /autoComplete:\s*"sms-otp"/,
  "Android OTP input must keep sms-otp while iOS uses textContentType",
);

// React Native does not forward autoComplete to iOS, so an iOS value there does
// nothing and suggests a conflict that is not happening. Keep each platform's
// config to what that platform reads.
// The iOS branch runs from its `if` to the Android-only importantForAutofill.
const iosBranch = config.slice(
  config.indexOf('if (platform === "ios")'),
  config.indexOf("importantForAutofill"),
);
assert.ok(iosBranch.includes("oneTimeCode"), "The iOS branch must be found");
// Up to the first "}" is the object the iOS branch returns. The pattern needs
// the colon, so it matches a property and not the word in the comment above.
assert.doesNotMatch(
  iosBranch.slice(0, iosBranch.indexOf("}")),
  /autoComplete\s*:/,
  "The iOS OTP config must rely on textContentType alone",
);
assert.match(
  config,
  /importantForAutofill:\s*"yes"/,
  "Android OTP input must keep opting into autofill",
);
assert.doesNotMatch(
  source,
  /opacity:\s*0|width:\s*1,|height:\s*1,/,
  "OTP autofill input must not be reduced to a hidden 1x1 transparent field",
);
assert.match(
  source,
  /Platform\.OS === "ios" \? \(\s*<TextInput[\s\S]*?style=\{\[\s*styles\.iosInput,/,
  "iOS must render a visible native TextInput for reliable oneTimeCode autofill",
);
assert.match(
  source,
  /iosInput:\s*\{/,
  "iOS OTP input must have a dedicated visible style",
);
assert.match(
  source,
  /selectionColor=\{theme\.primary\}/,
  "iOS OTP input must expose a visible focus cursor",
);
assert.match(
  source,
  /accessibilityLabel=\{t\("common\.otpInput"\)\}/,
  "OTP native input must expose its semantic label directly",
);

console.log("iOS OTP oneTimeCode autofill checks passed");
