// How the user chooses a payment provider. The server lists the providers
// (GET /payments/providers); the app draws one tile per entry, preselects the
// default, and sends the chosen code when the payment starts.
//
// After the order is created the sheet opens the provider's page itself and
// closes; the status sheet comes up when the user is back in the app. It has
// no provider tiles: to pay another way the order is cancelled and bought
// again.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const sheet = read("src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx");
const statusSheet = read("src/bottom-sheet/sheets/PaymentStatusSheet.tsx");
const selector = read("src/modules/payments/components/PaymentMethodSelector.tsx");
const queries = read("src/modules/payments/hooks/usePaymentQueries.ts");
const checkoutHook = read("src/modules/payments/hooks/usePaymentCheckout.ts");
const gate = read("src/modules/payments/components/PaymentRecoveryGate.tsx");
const sheetProvider = read("src/bottom-sheet/BottomSheetProvider.tsx");

/* The logos exist at every density the app can ask for. */

for (const name of ["payme", "click", "click-on-dark"]) {
  for (const suffix of ["", "@2x", "@3x"]) {
    const file = `assets/payments/${name}${suffix}.png`;
    assert.ok(fs.existsSync(file), `${file} is missing`);
    const header = fs.readFileSync(file).subarray(0, 8).toString("hex");
    assert.equal(header, "89504e470d0a1a0a", `${file} is not a PNG`);
  }
  assert.match(selector, new RegExp(`require\\("\\.\\./\\.\\./\\.\\./\\.\\./assets/payments/${name}\\.png"\\)`));
}

/* The tiles come from the list, not from a table in the app. */

assert.match(selector, /providers: readonly PaymentProvider\[\];/);
assert.match(selector, /\{providers\.map\(\(provider\) => \{/, "One tile per provider the server lists");
assert.doesNotMatch(selector, /METHODS\.map|export type PaymentMethod\b/, "No fixed list of providers");
assert.match(selector, /const logo = LOGOS\.get\(provider\.code\);/);
assert.match(
  selector,
  /\{logo \? \([\s\S]{0,260}\) : \(\s*<Text style=\{styles\.name\} numberOfLines=\{1\}>\s*\{provider\.title\}/,
  "A provider without artwork still gets a tile, with its name",
);
assert.match(selector, /flexWrap: "wrap"/, "More providers wrap instead of shrinking");

/* One of several, announced as a choice. */

assert.match(selector, /accessibilityRole="radiogroup"/);
assert.match(selector, /accessibilityRole="radio"/);
assert.match(selector, /accessibilityLabel=\{provider\.title\}/);
assert.match(selector, /accessibilityState=\{\{ selected, disabled \}\}/);
// The tiles follow the theme, and so must the artwork: Click's black wordmark
// would vanish on a dark tile, and its white one on a light tile.
assert.match(selector, /backgroundColor: theme\.surfaceElevated/);
assert.doesNotMatch(selector, /backgroundColor: "#FFFFFF"/, "A fixed white tile ignores dark mode");
assert.match(selector, /source=\{logo\[resolvedScheme\]\}/);
assert.match(
  selector,
  /light: require\("[^"]*\/click\.png"\),\s*dark: require\("[^"]*\/click-on-dark\.png"\)/,
  "Click needs the white wordmark on a dark tile",
);

/* The list is fetched once and shared. */

assert.match(
  queries,
  /export function usePaymentProviders\(enabled = true\) \{[\s\S]{0,260}queryKey: queryKeys\.paymentProviders\(\),\s*queryFn: \(\{ signal \}\) => getPaymentProviders\(signal\),\s*enabled: Boolean\(user\) && enabled,\s*staleTime: 5 \* 60_000,\s*retry: 1,/,
);

/* Checkout sheet: the default is preselected, the choice is sent. */

assert.match(sheet, /usePaymentProviders\(needsMethod\)/, "A free plan asks for no list");
assert.match(
  sheet,
  /const method =\s*chosen !== null && providers\.some\(\(provider\) => provider\.code === chosen\)\s*\? chosen\s*: getDefaultProviderCode\(providers\);/,
  "The server's default stands until the user taps another",
);
assert.match(
  sheet,
  /startCheckout\(\{\s*productType: props\.productType,\s*productId: product\.id,\s*provider: showMethods \? method : null,\s*\}\)/,
  "The chosen provider goes with the request; without a list, none does",
);
assert.match(sheet, /const showMethods = needsMethod && providers\.length > 0;/, "No list, no tiles");
assert.match(
  sheet,
  /const loadingMethods =\s*needsMethod && providersQuery\.isFetching && providersQuery\.data === undefined;/,
);
assert.match(
  sheet,
  /const waitingForMethod = loadingMethods \|\| \(showMethods && method === null\);/,
  "Paying waits for the list, and for a choice when there is no default",
);
assert.ok(
  sheet.indexOf("<PaymentMethodSelector") < sheet.indexOf("styles.primaryButton,"),
  "The selector sits above the pay button",
);
assert.match(sheet, /disabled=\{isCreating \|\| waitingForMethod\}/, "The pay button waits for a choice");
assert.match(
  sheet,
  /if \(submittingRef\.current \|\| waitingForMethod\) return;/,
  "Checkout cannot start without a choice",
);
assert.match(
  sheet,
  /showToast\(getApiErrorUserMessage\(error\) \?\? copy\.error, "error"\);/,
  "A refused provider (400) is explained in the server's words",
);

/* A failed payment keeps the user's choice and does not ask for the list
   again. Locking the sheet against dismissal used to remount it, which put
   the default provider back and dropped the progress state mid-request. */

assert.match(
  sheetProvider,
  /enableContentPanningGesture=\{activeEntry\.type !== "transaction"\}/,
  "The dismiss lock must not change the wrapper the sheet's content lives in",
);
assert.doesNotMatch(sheet, /providersQuery\.refetch/, "An error is not a reason to refetch the list");
assert.doesNotMatch(sheet, /setChosen\(null\)/, "An error does not undo the choice");

/* A successful one shows progress until the payment page has been opened. */

assert.match(sheet, /const isCreating = isRequesting \|\| submitting;/);
assert.equal(
  (sheet.match(/setSubmitting\(false\)/g) ?? []).length,
  1,
  "Progress is switched off only when the payment failed",
);
assert.ok(
  sheet.indexOf("setSubmitting(false)") > sheet.indexOf("} catch (error) {"),
  "Not on success: the sheet closes while the button still shows progress",
);
assert.ok(
  sheet.indexOf("await openCheckoutPage(result);") > sheet.indexOf("await startCheckout({") &&
    sheet.indexOf("await openCheckoutPage(result);") < sheet.indexOf("} catch (error) {"),
  "The page is opened from the sheet, inside the same submit",
);
assert.match(
  sheet,
  /await openCheckoutPage\(result\);\s*\} catch \{[\s\S]{0,260}closeSheet\(\(\) => openSheet\("paymentStatus", \{ orderId \}\)\);\s*showToast\(paymentCopy\.statusSheet\.openError, "error"\);\s*return;/,
  "A page that would not open leaves the user on the order's status, with a way to retry",
);
assert.match(
  sheet,
  /setDismissLocked\(false\);\s*closeSheet\(\);\s*\} catch \(error\) \{/,
  "Once the page is open the sheet simply closes; no status sheet before the user is back",
);

/* Leaving for the payment page: everything the way back needs is written
   first, because the app may be suspended as the page opens. */

const openPage = checkoutHook.slice(checkoutHook.indexOf("const openCheckoutPage = useCallback("));
assert.ok(openPage.length > 0, "The hook opens the payment page");
assert.match(openPage, /openedExternally: true,/);
assert.ok(
  openPage.indexOf("await savePendingPayment({") < openPage.indexOf("await Linking.openURL(checkoutUrl);"),
  "Stored as being paid outside the app before the page opens",
);
assert.match(
  openPage,
  /awaitPaymentReturn\(order\.id\);\s*try \{\s*await Linking\.openURL\(checkoutUrl\);\s*\} catch \(error\) \{[\s\S]{0,120}takeAwaitedPaymentReturn\(\);\s*throw error;/,
  "The note is left before leaving and withdrawn if the page did not open",
);
assert.doesNotMatch(checkoutHook, /replaceOrderId/, "Orders are not swapped for another provider");

/* Back in the app: that order's status, checked with the server. */

assert.match(
  gate,
  /const cameBack = nextState === "active" && previousState !== "active";/,
);
assert.match(
  gate,
  /const orderId = takeAwaitedPaymentReturn\(\);\s*if \(orderId === null\) return;\s*returnedOrderId\.current = orderId;\s*setPendingOrderId\(orderId\);\s*setPendingOpenedExternally\(true\);/,
);
assert.match(
  gate,
  /const justReturned = orderId === returnedOrderId\.current;\s*openSheet\("paymentStatus", justReturned \? \{ orderId, syncOnMount: true \} : \{ orderId \}\);/,
);
assert.match(
  statusSheet,
  /if \(\s*!props\.syncOnMount \|\|\s*syncedOnMountRef\.current \|\|\s*orderStatus !== "pending"\s*\) \{\s*return;\s*\}\s*syncedOnMountRef\.current = true;\s*void sync\(\)\.catch\(\(\) => undefined\);/,
  "Asked once, and only while the order still looks unpaid",
);

/* The status sheet shows the order; it does not offer providers. */

assert.doesNotMatch(
  statusSheet,
  /PaymentMethodSelector|usePaymentProviders|usePaymentCheckout|startCheckout|openCheckoutOnMount/,
);

/* The header is the product's name and nothing else. */

assert.match(
  sheet,
  /<Text style=\{styles\.productName\} numberOfLines=\{2\}>\s*\{product\.name\}/,
  "The sheet opens with what is being bought",
);
assert.doesNotMatch(
  sheet,
  /Ionicons|planTitle|packageTitle|styles\.icon\b/,
  "No icon or 'confirm' title above the product name",
);

const copy = read("src/modules/payments/i18n/paymentCopy.ts");
assert.equal((copy.match(/methodTitle:/g) ?? []).length, 2, "Wording in both languages");
assert.equal((copy.match(/methodHint:/g) ?? []).length, 2);

console.log("Payment provider tiles: server list, default, sent choice and hand-over to the payment page passed");
