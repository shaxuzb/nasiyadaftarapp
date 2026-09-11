const assert = require("node:assert/strict");
const fs = require("node:fs");

const registry = fs.readFileSync("src/bottom-sheet/registry.ts", "utf8");
const provider = fs.readFileSync(
  "src/bottom-sheet/BottomSheetProvider.tsx",
  "utf8",
);
const languageSheet = fs.readFileSync(
  "src/bottom-sheet/sheets/LanguageSheet.tsx",
  "utf8",
);

assert.match(
  registry,
  /language:\s*\{[\s\S]*dismissKeyboardOnOpen:\s*false/,
  "Language sheet must opt out of the global keyboard-dismiss wait",
);
assert.match(
  provider,
  /sheetRegistry\[type\]\.dismissKeyboardOnOpen\s*===\s*false\s*\)\s*\{\s*requestAnimationFrame\(activateSheet\);/,
  "Language sheet activation must wait one frame for BottomSheetModal to mount",
);
assert.match(
  languageSheet,
  /<BottomSheetView\s+style=\{\[styles\.container,/,
  "Dynamic language sheet content must be measured by BottomSheetView",
);

console.log("Language sheet opening optimization contract passed");
