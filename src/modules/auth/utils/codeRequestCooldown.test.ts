import assert from "node:assert/strict";
import {
  DEFAULT_RESEND_AFTER_SECONDS,
  forgetCodeRequest,
  getActiveCodeRequest,
  readCodeRequestTimes,
  rememberCodeRequest,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./codeRequestCooldown.ts";

const start = Date.UTC(2026, 9, 8, 12, 0, 0);
const phone = "+998901234567";

/* The server's answer. */

assert.deepEqual(readCodeRequestTimes({ expiresInSeconds: 300, resendAfterSeconds: 120 }), {
  expiresInSeconds: 300,
  resendAfterSeconds: 120,
});
assert.deepEqual(
  readCodeRequestTimes({ expiresInSeconds: 180 }),
  { expiresInSeconds: 180, resendAfterSeconds: 180 },
  "An older server sends no resend time; the code's lifetime is the wait, as before",
);
assert.deepEqual(readCodeRequestTimes({ expiresInSeconds: "90", resendAfterSeconds: "60.9" }), {
  expiresInSeconds: 90,
  resendAfterSeconds: 60,
});
assert.deepEqual(readCodeRequestTimes({}), {
  expiresInSeconds: DEFAULT_RESEND_AFTER_SECONDS,
  resendAfterSeconds: DEFAULT_RESEND_AFTER_SECONDS,
});
assert.deepEqual(readCodeRequestTimes({ expiresInSeconds: -5, resendAfterSeconds: 0 }), {
  expiresInSeconds: DEFAULT_RESEND_AFTER_SECONDS,
  resendAfterSeconds: DEFAULT_RESEND_AFTER_SECONDS,
});

/* Nothing sent yet: ask. */

assert.equal(getActiveCodeRequest("login", phone, start), null);

/* Just sent: do not ask again, use the one sent. */

rememberCodeRequest("login", phone, "+998 ** *** ** 67", { expiresInSeconds: 300, resendAfterSeconds: 120 }, start);
assert.deepEqual(getActiveCodeRequest("login", phone, start + 20_000), {
  maskedPhone: "+998 ** *** ** 67",
  expiresAt: start + 300_000,
  resendAt: start + 120_000,
  resendAfterSeconds: 100,
  expiresInSeconds: 280,
});
assert.ok(
  getActiveCodeRequest("login", "+998 90 123 45 67", start + 20_000),
  "The same number written with spaces is the same number",
);

/* A different number, or the other flow, has its own limit. */

assert.equal(getActiveCodeRequest("login", "+998907654321", start + 20_000), null);
assert.equal(getActiveCodeRequest("profile", phone, start + 20_000), null);

/* Once another may be requested, ask, even though the old code still works. */

assert.equal(getActiveCodeRequest("login", phone, start + 120_000), null);
assert.equal(getActiveCodeRequest("login", phone, start + 119_500)?.resendAfterSeconds, 1);

/* A code that has expired is no use, whatever the resend time says. */

rememberCodeRequest("profile", phone, "", { expiresInSeconds: 60, resendAfterSeconds: 120 }, start);
assert.equal(getActiveCodeRequest("profile", phone, start + 61_000), null);

/* Used: the number starts clean. */

rememberCodeRequest("login", phone, "", { expiresInSeconds: 300, resendAfterSeconds: 120 }, start);
forgetCodeRequest("login", phone);
assert.equal(getActiveCodeRequest("login", phone, start + 1_000), null);

console.log("Verification code request cooldown tests passed");
