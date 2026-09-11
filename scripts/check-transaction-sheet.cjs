const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const filename = "src/bottom-sheet/sheets/TransactionSheet.tsx";
const code = ts.transpileModule(
  fs.readFileSync(filename, "utf8") +
    "\nexport const controllerUnderTest = useTransactionController;\nexport const formatUnderTest = formatAmountInput;",
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  },
).outputText;
const queryCode = ts.transpileModule(
  fs.readFileSync("src/core/query/queryKeys.ts", "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  },
).outputText;
const queryExports = {};
vm.runInNewContext(queryCode, { exports: queryExports });

function createHarness({
  amount = "200 000",
  balance = 500000,
  failure = false,
  type = "debt",
} = {}) {
  let stateIndex = 0;
  const seeds = [amount, "Test izoh", null, type];
  const calls = [];
  const messages = [];
  const locks = [];
  const invalidations = [];
  let closes = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const mocks = {
    react: {
      createContext: () => ({}),
      memo: (component) => component,
      useCallback: (callback) => callback,
      useState: () => [seeds[stateIndex++], () => {}],
      useRef: (value) => ({ current: value }),
      default: {
        memo: (component) => component,
        useCallback: (callback) => callback,
      },
    },
    "react-native": { Keyboard: { dismiss() {} } },
    "@expo/vector-icons": {},
    "@gorhom/bottom-sheet": {},
    "../AndroidSheetKeyboardBridge": {}, // UI behavior has its own keyboard regression test.
    "react-native-keyboard-controller": {
      KeyboardController: { dismiss: () => Promise.resolve() },
    },
    "react-native-safe-area-context": {},
    "@tanstack/react-query": {
      useQueryClient: () => ({
        invalidateQueries: (key) => {
          invalidations.push(key.queryKey);
          return Promise.resolve();
        },
      }),
    },
    "../../context/ToastContext": {
      useToast: () => ({ showToast: (...args) => messages.push(args) }),
    },
    "../../context/AppContext": {
      useApp: () => ({
        getCustomerById: () => ({ fullName: "Ali", phone: "+998901234567" }),
      }),
    },
    "../../context/AuthContext": {
      useAuth: () => ({ user: { id: 9, organizationId: 7 } }),
    },
    "../../utils": { getInitials: () => "AL" },
    "../../utils/haptics": { hapticError() {}, hapticSuccess() {} },
    "../../i18n": {
      formatLocalizedDisplayedBalance: () => "0 so'm",
      getLocalizedApiErrorMessage: () => "Saqlanmadi",
      useTranslation: () => ({ locale: "uz", t: (key) => key }),
    },
    "../../modules/transactions/services/transactionsService": {
      createClientTransaction: async (...args) => {
        calls.push(args);
        await gate;
        if (failure) throw new Error("offline");
      },
    },
    "../../core/query/queryKeys": queryExports,
    "../../hooks/useTheme": {},
    "../../utils/apiError": { getApiErrorMessage: () => "Saqlanmadi" },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (name in mocks) return mocks[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const controller = exports.controllerUnderTest({
    props: { customerId: 82, currentBalance: balance, type },
    closeSheet: () => {
      closes++;
    },
    setDismissLocked: (value) => locks.push(value),
  });
  return {
    controller,
    calls,
    messages,
    locks,
    invalidations,
    release,
    closed: () => closes,
    format: exports.formatUnderTest,
  };
}

async function main() {
  const debt = createHarness();
  assert.equal(debt.controller.nextBalance, 700000);
  assert.equal(debt.format("000200000"), "200 000");
  const pending = debt.controller.save("debt");
  await debt.controller.save("payment");
  assert.equal(
    debt.calls.length,
    1,
    "Double taps across the two buttons must create only one transaction",
  );
  assert.equal(debt.calls[0][1].type, "debt");
  assert.equal(debt.calls[0][1].amount, 200000);
  assert.equal(debt.calls[0][1].note, "Test izoh");
  debt.release();
  await pending;
  assert.equal(debt.closed(), 1);
  assert.deepEqual(debt.locks, [true, false]);
  assert.ok(
    debt.invalidations.every((key) => key[1] === 7),
    "Refresh only the active organization",
  );

  const payment = createHarness({ balance: 100000, type: "payment" });
  assert.equal(
    payment.controller.nextBalance,
    -100000,
    "Overpayment must remain a credit instead of being clamped to zero",
  );
  payment.release();
  await payment.controller.save("payment");
  assert.equal(payment.calls[0][1].type, "payment");
  const credit = createHarness({ balance: -500000 });
  assert.equal(
    credit.controller.nextBalance,
    -300000,
    "Existing credit must be included when adding debt",
  );

  const invalid = createHarness({ amount: "0" });
  await invalid.controller.save("debt");
  assert.equal(invalid.calls.length, 0);
  const failed = createHarness({ failure: true });
  failed.release();
  await failed.controller.save("debt");
  assert.equal(failed.closed(), 0, "Failed saves must keep the form open");
  assert.equal(failed.locks.at(-1), false);
  await failed.controller.save("debt");
  assert.equal(failed.calls.length, 2, "Allow a retry after failure");
  console.log(
    "Transaction sheet: debt/payment payloads, duplicate submits, credit balances, validation and retry checks passed",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
