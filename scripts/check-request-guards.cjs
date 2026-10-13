// Requests the backend saw repeated, and what stops each repeat:
//
//   POST /clients three or four times a second (answered 409)
//     -> one save at a time, held by a ref set on the first tap;
//   a new code requested again inside the resend window
//     -> the code already sent is used, and the timer follows the server's
//        resendAfterSeconds.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

/* Saving a customer. */

const customers = read("src/screens/CustomersScreen.tsx");
const handler = customers.slice(customers.indexOf("if (creatingCustomerRef.current) return;"));
assert.ok(handler.length > 0, "The save handler starts by checking the guard");
assert.ok(
  handler.indexOf("creatingCustomerRef.current = true;") < handler.indexOf("try {"),
  "The guard is set before the request starts, not on the next render",
);
assert.match(
  handler,
  /\} finally \{\s*creatingCustomerRef\.current = false;\s*setIsCreatingCustomer\(false\);/,
  "The guard is released whether the request succeeded or not",
);

/* Asking for a login code. */

const phoneAuth = read("src/screens/PhoneAuthScreen.tsx");
assert.match(
  phoneAuth,
  /const active = getActiveCodeRequest\("login", normalizedPhone\);\s*if \(active\) \{[\s\S]{0,400}resendAfterSeconds: active\.resendAfterSeconds,[\s\S]{0,200}return;/,
  "A code already sent to this number goes straight to the code screen",
);
assert.ok(
  phoneAuth.indexOf('getActiveCodeRequest("login", normalizedPhone)') <
    phoneAuth.indexOf("requestingRef.current = true;"),
  "The check comes before any request",
);
assert.match(phoneAuth, /if \(requestingRef\.current\) return;\s*requestingRef\.current = true;/);
assert.match(
  phoneAuth,
  /const times = readCodeRequestTimes\(response\);\s*rememberCodeRequest\("login", normalizedPhone, response\.maskedPhone, times\);/,
);

const verify = read("src/screens/PhoneAuthVerifyScreen.tsx");
assert.match(
  verify,
  /Math\.max\(0, Math\.floor\(resendAfterSeconds \|\| DEFAULT_RESEND_AFTER_SECONDS\)\)/,
  "The countdown starts from the server's resend window",
);
assert.match(verify, /setSecondsLeft\(times\.resendAfterSeconds\);/, "A resend restarts it from the new answer");
assert.match(verify, /forgetCodeRequest\("login", phoneNumber\);/, "A used code is forgotten");
assert.doesNotMatch(verify, /DEFAULT_CODE_EXPIRY_SECONDS/, "The timer is the resend window, not the code's lifetime");

/* Asking for a code to link a phone number. */

const modal = read("src/modules/account/components/PhoneVerificationModal.tsx");
assert.match(
  modal,
  /const active = getActiveCodeRequest\("profile", normalizedPhone\);\s*if \(active\) \{[\s\S]{0,300}setStage\("code"\);[\s\S]{0,120}return;/,
);
assert.match(modal, /if \(requestingRef\.current\) return;\s*requestingRef\.current = true;/);
assert.match(modal, /forgetCodeRequest\("profile", requestedPhone\);/);

console.log("Request guards: single customer save and code requests inside the resend window passed");
