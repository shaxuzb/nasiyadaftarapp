// When the PIN screen takes over, nothing may stay open on top of it.
//
// The PIN screen is a layer inside the app; bottom sheets and dialogs are drawn
// above it. A sheet left open would show a customer's name and balance on a
// screen that says it is locked. Each sheet and dialog closes itself on lock.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const read = (file) => fs.readFileSync(file, "utf8");

/* 1. The hook closes on lock, once per lock, with the latest closure. */

function createHook() {
  const state = { isLocked: false, setupRequired: false };
  const env = { keyboard: 0, effects: [] };
  let lastDeps;
  const code = ts.transpileModule(read("src/modules/pin-auth/hooks/useDismissOnAppLock.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const ref = { current: undefined };
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (name === "react") {
        return {
          useRef: (initial) => {
            if (ref.current === undefined) ref.current = initial;
            return ref;
          },
          useEffect: (effect, deps) => {
            // Runs only when a dependency changed, as React would.
            if (!lastDeps || deps.some((value, index) => value !== lastDeps[index])) effect();
            lastDeps = deps;
          },
        };
      }
      if (name === "react-native") return { Keyboard: { dismiss: () => env.keyboard++ } };
      if (name === "../context/AppLockContext") return { useAppLock: () => state };
      throw new Error("Unexpected dependency: " + name);
    },
  });
  return { state, env, render: (dismiss) => exports.useDismissOnAppLock(dismiss) };
}

const hook = createHook();
let closed = [];
hook.render(() => closed.push("first"));
assert.deepEqual(closed, [], "Nothing closes while the app is unlocked");

hook.state.isLocked = true;
hook.render(() => closed.push("second"));
assert.deepEqual(closed, ["second"], "Locking closes it, using the latest closure");
assert.equal(hook.env.keyboard, 1, "The keyboard is put away, or it would cover the PIN pad");

hook.render(() => closed.push("third"));
assert.deepEqual(closed, ["second"], "A re-render while locked does not close again");

hook.state.isLocked = false;
hook.render(() => closed.push("fourth"));
hook.state.setupRequired = true;
hook.render(() => closed.push("fifth"));
assert.deepEqual(closed, ["second", "fifth"], "PIN setup covers the app the same way");

/* 2. Every sheet uses it. The update prompt is the exception: it has to be
      seen even on a locked app, and it shows nothing private. */

const sheets = [];
(function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = directory + "/" + entry.name;
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx$/.test(entry.name) && /<BottomSheetModal\s/.test(fs.readFileSync(full, "utf8"))) {
      sheets.push(full);
    }
  }
})("src");
const exempt = "src/modules/app-update/components/AppUpdateBottomSheet.tsx";
assert.ok(sheets.includes(exempt));
for (const file of sheets) {
  if (file === exempt) continue;
  const source = read(file);
  assert.match(
    source,
    /useDismissOnAppLock\(|useDismissSheetOnAppLock\(/,
    `${file}: must close when the app locks`,
  );
  // ...and only while it is open. dismiss() on a sheet that is not presented
  // leaves the sheet library in a "dismissing" state it never leaves, after
  // which present() mounts the sheet but does not draw it: every screen's
  // "open" button looks dead after the first PIN lock.
  assert.doesNotMatch(
    source,
    /useDismissOnAppLock\(\(\) => [A-Za-z.]+\.current\?\.dismiss\(\)\)/,
    `${file}: the lock must not dismiss a sheet that may not be presented`,
  );
}

const lockAwareSheet = read("src/bottom-sheet/useDismissSheetOnAppLock.ts");
assert.match(
  lockAwareSheet,
  /const dismiss = useCallback\(\(\) => \{\s*if \(!presentedRef\.current\) return;\s*sheetRef\.current\?\.dismiss\(\);/,
  "A sheet that is not presented is never told to dismiss",
);
assert.match(
  lockAwareSheet,
  /const present = useCallback\(\(\) => \{\s*presentedRef\.current = true;\s*sheetRef\.current\?\.present\(\);/,
);
assert.match(lockAwareSheet, /useDismissOnAppLock\(dismiss\);/);
for (const [file, name] of [
  ["src/screens/CustomersScreen.tsx", "addCustomerSheet"],
  ["src/screens/OrganizationSelectScreen.tsx", "createSheet"],
  ["src/modules/clients/components/CustomerEditSheet.tsx", "sheetControls"],
]) {
  const source = read(file);
  assert.match(source, new RegExp(name + "\\.present\\(\\)"), file + ": presented through the guard");
  assert.match(source, new RegExp(name + "\\.handleDismissed\\(\\);"), file + ": the guard hears when the sheet is gone");
  assert.doesNotMatch(
    source,
    /[A-Za-z]+\.current\?\.(present|dismiss)\(\)/,
    file + ": no present/dismiss past the guard",
  );
}
assert.match(
  read("src/modules/subscription/components/SubscriptionUpgradeModal.tsx"),
  /useDismissOnAppLock\(\(\) => \{\s*if \(presentedRef\.current\) sheet\.current\?\.dismiss\(\);\s*\}\);/,
);
const sheetProvider = read("src/bottom-sheet/BottomSheetProvider.tsx");
assert.match(
  sheetProvider,
  /if \(presentedRef\.current\) \{\s*modalRef\.current\?\.dismiss\(\);\s*\} else \{[\s\S]{0,220}setActiveEntry\(null\);\s*setIsOpen\(false\);/,
  "A sheet mounted but not yet presented is removed, not dismissed",
);
assert.match(
  sheetProvider,
  /presentedRef\.current = false;\s*if \(!activeEntry\) return;[\s\S]{0,160}requestAnimationFrame\(\(\) => \{\s*presentedRef\.current = true;\s*modalRef\.current\?\.present\(\);/,
);

/* A sheet that sizes itself to its content needs content the library can
   measure. A plain View as the whole content reports nothing, and the sheet
   opens as a dark backdrop with no card. */

const sheetFiles = fs.readdirSync("src/bottom-sheet/sheets").filter((name) => name.endsWith(".tsx"));
for (const name of sheetFiles) {
  const source = read("src/bottom-sheet/sheets/" + name);
  assert.doesNotMatch(
    source,
    /if \((?:isLoading && )?!order\) \{\s*(?:\/\/[^\n]*\s*)*return \(\s*<View\b/,
    name + ": a loading or error state must be a BottomSheetView",
  );
}
for (const name of ["PaymentStatusSheet.tsx", "PaymentDetailSheet.tsx"]) {
  const source = read("src/bottom-sheet/sheets/" + name);
  assert.equal(
    (source.match(/return \(\s*<BottomSheetView\s+style=\{\[\s*styles\.loading,/g) ?? []).length,
    2,
    name + ": both the loading and the error state report their height",
  );
}

/* 3. So do the native dialogs. */

for (const file of [
  "src/context/ConfirmDialogContext.tsx",
  "src/modules/pin-auth/components/SensitiveActionReauthModal.tsx",
]) {
  assert.match(read(file), /useDismissOnAppLock\(/, `${file}: must close when the app locks`);
}
assert.match(
  read("src/context/ConfirmDialogContext.tsx"),
  /if \(resolverRef\.current\) closeWith\(false\);/,
  "A dialog closed by the lock counts as declined, never as confirmed",
);
assert.match(
  read("src/modules/account/context/AccountSecurityContext.tsx"),
  /if \(isResolving \|\| setupRequired \|\| isLocked\) \{\s*closePhoneVerification\(\);/,
  "Phone verification already closes on lock",
);

console.log("Sheets and dialogs close when the PIN screen takes over");
