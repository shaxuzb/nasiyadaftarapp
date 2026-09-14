# Payment Checkout Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-safe subscription/SMS payment flow with persistent idempotency, external checkout, AppState sync, typed payment bottom sheets, payment history, and canonical entitlement refresh.

**Architecture:** Introduce a focused `src/modules/payments` domain. Keep subscription catalog fetching in the existing subscription module, use the shared authenticated `apiClient`, store unresolved checkout attempt/pending-order metadata in AsyncStorage, and use the existing global typed bottom-sheet registry for checkout/status/detail UI. Payment history is a dedicated authenticated stack screen; fulfillment refreshes current subscription through the existing `AuthContext.refreshSubscription()` path.

**Tech Stack:** Expo SDK 55, React Native 0.83, React 19, TypeScript 5.9, Axios, TanStack Query v5, `expo-crypto`, AsyncStorage, React Native `Linking`/`AppState`, `@gorhom/bottom-sheet`.

**Spec:** `docs/superpowers/specs/2026-09-14-payment-checkout-lifecycle-design.md`

## Global Constraints

- Work only on branch `feat/mobile-production-hardening`; never write to `main`.
- No new runtime dependency is required for the initial payment implementation.
- `API_BASE_URL` already ends with `/api`; service paths MUST be `/payments/...` and `/subscriptions/...`, never `/api/payments/...`.
- FREE plans use `POST /payments/subscriptions/{planId}` exactly like paid plans.
- `Idempotency-Key` is generated once per new purchase attempt with `Crypto.randomUUID()` and reused across retries of the unresolved same attempt.
- Checkout POST, sync, and cancel are never queued for offline replay and never use automatic mutation retry.
- `paymentUrl` is preferred; `paymentLinks.payme` is fallback; only valid HTTPS URLs may be opened.
- `paid && isFulfilled === true` is the only fully fulfilled success state.
- `paid && isFulfilled === false` shows activation-in-progress and uses manual refresh; no aggressive polling.
- Cancel currently treats any 2xx as command success and then reloads the canonical order with `GET /payments/{orderId}`; frontend MUST NOT invent `cancelled` from the command response.
- Payment history uses `GET /payments?limit=30`; do not invent page/offset/cursor parameters.
- Checkout/status/detail transactional UI must use the existing typed bottom-sheet registry; payment history remains a full screen.
- User-scoped payment lifecycle metadata must be cleared on logout/account deletion and must never be visible to another authenticated user.
- Preserve existing subscription catalog API and current subscription refresh architecture.
- All tasks follow strict RED -> GREEN -> REFACTOR and end with a focused commit.

---

## File Structure

### New files

- `src/modules/payments/types/index.ts` — payment order and lifecycle contracts.
- `src/modules/payments/utils/paymentParsing.ts` — strict backend `PaymentOrder` parser.
- `src/modules/payments/utils/paymentUrl.ts` — HTTPS checkout URL validation/selection.
- `src/modules/payments/utils/paymentState.ts` — terminal/fulfilled/status decision helpers.
- `src/modules/payments/services/paymentService.ts` — exact backend HTTP contract.
- `src/modules/payments/services/paymentStorage.ts` — user-scoped unresolved-attempt and pending-order persistence.
- `src/modules/payments/hooks/usePaymentQueries.ts` — history/detail queries and query refresh helpers.
- `src/modules/payments/hooks/usePaymentCheckout.ts` — checkout creation, idempotency, Linking, AppState sync, dedupe, fulfillment orchestration.
- `src/modules/payments/components/PaymentOrderContent.tsx` — shared order/status presentation used by status/detail sheets.
- `src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx` — product confirmation and checkout creation.
- `src/bottom-sheet/sheets/PaymentStatusSheet.tsx` — canonical active-order lifecycle actions.
- `src/bottom-sheet/sheets/PaymentDetailSheet.tsx` — canonical order detail/actions from history.
- `src/screens/PaymentHistoryScreen.tsx` — full-screen 30-item payment history.
- `scripts/check-payment-api.cjs` — service routes/header/body contract.
- `scripts/check-payment-ui.cjs` — typed sheet, navigation, subscription CTA, localization contract.

### Modified files

- `src/core/query/queryKeys.ts` — payment query keys.
- `src/bottom-sheet/types.ts` — payment sheet type/props.
- `src/bottom-sheet/registry.ts` — payment sheet registrations.
- `src/screens/SubscriptionScreen.tsx` — replace admin-contact purchase actions with checkout sheets and add payment-history entry.
- `src/types/index.ts` — add `PaymentHistory` route.
- `src/navigation/index.tsx` — register `PaymentHistoryScreen`.
- `src/context/AuthContext.tsx` — clear current user payment lifecycle metadata during logout.
- `src/modules/account/components/DeleteAccountSection.tsx` — clear current user payment lifecycle metadata after successful backend deletion before final local logout/reset.
- `src/i18n/translations/uz.ts` — Uzbek payment copy.
- `src/i18n/translations/ru.ts` — Russian payment copy.

---

### Task 1: Payment Domain Types, Parser, URL Selection, and State Decisions

**Files:**
- Create: `src/modules/payments/types/index.ts`
- Create: `src/modules/payments/utils/paymentParsing.ts`
- Create: `src/modules/payments/utils/paymentUrl.ts`
- Create: `src/modules/payments/utils/paymentState.ts`
- Test: `src/modules/payments/utils/paymentParsing.test.ts`
- Test: `src/modules/payments/utils/paymentUrl.test.ts`
- Test: `src/modules/payments/utils/paymentState.test.ts`

**Interfaces:**
- Produces:
  - `PaymentProductType`
  - `PaymentStatus`
  - `PaymentLinks`
  - `PaymentOrder`
  - `PaymentCheckoutAttempt`
  - `PendingPaymentReference`
  - `parsePaymentOrder(input: unknown): PaymentOrder`
  - `parsePaymentOrders(input: unknown): PaymentOrder[]`
  - `getPaymentCheckoutUrl(order: PaymentOrder): string | null`
  - `isPaymentFulfilled(order: PaymentOrder): boolean`
  - `isPaymentTerminal(order: PaymentOrder): boolean`
  - `shouldPersistPendingPayment(order: PaymentOrder): boolean`

- [ ] **Step 1: Write failing parser tests**

Create direct TypeScript tests that verify a complete backend sample, nullable fields, history arrays, and rejection of invalid IDs/product types/statuses/negative monetary values.

Core assertions:

```ts
const order = parsePaymentOrder({
  id: 15,
  productType: "subscription",
  productId: 2,
  productCode: "STANDARD",
  productName: "Standard",
  amount: 29900,
  amountTiyin: 2990000,
  currency: "UZS",
  status: "pending",
  remoteStatus: "pending",
  externalId: "a35b9f",
  invoiceId: "invoice-id",
  accountNumber: "EX000001",
  provider: null,
  paymentUrl: "https://pay.example/15",
  paymentLinks: { payme: "https://payme.example/15" },
  createdDate: "2026-09-14T12:00:00",
  updatedDate: "2026-09-14T12:00:01",
  paidDate: null,
  fulfilledDate: null,
  isFulfilled: false,
});
assert(order.id === 15, "Order id must be preserved");
assert(order.status === "pending", "Known status must be preserved");
assert.throws(() => parsePaymentOrder({ ...sample, status: "unknown" }));
assert.throws(() => parsePaymentOrder({ ...sample, id: 0 }));
assert.throws(() => parsePaymentOrder({ ...sample, amount: -1 }));
```

- [ ] **Step 2: Run the new unit tests and verify RED**

Run:

```bash
npm test
```

Expected: FAIL because payment parser/types/helpers do not exist.

- [ ] **Step 3: Implement exact domain types**

Define exactly:

```ts
export type PaymentProductType = "subscription" | "sms_package";
export type PaymentStatus = "pending" | "paid" | "cancelled" | "failed" | "expired";

export interface PaymentLinks {
  payme: string | null;
}

export interface PaymentOrder {
  id: number;
  productType: PaymentProductType;
  productId: number;
  productCode: string;
  productName: string;
  amount: number;
  amountTiyin: number;
  currency: string;
  status: PaymentStatus;
  remoteStatus: string | null;
  externalId: string | null;
  invoiceId: string | null;
  accountNumber: string | null;
  provider: string | null;
  paymentUrl: string | null;
  paymentLinks: PaymentLinks;
  createdDate: string;
  updatedDate: string | null;
  paidDate: string | null;
  fulfilledDate: string | null;
  isFulfilled: boolean;
}

export interface PaymentCheckoutAttempt {
  version: 1;
  userId: number;
  productType: PaymentProductType;
  productId: number;
  idempotencyKey: string;
  createdAt: string;
}

export interface PendingPaymentReference {
  version: 1;
  userId: number;
  orderId: number;
  productType: PaymentProductType;
  productId: number;
  openedExternally: boolean;
  updatedAt: string;
}
```

- [ ] **Step 4: Implement strict parser**

Use small internal helpers (`record`, `requiredPositiveInteger`, `nonNegativeAmount`, `nullableText`, status/product guards). Throw an `Error("Invalid payment order")` for structurally invalid order payloads rather than manufacturing defaults.

`parsePaymentOrders` accepts either a direct array or the project’s tolerated `{ data }` / `{ result }` wrappers, but every returned entry must pass `parsePaymentOrder`.

- [ ] **Step 5: Implement HTTPS URL selection**

```ts
export function getPaymentCheckoutUrl(order: PaymentOrder): string | null {
  for (const candidate of [order.paymentUrl, order.paymentLinks.payme]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:") return url.toString();
    } catch {
      // Continue to fallback.
    }
  }
  return null;
}
```

Tests must verify preference order, Payme fallback, `http:`, custom scheme, malformed URL, and both-missing cases.

- [ ] **Step 6: Implement state decisions**

```ts
export const isPaymentFulfilled = (order: PaymentOrder) =>
  order.status === "paid" && order.isFulfilled;

export const isPaymentTerminal = (order: PaymentOrder) =>
  isPaymentFulfilled(order) ||
  order.status === "cancelled" ||
  order.status === "failed" ||
  order.status === "expired";

export const shouldPersistPendingPayment = (order: PaymentOrder) =>
  !isPaymentTerminal(order);
```

Ensure `paid && !isFulfilled` remains recoverable.

- [ ] **Step 7: Run unit tests and typecheck**

```bash
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/modules/payments/types src/modules/payments/utils
git commit -m "feat: add payment domain contracts"
```

---

### Task 2: Payment HTTP Service and Centralized Query Keys

**Files:**
- Create: `src/modules/payments/services/paymentService.ts`
- Modify: `src/core/query/queryKeys.ts`
- Create: `scripts/check-payment-api.cjs`

**Interfaces:**
- Consumes: `PaymentOrder`, `parsePaymentOrder`, `parsePaymentOrders` from Task 1.
- Produces:
  - `createSubscriptionPayment(planId: number, idempotencyKey: string): Promise<PaymentOrder>`
  - `createSmsPackagePayment(packageId: number, idempotencyKey: string): Promise<PaymentOrder>`
  - `syncPayment(orderId: number): Promise<PaymentOrder>`
  - `getPayments(limit?: number, signal?: AbortSignal): Promise<PaymentOrder[]>`
  - `getPayment(orderId: number, signal?: AbortSignal): Promise<PaymentOrder>`
  - `cancelPayment(orderId: number): Promise<void>`
  - `queryKeys.paymentsRoot()`
  - `queryKeys.paymentsHistory(limit)`
  - `queryKeys.payment(orderId)`

- [ ] **Step 1: Write the failing service contract check**

`check-payment-api.cjs` transpiles `paymentService.ts` in a VM with a fake `apiClient`, captures method/url/config/body, and asserts:

```text
POST /payments/subscriptions/2
headers["Idempotency-Key"] === supplied uuid
body is absent/undefined

POST /payments/sms-packages/1
headers["Idempotency-Key"] === supplied uuid
body is absent/undefined

POST /payments/15/sync
GET  /payments with params.limit === 30
GET  /payments/15
POST /payments/15/cancel
cancel ignores response body
```

Also assert no service string starts with `/api/payments`.

- [ ] **Step 2: Run contract check and verify RED**

```bash
node scripts/check-payment-api.cjs
```

Expected: FAIL because service does not exist.

- [ ] **Step 3: Add payment query keys**

Add:

```ts
paymentsRoot: () => ["payments"] as const,
paymentsHistory: (limit: number) => ["payments", "history", limit] as const,
payment: (orderId: number) => ["payments", "detail", orderId] as const,
```

- [ ] **Step 4: Implement service with shared `apiClient`**

For checkout calls, use Axios so the second argument does not become an accidental body. Example:

```ts
const response = await apiClient.post(
  `/payments/subscriptions/${planId}`,
  undefined,
  { headers: { "Idempotency-Key": idempotencyKey } },
);
return parsePaymentOrder(response.data);
```

`cancelPayment` awaits the POST and returns `void`; do not parse its response.

- [ ] **Step 5: Run targeted checks**

```bash
node scripts/check-payment-api.cjs
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/payments/services/paymentService.ts src/core/query/queryKeys.ts scripts/check-payment-api.cjs
git commit -m "feat: add payment API service"
```

---

### Task 3: Persistent Idempotency Attempts and Pending-Order Recovery

**Files:**
- Create: `src/modules/payments/services/paymentStorage.ts`
- Test: `src/modules/payments/services/paymentStorage.test.ts`

**Interfaces:**
- Consumes: `PaymentCheckoutAttempt`, `PendingPaymentReference`, `PaymentProductType`.
- Produces:
  - `getOrCreateCheckoutAttempt(userId, productType, productId): Promise<PaymentCheckoutAttempt>`
  - `clearCheckoutAttempt(userId, productType, productId): Promise<void>`
  - `savePendingPayment(reference): Promise<void>`
  - `getPendingPayment(userId): Promise<PendingPaymentReference | null>`
  - `clearPendingPayment(userId, orderId?): Promise<void>`
  - `clearPaymentLifecycleForUser(userId): Promise<void>`

- [ ] **Step 1: Write failing storage policy tests**

Use a replaceable storage adapter boundary in the module so unit tests can inject an in-memory implementation without touching real AsyncStorage.

Required assertions:

```ts
const first = await getOrCreateCheckoutAttempt(9, "subscription", 2);
const retry = await getOrCreateCheckoutAttempt(9, "subscription", 2);
assert(first.idempotencyKey === retry.idempotencyKey);

await clearCheckoutAttempt(9, "subscription", 2);
const later = await getOrCreateCheckoutAttempt(9, "subscription", 2);
assert(first.idempotencyKey !== later.idempotencyKey);

const otherUser = await getOrCreateCheckoutAttempt(10, "subscription", 2);
assert(otherUser.idempotencyKey !== retry.idempotencyKey);
```

Also verify a different product does not overwrite another unresolved attempt and pending references are user-scoped.

- [ ] **Step 2: Run unit tests and verify RED**

```bash
npm test
```

- [ ] **Step 3: Implement storage keys and serialization**

Use deterministic keys that include user and product identity, for example:

```ts
const attemptKey = (userId: number, productType: PaymentProductType, productId: number) =>
  `payment:attempt:v1:${userId}:${productType}:${productId}`;

const pendingKey = (userId: number) => `payment:pending:v1:${userId}`;
```

Generate UUID only when no valid unresolved attempt exists:

```ts
const idempotencyKey = Crypto.randomUUID();
```

Malformed stored JSON is treated as absent and cleaned rather than returned.

- [ ] **Step 4: Implement user lifecycle cleanup**

`clearPaymentLifecycleForUser(userId)` removes the current user’s pending reference and all unresolved attempt records tracked by an index key owned by that user. Do not call AsyncStorage global `clear()`.

- [ ] **Step 5: Run unit tests/typecheck**

```bash
npm run typecheck
npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/payments/services/paymentStorage.ts src/modules/payments/services/paymentStorage.test.ts
git commit -m "feat: persist payment checkout lifecycle"
```

---

### Task 4: Payment Queries and Checkout Lifecycle Controller

**Files:**
- Create: `src/modules/payments/hooks/usePaymentQueries.ts`
- Create: `src/modules/payments/hooks/usePaymentCheckout.ts`
- Test: `scripts/check-payment-checkout.cjs`

**Interfaces:**
- Consumes: HTTP service from Task 2; storage from Task 3; `useAuth().refreshSubscription`; query keys; `Linking`; `AppState`.
- Produces:
  - `usePaymentHistory(limit = 30)`
  - `usePaymentOrder(orderId, enabled = true)`
  - `usePaymentCheckout()` controller with:

```ts
interface StartPaymentInput {
  productType: "subscription" | "sms_package";
  productId: number;
}

interface PaymentCheckoutController {
  createOrder(input: StartPaymentInput): Promise<PaymentOrder>;
  openExistingOrder(order: PaymentOrder): Promise<boolean>;
  syncOrder(orderId: number): Promise<PaymentOrder>;
  cancelOrder(orderId: number): Promise<PaymentOrder>;
  isCreating: boolean;
  syncingOrderId: number | null;
  cancellingOrderId: number | null;
}
```

- [ ] **Step 1: Write failing checkout controller contract**

Create `scripts/check-payment-checkout.cjs` using VM mocks around service/storage/Linking/AuthContext/query client.

Assert:

- two concurrent `createOrder` calls for same sheet interaction do not create two HTTP orders;
- timeout/error keeps checkout attempt so retry uses same UUID;
- valid order response clears unresolved attempt;
- valid order response persists pending reference if recoverable;
- fulfilled response clears pending reference and calls `refreshSubscription()`;
- `paymentUrl` is opened before Payme fallback;
- invalid/missing URL never creates another order automatically;
- one foreground return performs one sync for persisted active order;
- manual sync + foreground sync share one in-flight sync per order;
- `paid && !isFulfilled` does not call fulfilled-success refresh;
- cancel command is followed by canonical `getPayment(orderId)`.

- [ ] **Step 2: Run targeted check and verify RED**

```bash
node scripts/check-payment-checkout.cjs
```

- [ ] **Step 3: Implement query hooks**

History:

```ts
useQuery({
  queryKey: queryKeys.paymentsHistory(limit),
  queryFn: ({ signal }) => getPayments(limit, signal),
  enabled: Boolean(user),
  staleTime: 30_000,
});
```

Detail uses `queryKeys.payment(orderId)` and `getPayment`.

- [ ] **Step 4: Implement checkout creation with persisted idempotency**

Sequence:

```text
require authenticated user
getOrCreateCheckoutAttempt
POST correct product endpoint with stored key
parse valid PaymentOrder
clear unresolved attempt
persist/clear PendingPaymentReference from canonical state
write order into payment detail cache
invalidate payment history
if fulfilled -> refreshSubscription
return order
```

Guard duplicate submits with an in-flight promise/ref keyed by product identity.

- [ ] **Step 5: Implement external URL opening**

`openExistingOrder(order)`:

- return `false` for fulfilled orders;
- resolve URL through `getPaymentCheckoutUrl`;
- if no URL, return `false` without creating another order;
- call `Linking.openURL(url)` only for validated HTTPS URL;
- after successful open, update pending reference `openedExternally: true`;
- return `true`.

- [ ] **Step 6: Implement deduped sync and canonical state application**

Maintain one in-flight sync Promise per order ID. Every canonical order result runs through one `applyCanonicalOrder(order)` helper that:

- updates `queryKeys.payment(order.id)`;
- invalidates `paymentsHistory(30)`;
- persists recoverable pending reference or clears terminal one;
- only calls `refreshSubscription()` when `isPaymentFulfilled(order)`.

- [ ] **Step 7: Implement foreground recovery**

On authenticated user/app hook mount, load `getPendingPayment(user.id)`. Track `AppState.currentState`. When previous state is `background`/`inactive` and next state is `active`, perform one `syncOrder(reference.orderId)` only if `reference.openedExternally` is true.

Do not sync every history item and do not install an interval.

- [ ] **Step 8: Implement cancel**

```ts
await cancelPayment(orderId);
const canonical = await getPayment(orderId);
return applyCanonicalOrder(canonical);
```

If canonical GET fails, reject and leave pending metadata intact.

- [ ] **Step 9: Run targeted/full checks**

```bash
node scripts/check-payment-checkout.cjs
npm run typecheck
npm test
```

- [ ] **Step 10: Commit**

```bash
git add src/modules/payments/hooks scripts/check-payment-checkout.cjs
git commit -m "feat: add payment checkout lifecycle"
```

---

### Task 5: Typed Payment Bottom Sheets

**Files:**
- Create: `src/modules/payments/components/PaymentOrderContent.tsx`
- Create: `src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx`
- Create: `src/bottom-sheet/sheets/PaymentStatusSheet.tsx`
- Create: `src/bottom-sheet/sheets/PaymentDetailSheet.tsx`
- Modify: `src/bottom-sheet/types.ts`
- Modify: `src/bottom-sheet/registry.ts`
- Create: `scripts/check-payment-ui.cjs`

**Interfaces:**
- Consumes: checkout controller from Task 4 and subscription catalog item types.
- Produces typed sheet entries:

```ts
export interface PaymentCheckoutSheetProps {
  product:
    | { type: "subscription"; plan: SubscriptionPlan }
    | { type: "sms_package"; package: SmsPackage };
}

export interface PaymentStatusSheetProps {
  orderId: number;
}

export interface PaymentDetailSheetProps {
  orderId: number;
}
```

- [ ] **Step 1: Extend failing UI contract check**

`check-payment-ui.cjs` must initially fail unless:

```text
SheetType contains paymentCheckout/paymentStatus/paymentDetail
SheetPropsMap contains all three props
registry contains all three components
no payment screen uses React Native Modal for checkout/status/detail
```

- [ ] **Step 2: Add typed sheet definitions**

Extend `SheetType` and `SheetPropsMap` with imports from subscription types. Keep props domain-oriented: selected catalog item/order ID, not raw callbacks for HTTP.

- [ ] **Step 3: Implement `PaymentCheckoutSheet`**

Design requirements:

- product name and type icon;
- localized amount via existing currency formatter;
- plan benefits or SMS count;
- paid-product external checkout explanation;
- FREE primary copy uses activate/switch wording, but calls same checkout endpoint;
- double-submit guard;
- `setDismissLocked(true)` during checkout creation;
- error leaves sheet open and attempt reusable;
- once canonical order is created, close current sheet with `closeSheet(() => openSheet("paymentStatus", { orderId: order.id }))` so the existing provider transitions cleanly after dismissal;
- if order is not fulfilled and has a URL, open existing order before/while transitioning to status; opening failure still transitions to status so the order is recoverable.

- [ ] **Step 4: Implement shared `PaymentOrderContent`**

Render text-based status + icon, product, amount, provider/account metadata when present, and dates. Status must never be color-only.

- [ ] **Step 5: Implement `PaymentStatusSheet`**

Use canonical `usePaymentOrder(orderId)` data. Required actions:

```text
pending: continue payment (if URL), check status, cancel
paid + !fulfilled: refresh status
paid + fulfilled: close
cancelled/failed/expired: close
```

Cancel action uses the existing app confirmation pattern (`Alert.alert` if that is the established local pattern at implementation time) and calls `cancelOrder`; do not create a nested payment bottom sheet for confirmation.

- [ ] **Step 6: Implement `PaymentDetailSheet`**

Canonical detail query by `orderId`. Reuse `PaymentOrderContent`. Expose pending/manual sync/cancel actions consistently with status sheet, without duplicating the network state machine.

- [ ] **Step 7: Register sheets**

Use dynamic sizing and pan-down-to-close for normal states. Controller must lock dismissal while create/sync/cancel mutation is in critical progress when an ambiguous state could otherwise result.

- [ ] **Step 8: Run contract/type checks**

```bash
node scripts/check-payment-ui.cjs
npm run typecheck
```

- [ ] **Step 9: Commit**

```bash
git add src/modules/payments/components src/bottom-sheet scripts/check-payment-ui.cjs
git commit -m "feat: add payment bottom sheets"
```

---

### Task 6: Payment History Screen and Authenticated Navigation

**Files:**
- Create: `src/screens/PaymentHistoryScreen.tsx`
- Modify: `src/types/index.ts`
- Modify: `src/navigation/index.tsx`
- Modify: `scripts/check-payment-ui.cjs`

**Interfaces:**
- Consumes: `usePaymentHistory(30)`, `openSheet("paymentDetail", { orderId })`.
- Produces: authenticated `PaymentHistory: undefined` route.

- [ ] **Step 1: Add failing navigation/history assertions**

Extend `check-payment-ui.cjs` to assert:

- `RootStackParamList` includes `PaymentHistory: undefined`;
- `MainNavigator` registers `PaymentHistoryScreen`;
- history service/hook is called with fixed limit `30`;
- rows open `paymentDetail` with the order ID.

- [ ] **Step 2: Add route type and screen registration**

Modify:

```ts
export type RootStackParamList = {
  // existing
  PaymentHistory: undefined;
};
```

Import/register `PaymentHistoryScreen` in `MainNavigator` with `headerShown: false`, matching existing custom-header screens.

- [ ] **Step 3: Implement history UI**

Use `FlatList`/`RefreshControl` with:

- custom app-style back header;
- loading state;
- error + retry state;
- empty state;
- pull-to-refresh;
- up to 30 orders;
- row shows product name, localized amount, localized status, created/paid date;
- status text plus visual indicator;
- row accessibility role button;
- row press opens typed `paymentDetail` sheet.

No invented pagination controls.

- [ ] **Step 4: Run type/contract checks**

```bash
node scripts/check-payment-ui.cjs
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/PaymentHistoryScreen.tsx src/types/index.ts src/navigation/index.tsx scripts/check-payment-ui.cjs
git commit -m "feat: add payment history screen"
```

---

### Task 7: Subscription Catalog Checkout Integration

**Files:**
- Modify: `src/screens/SubscriptionScreen.tsx`
- Modify: `scripts/check-payment-ui.cjs`

**Interfaces:**
- Consumes: `useBottomSheet()`, `PaymentCheckoutSheetProps`, existing `SubscriptionPlan`/`SmsPackage` queries, `navigation.navigate("PaymentHistory")`.

- [ ] **Step 1: Add failing subscription integration assertions**

The contract check must assert:

- non-current plan action opens `paymentCheckout` with `{ type: "subscription", plan }`;
- SMS package card/action opens `paymentCheckout` with `{ type: "sms_package", package: item }`;
- payment purchase CTAs do not call `openAdminContact()`;
- screen has a `PaymentHistory` navigation action;
- current plan remains non-purchasable;
- FREE non-current plan still opens checkout.

- [ ] **Step 2: Replace plan admin activation action**

Remove purchase-flow dependency on `useAdminContact()` from plan cards. Keep support/admin contact UI only if it serves a separate support purpose, not as the purchase action.

Use:

```ts
openSheet("paymentCheckout", {
  product: { type: "subscription", plan },
});
```

- [ ] **Step 3: Make SMS package cards actionable**

Use a clear purchase button/press target rather than making ambiguous decorative content clickable. Open:

```ts
openSheet("paymentCheckout", {
  product: { type: "sms_package", package: item },
});
```

- [ ] **Step 4: Add payment history entry**

Place a compact, app-style action near the subscription header/current-plan area that navigates:

```ts
navigation.navigate("PaymentHistory");
```

- [ ] **Step 5: Preserve catalog behavior**

Do not change `GET /subscriptions/plans`, `GET /subscriptions/sms-packages`, plan feature calculations, current-plan detection, or catalog timestamp parsing as part of this task.

- [ ] **Step 6: Run contract/type checks**

```bash
node scripts/check-payment-ui.cjs
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/screens/SubscriptionScreen.tsx scripts/check-payment-ui.cjs
git commit -m "feat: connect subscription catalog to payments"
```

---

### Task 8: Logout/Delete Cleanup and Localization

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/modules/account/components/DeleteAccountSection.tsx`
- Modify: `src/i18n/translations/uz.ts`
- Modify: `src/i18n/translations/ru.ts`
- Modify: `scripts/check-payment-ui.cjs`

**Interfaces:**
- Consumes: `clearPaymentLifecycleForUser(userId)` from Task 3.

- [ ] **Step 1: Add failing cleanup/localization assertions**

Assert contract strings/imports showing:

- logout captures current authenticated user ID and clears that user’s payment lifecycle metadata before final user reset;
- successful account deletion clears payment lifecycle metadata only after backend delete succeeds and before local finalization;
- both Uzbek and Russian dictionaries contain every `payment.*` key used by payment UI.

- [ ] **Step 2: Integrate logout cleanup**

In `AuthContext.logout`, capture the current/session user ID before clearing the session:

```ts
const paymentUserId = session?.user?.id ?? user?.id;
if (typeof paymentUserId === "number") {
  await clearPaymentLifecycleForUser(paymentUserId);
}
```

Keep server logout best-effort semantics and existing auth/session cleanup order intact.

Because `logout` now reads `user`, include it in the callback dependency list; verify this does not create unauthorized-handler loops.

- [ ] **Step 3: Integrate account deletion cleanup**

In `DeleteAccountSection`, do not clear payment metadata before backend delete success. After successful `DELETE /account/my-account`, clear current user payment lifecycle together with PIN/cache/session cleanup. A failed DELETE must leave payment lifecycle metadata untouched.

- [ ] **Step 4: Add Uzbek payment copy**

Add a single `payment` namespace covering all strings actually used by checkout/status/detail/history, including:

```text
historyTitle
historyAction
buyPlan
activatePlan
buySmsPackage
checkoutTitle
externalPaymentHint
waiting
received
activating
success
failed
cancelled
expired
continuePayment
refreshStatus
cancelPayment
cancelConfirmTitle
cancelConfirmMessage
retry
noPaymentUrl
offlineError
openUrlError
historyEmpty
historyLoadError
detailTitle
provider
accountNumber
createdAt
paidAt
fulfilledAt
```

Use concise Uzbek UI copy consistent with existing app wording.

- [ ] **Step 5: Add equivalent Russian copy**

Mirror the same key structure exactly in `ru.ts` so the existing i18n parity check remains green.

- [ ] **Step 6: Run i18n/contract/type checks**

```bash
npm run check:i18n
node scripts/check-payment-ui.cjs
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/context/AuthContext.tsx src/modules/account/components/DeleteAccountSection.tsx src/i18n/translations/uz.ts src/i18n/translations/ru.ts scripts/check-payment-ui.cjs
git commit -m "feat: finalize payment lifecycle integration"
```

---

### Task 9: Full Verification and Release-Focused Manual Checkpoint

**Files:**
- Modify only if a failing verification reveals a payment-specific defect. Do not opportunistically refactor unrelated code.

**Interfaces:**
- Consumes all previous tasks.

- [ ] **Step 1: Run full automated verification**

```bash
npm run verify
```

Expected: all TypeScript, unit tests, and contract checks pass.

- [ ] **Step 2: Run release verification**

```bash
npm run verify:release
```

Expected: verify + Expo doctor + production audit pass under the project’s accepted thresholds.

- [ ] **Step 3: Manual checkout matrix on a real/dev-client build**

Verify with backend test environment:

```text
1. Paid subscription -> order created -> browser opens -> return -> sync.
2. FREE subscription -> same endpoint -> no frontend bypass.
3. SMS package -> order created -> browser opens -> return -> sync.
4. paymentUrl missing + payme present -> Payme fallback opens.
5. both URLs missing on pending -> order remains recoverable, no duplicate POST.
6. network timeout during checkout -> retry reuses same Idempotency-Key.
7. app killed/backgrounded after external open -> pending reference survives and foreground recovery syncs active order.
8. paid + isFulfilled=false -> activation-in-progress, manual refresh only.
9. paid + isFulfilled=true -> subscription/SMS quota refreshes and success appears.
10. pending cancel -> POST cancel -> canonical GET determines final UI.
11. failed/expired/cancelled -> terminal UI and new purchase receives new UUID.
12. history -> max 30 items -> detail sheet opens correct order.
13. logout/login as another user -> prior user pending attempt is not visible/reused.
14. failed account deletion -> payment metadata remains; successful deletion -> metadata cleared.
```

- [ ] **Step 4: Inspect network requests during manual test**

Confirm exact routes:

```text
/payments/subscriptions/{id}
/payments/sms-packages/{id}
/payments/{id}/sync
/payments?limit=30
/payments/{id}
/payments/{id}/cancel
```

Confirm no `/api/api/` path and no duplicate checkout order from one user action.

- [ ] **Step 5: Final focused commit if verification required fixes**

Only if fixes were necessary:

```bash
git add <payment-related-fixed-files>
git commit -m "fix: harden payment checkout verification"
```

- [ ] **Step 6: Record checkpoint**

Do not claim payment implementation complete until fresh local `npm run verify` passes after the final payment changes and the manual backend checkout path has at least one confirmed successful test order.
