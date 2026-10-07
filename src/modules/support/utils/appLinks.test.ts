import assert from "node:assert/strict";
import {
  DEFAULT_APP_LINKS,
  findAppLink,
  getHeaderAppLinks,
  getLinkHost,
  getSupportSheetLinks,
  isKnownAppLinkKey,
  isOpenableLinkUrl,
  parseAppLinks,
  toOpenableUrl,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./appLinks.ts";

/* The documented answer is read as is, in the server's order. */

const documented = [
  { key: "telegram_channel", title: "Telegram kanal", url: "https://t.me/qarzdaftar" },
  { key: "telegram_group", title: "Telegram guruh", url: "https://t.me/+abc" },
  { key: "instagram", title: "Instagram", url: "https://www.instagram.com/qarzdaftar.rbsx/" },
  { key: "support", title: "Yordam", url: "https://t.me/richdev_1" },
];
assert.deepEqual(parseAppLinks(documented), documented);

/* The header gets the two public profiles; the sheet gets the rest, admin first. */

assert.deepEqual(
  getHeaderAppLinks(documented).map((link: { key: string }) => link.key),
  ["instagram", "telegram_channel"],
);
assert.deepEqual(
  getSupportSheetLinks(documented).map((link: { key: string }) => link.key),
  ["support", "telegram_group"],
);
assert.deepEqual(
  getSupportSheetLinks([
    ...documented,
    { key: "youtube", title: "YouTube", url: "https://www.youtube.com/@rbsx" },
  ]).map((link: { key: string }) => link.key),
  ["support", "telegram_group", "youtube"],
  "A key added later is listed in the sheet, not lost",
);
assert.deepEqual(
  getHeaderAppLinks([documented[1], documented[3]]),
  [],
  "No icon for a link that was not sent",
);

/* Addresses are taken as sent. A handle or a bare username is not a link and
   is not turned into one by guessing which service it belongs to. */

assert.deepEqual(
  parseAppLinks([
    { key: "telegram_channel", title: "Telegram kanal", url: "https://t.me/rbsx_uz" },
    { key: "instagram", title: "Instagram", url: "@rbsx.ai" },
    { key: "support", title: "Admin", url: "richboy" },
    { key: "telegram_group", title: "Guruh", url: "t.me/+cPd_xrh7bVI0NTVi" },
  ]).map((link: { key: string }) => link.key),
  ["telegram_channel"],
);

/* A key the app has never heard of is kept: it is shown with a generic icon. */

const future = parseAppLinks([
  { key: "youtube", title: "YouTube", url: "https://www.youtube.com/@rbsx" },
]);
assert.equal(future.length, 1);
assert.equal(isKnownAppLinkKey(future[0].key), false);
assert.equal(isKnownAppLinkKey("support"), true);
assert.equal(getLinkHost(future[0].url), "youtube.com");

/* One bad entry does not cost the rest of the list. */

assert.deepEqual(
  parseAppLinks([
    null,
    "text",
    { key: "", title: "No key", url: "https://example.com" },
    { key: "no_url", title: "No url" },
    { key: "script", title: "Script", url: "javascript:alert(1)" },
    { key: "plain_http", title: "Plain", url: "http://example.com" },
    { key: "file", title: "File", url: "file:///etc/passwd" },
    { key: "ok", title: "  Fine  ", url: "  https://example.com/x  " },
    { key: "ok", title: "Duplicate", url: "https://example.com/y" },
  ]),
  [{ key: "ok", title: "Fine", url: "https://example.com/x" }],
);

/* A missing title is allowed; the screen falls back to the address. */

assert.deepEqual(parseAppLinks([{ key: "site", url: "https://qarzdaftar.uz" }]), [
  { key: "site", title: "", url: "https://qarzdaftar.uz" },
]);

/* An empty list is a valid answer; anything that is not a list is an error. */

assert.deepEqual(parseAppLinks([]), []);
for (const payload of [null, undefined, {}, { results: [] }, "[]", 5]) {
  assert.throws(() => parseAppLinks(payload), /not a list/);
}

/* Only addresses a support link can sensibly be are opened. */

for (const url of [
  "https://t.me/qarzdaftar",
  "https://www.instagram.com/x/",
  "tel:+998901234567",
  "mailto:help@qarzdaftar.uz",
]) {
  assert.equal(isOpenableLinkUrl(url), true, url);
}
for (const url of [
  "",
  "t.me/x",
  "http://t.me/x",
  "https://",
  "https://localhost",
  "https://t.me/x y",
  "javascript:alert(1)",
  "intent://scan/#Intent;scheme=zxing;end",
  "tg://resolve?domain=x",
  "tel:",
  "mailto:nobody",
]) {
  assert.equal(isOpenableLinkUrl(url), false, url);
}

/* An address with Cyrillic in it is accepted, and escaped before the OS sees it. */

const cyrillic = "https://qarzdaftar.uz/янгиликлар?тема=қарз";
assert.equal(isOpenableLinkUrl(cyrillic), true);
assert.equal(
  toOpenableUrl(cyrillic),
  "https://qarzdaftar.uz/%D1%8F%D0%BD%D0%B3%D0%B8%D0%BB%D0%B8%D0%BA%D0%BB%D0%B0%D1%80?%D1%82%D0%B5%D0%BC%D0%B0=%D2%9B%D0%B0%D1%80%D0%B7",
);
for (const untouched of [
  "https://t.me/qarzdaftar",
  "https://example.com/a%20b?x=1&y=%D1%8F#top",
  "tel:+998901234567",
]) {
  assert.equal(toOpenableUrl(untouched), untouched, "An ASCII address must not be changed");
}

/* The bundled fallback is itself valid and has the links the buttons need. */

assert.deepEqual(parseAppLinks([...DEFAULT_APP_LINKS]), [...DEFAULT_APP_LINKS]);
assert.ok(findAppLink(DEFAULT_APP_LINKS, "support"));
assert.ok(findAppLink(DEFAULT_APP_LINKS, "instagram"));
assert.equal(findAppLink(DEFAULT_APP_LINKS, "missing"), undefined);

console.log("App links parsing and safety tests passed");
