const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const filename = 'src/bottom-sheet/AndroidSheetKeyboardBridge.tsx';

// Native boundaries are simulated; the bridge's actual worklet runs unchanged.
function mount(platform = 'android') {
  const state = { value: { status: 1, height: 0, target: 492, heightWithinContainer: 0 } };
  state.get = () => state.value;
  state.set = update => { state.value = typeof update === 'function' ? update(state.value) : update; };
  let handlers = {};
  let reaction;
  const shared = value => ({ value });
  const deps = {
    'react-native': { Platform: { OS: platform } },
    '@gorhom/bottom-sheet': {
      KEYBOARD_STATUS: { UNDETERMINED: 0, SHOWN: 1, HIDDEN: 2 },
      useBottomSheetInternal: () => ({ animatedKeyboardState: state }),
    },
    'react-native-reanimated': {
      useSharedValue: shared,
      useAnimatedReaction: (prepare, react) => { reaction = () => react(prepare(), null); },
    },
    'react-native-keyboard-controller': {
      KeyboardController: { isVisible: () => false, state: () => ({ height: 0 }) },
      useGenericKeyboardHandler: value => { handlers = value; },
    },
  };
  if (fs.existsSync(filename)) {
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(code, { module, exports: module.exports, require: name => {
      assert.ok(deps[name], `Unexpected dependency ${name}`);
      return deps[name];
    } });
    module.exports.AndroidSheetKeyboardBridge();
  }
  return {
    state,
    event: (name, height) => { handlers[name]?.({ height, duration: 250, target: 492, progress: height ? 1 : 0 }); reaction?.(); },
    flush: () => reaction?.(),
  };
}

const first = mount();
first.event('onEnd', 302);
assert.equal(first.state.value.height, 302, 'First Android show with RN height=0 must use native IME height');
first.state.value.height = 0;
first.flush();
assert.equal(first.state.value.height, 302, 'A late zero-height RN event must not undo the correction');
first.state.value.height = 320;
first.flush();
assert.equal(first.state.value.height, 320, 'Valid RN measurements must remain untouched');
first.event('onStart', 0);
first.state.value = { ...first.state.value, status: 2, height: 0 };
first.flush();
assert.equal(first.state.value.status, 2, 'Dismissal must not reopen the sheet');
assert.equal(first.state.value.height, 0);

const delayedFocus = mount();
delayedFocus.state.value.target = undefined;
delayedFocus.event('onEnd', 302);
assert.equal(delayedFocus.state.value.height, 0, 'Unrelated inputs must not lift this sheet');
delayedFocus.state.value.target = 492;
delayedFocus.flush();
assert.equal(delayedFocus.state.value.height, 302, 'Native show arriving before focus must be replayed');
const ios = mount('ios');
ios.event('onEnd', 302);
assert.equal(ios.state.value.height, 0, 'iOS behavior must remain unchanged');
console.log('Android keyboard bridge: first show, late zero event, delayed focus, valid height, hide and iOS checks passed');
