// Exercise the installed native entry point: Metro uses src/, not lib/module/.
// A disabled focus target here prevents cached keyboard events from being handled.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");

const packageRoot = path.dirname(require.resolve("@gorhom/bottom-sheet/package.json"));
const filename = path.join(packageRoot, "src/components/bottomSheetTextInput/BottomSheetTextInput.tsx");
const ast = babel.parseSync(fs.readFileSync(filename, "utf8"), {
  filename,
  babelrc: false,
  configFile: false,
  parserOpts: { plugins: ["typescript", "jsx"] },
});

function loadHandler(name, context) {
  let callback;
  babel.traverse(ast, {
    VariableDeclarator(p) {
      if (p.node.id.name === name) callback = p.node.init.arguments[0];
    },
  });
  assert.ok(callback, `Installed bottom sheet must expose ${name}; review this check after upgrades`);
  const t = babel.types;
  const { code } = babel.transformFromAstSync(
    t.file(t.program([t.expressionStatement(callback)])),
    null,
    {
      filename: "handler.ts",
      babelrc: false,
      configFile: false,
      plugins: ["@babel/plugin-transform-typescript"],
    },
  );
  return vm.runInNewContext(code, context);
}

let state = { height: 300, target: undefined };
let focusedNode = 42;
let forwardedFocus;
let forwardedBlur;
const context = {
  animatedKeyboardState: {
    get: () => state,
    set: (update) => { state = update(state); },
  },
  textInputNodesRef: { current: new Set([42, 43]) },
  RNTextInput: { State: { currentlyFocusedInput: () => focusedNode } },
  findNodeHandle: (node) => node,
  onFocus: (event) => { forwardedFocus = event; },
  onBlur: (event) => { forwardedBlur = event; },
};
const focus = loadHandler("handleOnFocus", context);
const blur = loadHandler("handleOnBlur", context);
const event = { nativeEvent: { target: 42 } };
focus(event);
assert.equal(state.target, 42, "Focus must register the native target so keyboard events can move the sheet");
assert.equal(state.height, 300, "Focus must retain the keyboard height");
assert.equal(forwardedFocus, event, "Focus must reach the app input");

focusedNode = 43;
blur(event);
assert.equal(state.target, 42, "Switching between sheet fields must retain keyboard handling");
focus({ nativeEvent: { target: 43 } });
assert.equal(state.target, 43, "The phone field must become the keyboard target");
focusedNode = null;
const blurEvent = { nativeEvent: { target: 43 } };
blur(blurEvent);
assert.equal(state.target, undefined, "Leaving the sheet must release its keyboard target");
assert.equal(forwardedBlur, blurEvent, "Blur must reach the app input");
console.log("Bottom sheet keyboard focus, field switching and blur checks passed");
