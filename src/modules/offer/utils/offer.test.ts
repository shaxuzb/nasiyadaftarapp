import assert from "node:assert/strict";
import {
  getOrganizationOfferConsent,
  isOfferAcceptedForOrganization,
  parseOfferInfo,
  parseOfferStatus,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./offer.ts";

/* GET /offer, as documented. */

const info = parseOfferInfo({
  enabled: true,
  version: "2026-10-01",
  title: "Ommaviy oferta",
  url: "https://qarzdaftar.rbsx.uz/terms-of-service",
  requiredForOrganization: true,
});
assert.deepEqual(info, {
  enabled: true,
  version: "2026-10-01",
  title: "Ommaviy oferta",
});
assert.equal(
  "requiredForOrganization" in info,
  false,
  "Whether agreeing is required is not the server's call",
);
assert.equal("url" in info, false, "The link is the app's own; the server's is not read");

/* Switched off. */

const off = parseOfferInfo({ enabled: false, requiredForOrganization: true });
assert.equal(off.enabled, false);

/* A numeric version is kept as it came: it is sent back when accepting. */

assert.equal(parseOfferInfo({ enabled: true, version: 3 }).version, 3);
assert.equal(parseOfferInfo({ enabled: true, version: " v3 " }).version, "v3");
assert.equal(parseOfferInfo({ enabled: true, version: "" }).version, null);
assert.equal(parseOfferInfo({ enabled: true, version: Number.NaN }).version, null);

/* Whatever link the server sends, none of it reaches the app. */

for (const url of ["https://example.com/other-offer", "http://qarzdaftar.rbsx.uz/terms", "javascript:alert(1)", 5, null]) {
  assert.equal("url" in parseOfferInfo({ enabled: true, url }), false, String(url));
  assert.equal("url" in parseOfferStatus({ enabled: true, url }), false, String(url));
}

/* Not an object: an error, which the caller treats as "no offer". */

for (const payload of [null, undefined, "offer", 1, []]) {
  assert.throws(() => parseOfferInfo(payload), /not an object/);
  assert.throws(() => parseOfferStatus(payload), /not an object/);
}

/* GET /offer/status, as documented. */

const pending = parseOfferStatus({
  enabled: true,
  version: "2026-10-01",
  title: "Ommaviy oferta",
  url: "https://qarzdaftar.rbsx.uz/terms-of-service",
  accepted: false,
  acceptedAt: null,
  mustAccept: true,
});
assert.equal(pending.mustAccept, true);
assert.equal(pending.accepted, false);
assert.equal(pending.acceptedAt, null);

const accepted = parseOfferStatus({
  enabled: true,
  version: "2026-10-01",
  accepted: true,
  acceptedAt: "2026-10-08T09:00:00Z",
  mustAccept: false,
});
assert.equal(accepted.accepted, true);
assert.equal(accepted.acceptedAt, "2026-10-08T09:00:00Z");
assert.equal(accepted.mustAccept, false);

assert.equal(
  parseOfferStatus({ enabled: false, mustAccept: true }).mustAccept,
  false,
  "A switched-off offer never blocks the app",
);
assert.equal(parseOfferStatus({ enabled: true, mustAccept: "true" }).mustAccept, false);

/* What a "create organization" form does. */

const none = { visible: false, implied: false };
assert.deepEqual(getOrganizationOfferConsent(undefined), none, "No answer: the form stays as it was");
assert.deepEqual(getOrganizationOfferConsent(null), none);
assert.deepEqual(getOrganizationOfferConsent(off), none, "Switched off: nothing shown");

assert.deepEqual(getOrganizationOfferConsent(info), { visible: true, implied: false });
assert.deepEqual(
  getOrganizationOfferConsent(parseOfferInfo({ enabled: true, requiredForOrganization: false })),
  { visible: true, implied: false },
  "The server calling it optional changes nothing: shown means required",
);

assert.deepEqual(
  getOrganizationOfferConsent(info, accepted),
  { visible: false, implied: true },
  "Accepted earlier: not asked again, and the request still says so",
);
assert.deepEqual(
  getOrganizationOfferConsent(info, pending),
  { visible: true, implied: false },
  "Not accepted yet: asked",
);
assert.deepEqual(
  getOrganizationOfferConsent(info, { ...accepted, mustAccept: true }),
  { visible: true, implied: false },
  "A newer offer than the one accepted: asked again",
);
assert.deepEqual(
  getOrganizationOfferConsent(info, null),
  { visible: true, implied: false },
  "Status unknown: asked, never assumed",
);

/* What the request carries. */

const visible = { visible: true, implied: false };
assert.equal(isOfferAcceptedForOrganization(visible, true), true);
assert.equal(isOfferAcceptedForOrganization(visible, false), false);
assert.equal(isOfferAcceptedForOrganization({ visible: false, implied: true }, false), true);
assert.equal(isOfferAcceptedForOrganization(none, true), false, "No offer: nothing to accept");

console.log("Public offer parsing and organization consent tests passed");
