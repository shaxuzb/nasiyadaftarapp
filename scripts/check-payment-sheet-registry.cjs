const assert = require("node:assert/strict");
const fs = require("node:fs");

const types = fs.readFileSync("src/bottom-sheet/types.ts", "utf8");
const registry = fs.readFileSync("src/bottom-sheet/registry.ts", "utf8");
const app = fs.readFileSync("App.tsx", "utf8");
const provider = fs.readFileSync(
  "src/bottom-sheet/BottomSheetProvider.tsx",
  "utf8",
);
const backHandlerHook = fs.readFileSync(
  "src/bottom-sheet/useBottomSheetBackHandler.ts",
  "utf8",
);
const checkout = fs.readFileSync(
  "src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx",
  "utf8",
);
const pendingPaymentsSheet = fs.readFileSync(
  "src/bottom-sheet/sheets/PendingPaymentsSheet.tsx",
  "utf8",
);

for (const name of ["paymentCheckout", "paymentStatus", "paymentDetail", "pendingPayments"]) {
  assert.match(types, new RegExp(`\\|?\\s*\\"${name}\\"`));
  assert.match(registry, new RegExp(`${name}:`));
}

assert.match(types, /productType:\s*"subscription"/);
assert.match(types, /productType:\s*"sms_package"/);
assert.match(checkout, /usePaymentCheckout/);
assert.match(checkout, /setDismissLocked\(true\)/);
assert.match(checkout, /closeSheet\(\(\)\s*=>/);
assert.match(checkout, /openSheet\("paymentStatus"/);
assert.doesNotMatch(checkout, /\bModal\b/);
assert.match(pendingPaymentsSheet, /usePayment\(/);
assert.match(pendingPaymentsSheet, /openSheet\("paymentStatus"/);
assert.match(pendingPaymentsSheet, /clearPendingPayment/);
assert.match(
  types,
  /interface SheetRenderProps[\s\S]*?openSheet:\s*BottomSheetContextValue\["openSheet"\]/,
  "Sheet components must receive openSheet from the sheet provider",
);
assert.match(
  checkout,
  /}:\s*SheetRenderProps<"paymentCheckout">\)/,
  "Payment checkout must use provider-injected sheet props",
);
assert.doesNotMatch(
  checkout,
  /useBottomSheet\(|from ["']\.\.\/useBottomSheet["']|from ["']\.\.\/bottom-sheet["']/,
  "Portaled checkout must not read the custom sheet context directly",
);
assert.match(
  checkout,
  /useSafeAreaInsets/,
  "Payment checkout sheet must read the device safe-area inset",
);
assert.match(
  checkout,
  /paddingBottom:\s*insets\.bottom/,
  "Payment checkout sheet bottom padding must use the safe-area inset",
);
assert.doesNotMatch(
  checkout,
  /paddingBottom:\s*Math\.max|paddingBottom:\s*spacing\.xl/,
  "Payment checkout sheet must not add extra or fixed bottom padding",
);
assert.ok(
  app.indexOf("<AuthProvider>") < app.indexOf("<BottomSheetModalProvider>"),
  "BottomSheetModalProvider must be inside AuthProvider so portaled sheets can access auth",
);
assert.ok(
  app.indexOf("<AppProvider>") < app.indexOf("<BottomSheetModalProvider>"),
  "BottomSheetModalProvider must be inside AppProvider so portaled sheets share app context",
);
assert.ok(
  app.indexOf("<ConfirmDialogProvider>") < app.indexOf("<BottomSheetProvider>"),
  "ConfirmDialogProvider must wrap BottomSheetProvider so portaled payment sheets can confirm actions",
);
assert.match(
  provider,
  /<BottomSheetModal[\s\S]*?ref=\{modalRef\}[\s\S]*?<BottomSheetContext\.Provider\s+value=\{contextValue\}[\s\S]*?<ActiveComponent/,
  "Bottom sheet context must be provided inside the portaled modal content",
);
assert.match(
  provider,
  /<ConfirmDialogProvider>[\s\S]*?<BottomSheetContext\.Provider\s+value=\{contextValue\}[\s\S]*?<ActiveComponent[\s\S]*?<\/ConfirmDialogProvider>/,
  "Portaled payment sheets must receive ConfirmDialogProvider inside the modal tree",
);
assert.match(
  provider,
  /useBottomSheetBackHandler\(isOpen,\s*closeSheet\)/,
  "Central bottom sheets must intercept Android back before navigation",
);
assert.match(
  backHandlerHook,
  /Platform\.OS\s*!==\s*["']android["']/,
  "Bottom sheet back interception must remain Android-specific",
);

console.log("Payment sheet registry contract passed");
