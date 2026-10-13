import assert from "node:assert/strict";
import { toQR } from "toqr";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { buildQrMatrix } from "./qrMatrix.ts";

type Run = readonly [number, number];

const link = "https://t.me/qarz_daftar_rbsx_bot";
const matrix = buildQrMatrix(link);
assert.ok(matrix, "A link has a code");

/* A square with the three finder patterns where a scanner looks for them. */

const { size, rows } = matrix as { size: number; rows: Run[][] };
assert.equal(rows.length, size);
assert.ok(size >= 21 && (size - 21) % 4 === 0, `${size} is a valid QR size`);
// The top edge of a finder pattern is seven dark modules: top-left, top-right.
assert.deepEqual(rows[0][0], [0, 7]);
assert.deepEqual(rows[0][rows[0].length - 1], [size - 7, 7]);
// ...and bottom-left.
assert.deepEqual(rows[size - 1][0], [0, 7]);
// Its second row is a dark module, five light ones, a dark module.
assert.deepEqual(rows[1].slice(0, 2), [
  [0, 1],
  [6, 1],
]);

/* Merging neighbours loses nothing: every dark module is in exactly one
   stretch, and no light module is. */

const modules = toQR(link);
const redrawn = new Uint8Array(size * size);
let views = 0;
rows.forEach((runs, y) => {
  let previousEnd = -1;
  for (const [start, length] of runs) {
    assert.ok(length > 0);
    assert.ok(start > previousEnd, "Stretches in a row neither touch nor overlap");
    previousEnd = start + length;
    for (let x = start; x < start + length; x += 1) redrawn[y * size + x] = 1;
    views += 1;
  }
});
assert.deepEqual([...redrawn], [...modules]);
const dark = modules.reduce((sum, value) => sum + value, 0);
assert.ok(views < dark * 0.6, `Merged: ${views} stretches for ${dark} dark modules`);

/* The same text always gives the same code; different text, a different one. */

assert.deepEqual(buildQrMatrix(link), matrix);
assert.deepEqual(buildQrMatrix(`  ${link}  `), matrix, "Stray spaces are not part of the link");
assert.notDeepEqual(buildQrMatrix("https://t.me/another_bot"), matrix);

/* More text needs a bigger code. */

const longer = buildQrMatrix(`${link}?start=${"x".repeat(120)}`) as { size: number };
assert.ok(longer.size > size);

/* Nothing to encode: no code. */

for (const empty of ["", "   ", "\n"]) {
  assert.equal(buildQrMatrix(empty), null);
}

console.log("QR matrix tests passed");
