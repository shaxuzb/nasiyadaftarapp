import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { legalDocumentPage, legalLanguage, parseLegalDocument } from "./legalDocument.ts";

assert.deepEqual(parseLegalDocument({ title: " Ommaviy oferta ", body: "# 1. Umumiy\n\nMatn" }), {
  title: "Ommaviy oferta",
  body: "# 1. Umumiy\n\nMatn",
});
assert.deepEqual(parseLegalDocument({ body: "Matn" }), { title: null, body: "Matn" });
assert.equal(parseLegalDocument({ title: "Bo'sh", body: "   " }), null, "No text, nothing to show");
assert.equal(parseLegalDocument(null), null);
assert.equal(parseLegalDocument([]), null);

assert.equal(legalLanguage("ru"), "ru");
assert.equal(legalLanguage("uz"), "uz");
assert.equal(legalLanguage("en"), "uz", "The offer is published in uz and ru only");

const page = legalDocumentPage("<p>Salom</p>", {
  text: "#111",
  muted: "#555",
  link: "#06c",
  border: "#ddd",
  background: "#fff",
  surface: "#eee",
});
assert.match(page, /<meta name="viewport"/);
assert.match(page, /<body><p>Salom<\/p><\/body>/);
assert.match(page, /table\{display:block;overflow-x:auto/, "Wide tables scroll instead of overflowing");

console.log("Legal document parsing tests passed");
