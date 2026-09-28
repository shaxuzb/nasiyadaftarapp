// The transaction sheet used to vanish while the user was filling it in.
//
// Moving between the amount field (number pad) and the note field (text
// keyboard) makes Android swap the IME. The backdrop's tap gesture fired during
// that swap, and `pressBehavior="close"` calls the sheet's own close() — which
// is why the logs showed `BottomSheet::handleClose` with source USER and no
// `BottomSheetModal::handleDismiss` from the app's own closeSheet().
//
// The rule that fixes it, and that this check keeps in place: while the
// keyboard is on screen a backdrop press only dismisses the keyboard. The sheet
// closes on a press only once the keyboard is already gone. That also spares
// the user from losing a half-filled form to one stray tap.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const provider = fs.readFileSync(
  "src/bottom-sheet/BottomSheetProvider.tsx",
  "utf8",
);

const backdrop = provider.slice(
  provider.indexOf("const renderBackdrop"),
  provider.indexOf("const handleChange"),
);
assert.ok(backdrop, "The provider must keep a backdrop renderer");

assert.match(
  provider,
  /useKeyboardState/,
  "The provider must observe keyboard visibility to guard the backdrop",
);
assert.match(
  backdrop,
  /pressBehavior=\{dismissLocked \|\| isKeyboardVisible \? "none" : "close"\}/,
  "A backdrop press must not close the sheet while the keyboard is visible",
);
assert.match(
  backdrop,
  /onPress=\{[\s\S]*isKeyboardVisible[\s\S]*KeyboardController\.dismiss\(\)/,
  "A backdrop press with the keyboard up must dismiss the keyboard",
);

// The investigation left console logging behind in two files; it must not ship.
for (const file of [
  "src/bottom-sheet/BottomSheetProvider.tsx",
  "src/bottom-sheet/sheets/TransactionSheet.tsx",
]) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /enableLogging|TEMPORARY DIAGNOSTIC/,
    `${file} must not ship the bottom sheet debug logging`,
  );
}

console.log("Bottom sheet backdrop keyboard guard contract passed");
