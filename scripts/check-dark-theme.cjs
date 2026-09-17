const assert = require("node:assert/strict");
const fs = require("node:fs");

const dark = fs.readFileSync("src/theme/dark.ts", "utf8");

assert.match(dark, /background:\s*"#111315"/);
assert.match(dark, /surface:\s*"#191B1F"/);
assert.match(dark, /surfaceElevated:\s*"#202329"/);
assert.match(dark, /inputBackground:\s*"#22252A"/);
assert.match(dark, /border:\s*"#2D3239"/);
assert.doesNotMatch(dark, /background:\s*"#07111F"/);
assert.doesNotMatch(dark, /surface:\s*"#0D1B2E"/);

console.log("Dark theme palette contract passed");
