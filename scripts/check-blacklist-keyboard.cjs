const fs = require("node:fs");

const filename = "src/screens/BlacklistSettingsScreen.tsx";
const source = fs.readFileSync(filename, "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Blacklist keyboard check failed: ${message}`);
  }
}

assert(
  /KeyboardAwareScrollView/.test(source),
  "settings content must use a keyboard-aware scroll view",
);
assert(
  /<KeyboardAwareScrollView[\s\S]{0,400}bottomOffset=\{/.test(source),
  "keyboard-aware content must keep a safe gap from the keyboard",
);
assert(
  /<KeyboardAvoidingView[\s\S]{0,180}behavior="padding"/.test(source),
  "the screen container must move its sticky footer on Android and iOS",
);
assert(
  !/behavior=\{Platform\.OS === "ios" \? "padding" : undefined\}/.test(source),
  "Android must not disable keyboard avoidance",
);

console.log("Blacklist settings keyboard checks passed.");
