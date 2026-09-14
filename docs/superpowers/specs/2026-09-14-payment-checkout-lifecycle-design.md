# Payment Checkout Lifecycle Design

## Goal

Add a production-safe payment subsystem for subscription plans and SMS packages that matches the existing Nasiya Daftari architecture, uses the existing typed bottom-sheet system for transactional UI, preserves backend idempotency guarantees, and refreshes subscription/SMS entitlement state only from canonical backend responses.

## Scope

This feature includes:

- subscription plan checkout;
- SMS package checkout;
- payment order parsing and API services;
- persistent idempotency-key lifecycle;
- external checkout URL opening;
- foreground return handling and explicit payment sync;
- payment status UI;
- payment history;
- payment detail UI;
- pending-order cancellation;
- subscription/SMS entitlement refresh after fulfillment;
- offline/error handling;
- localized Uzbek/Russian UI and accessibility contracts;
- regression/unit/contract coverage integrated into `npm run verify`.

This feature does not add card-entry UI, Payme SDK integration, an embedded WebView, automatic aggressive polling, invented pagination, or any new payment provider contract.

## Existing Project Constraints

The project already has the required runtime dependencies:

- Axios through the shared authenticated `apiClient`;
- TanStack Query;
- `expo-crypto` for secure UUID generation;
- AsyncStorage for non-secret checkout lifecycle metadata;
- React Native `Linking` for external HTTPS checkout URLs;
- React Native `AppState` for foreground return detection;
- NetInfo-backed mutation guards through the shared Axios layer;
- the global typed `@gorhom/bottom-sheet` registry.

No new dependency is required for the initial payment implementation.

`API_BASE_URL` already ends with `/api`. Therefore frontend service paths MUST use `/payments/...` and `/subscriptions/...`, not `/api/payments/...` or `/api/subscriptions/...`.

## Backend Contract

### Subscription plans

Frontend continues to use the existing endpoint:

```http
GET /subscriptions/plans
Authorization: Bearer {token}
```

The plan `id` returned by this endpoint is the checkout product ID.

### Create subscription checkout

```http
POST /payments/subscriptions/{planId}
Authorization: Bearer {token}
Idempotency-Key: {uuid-v4}
```

No request body is sent.

FREE plans use the same endpoint. Frontend MUST NOT invent a separate free-plan activation endpoint or bypass the payment service because `price === 0`.

### SMS packages

Frontend continues to use the existing endpoint:

```http
GET /subscriptions/sms-packages
Authorization: Bearer {token}
```

The package `id` returned by this endpoint is the checkout product ID.

### Create SMS package checkout

```http
POST /payments/sms-packages/{packageId}
Authorization: Bearer {token}
Idempotency-Key: {uuid-v4}
```

No request body is sent.

### Sync payment

```http
POST /payments/{orderId}/sync
Authorization: Bearer {token}
```

The canonical response is a `PaymentOrder`.

### Payment history

```http
GET /payments?limit=30
Authorization: Bearer {token}
```

The backend currently exposes only `limit`. Frontend MUST NOT invent `offset`, `page`, `cursor`, or infinite pagination parameters.

### Payment detail

```http
GET /payments/{orderId}
Authorization: Bearer {token}
```

### Cancel pending payment

```http
POST /payments/{orderId}/cancel
Authorization: Bearer {token}
```

Current temporary frontend contract: any 2xx response means the cancel command was accepted. Frontend MUST NOT depend on a response body. After a successful cancel command, frontend fetches `GET /payments/{orderId}` to obtain canonical status. If that canonical fetch fails, frontend does not invent `cancelled`; it shows a recoverable refresh error.

## Payment Domain Model

```ts
export type PaymentProductType = "subscription" | "sms_package";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "cancelled"
  | "failed"
  | "expired";

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
```

The parser is fail-closed for structural identifiers and enumerated status values. Invalid order IDs, product IDs, product types, statuses, amounts, or URL shapes must not silently become usable payment orders.

Nullable backend strings remain nullable. Frontend does not fabricate provider, invoice, external ID, paid date, fulfillment date, or checkout URLs.

## Checkout URL Selection

Checkout URL selection is deterministic:

1. use non-empty HTTPS `paymentUrl`;
2. otherwise use non-empty HTTPS `paymentLinks.payme`;
3. otherwise there is no external checkout URL.

Only HTTPS checkout URLs are opened.

A missing URL is not automatically an error because FREE or already-completed orders may be fulfilled without an external checkout page.

If the order is `paid && isFulfilled`, frontend immediately treats it as fulfilled and does not open a browser.

If the order requires payment but no valid checkout URL exists, frontend shows the canonical order status and a recoverable error instead of guessing a provider URL.

## Idempotency Lifecycle

`Idempotency-Key` is generated with `Crypto.randomUUID()`.

The key is generated once per new purchase attempt, before the POST is sent. It MUST NOT be generated inside a retrying network callback.

A persisted checkout attempt is scoped by authenticated user, product type, and product ID:

```ts
export interface PaymentCheckoutAttempt {
  version: 1;
  userId: number;
  productType: PaymentProductType;
  productId: number;
  idempotencyKey: string;
  createdAt: string;
}
```

Storage behavior:

- first checkout for a product creates and persists a fresh UUID;
- a network/timeout failure before a `PaymentOrder` is received keeps that attempt;
- retrying the same product reuses the same UUID;
- receiving a valid `PaymentOrder` resolves and clears that unresolved request attempt;
- a later intentional purchase of the same product receives a new UUID;
- a different product has its own attempt identity and MUST NOT overwrite an unresolved attempt for another product;
- user logout/account deletion must not allow another user to inherit checkout-attempt metadata.

The payment POST is never placed into an offline mutation queue.

## Pending Order Persistence

After a valid checkout response is received, the app persists lightweight pending-order metadata while the order is non-terminal or paid-but-not-fulfilled:

```ts
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

This reference allows the app to recover if it is backgrounded or killed while an external payment page is open.

The reference is cleared after canonical terminal handling when:

- `paid && isFulfilled === true`;
- `cancelled`;
- `failed`;
- `expired`.

`paid && isFulfilled === false` remains recoverable until fulfillment is confirmed.

## Payment State Machine

### `pending`

UI shows “To‘lov kutilmoqda”. Available actions depend on canonical data:

- continue payment when a valid checkout URL exists;
- “Holatni tekshirish” -> `POST /payments/{id}/sync`;
- “Bekor qilish” -> confirmation -> cancel endpoint -> canonical GET refresh.

### `paid && isFulfilled === false`

UI shows “To‘lov qabul qilindi” and “Xizmat faollashtirilmoqda”.

There is no aggressive automatic polling. The user can press “Holatni yangilash”, which calls sync again.

### `paid && isFulfilled === true`

This is the only fully successful entitlement state.

Frontend:

1. clears pending payment metadata;
2. refreshes current subscription;
3. invalidates payment history/detail queries;
4. updates the authenticated user’s subscription representation through the existing canonical subscription refresh path;
5. shows success UI.

SMS package fulfillment uses the same subscription refresh because purchased SMS quota is represented by current subscription state.

### `cancelled`

Terminal cancelled state. No success entitlement refresh is claimed.

### `failed`

Terminal failed state. User may start a new purchase, which receives a new idempotency key.

### `expired`

Terminal expired state. User may start a new purchase, which receives a new idempotency key.

## AppState Return Behavior

The checkout controller records when an external checkout URL was successfully opened.

When the app transitions from `background`/`inactive` to `active`, the controller performs one sync for the active persisted payment order.

It does not poll continuously and does not sync unrelated historical orders.

The controller deduplicates in-flight sync calls so an AppState transition and a manual refresh cannot create concurrent sync requests for the same order.

If sync fails, the order remains recoverable and the status sheet shows a retry action.

## API and Query Layer

Create a focused payment module under:

```text
src/modules/payments/
```

Responsibilities are split into:

```text
types/       PaymentOrder and lifecycle contracts
services/    HTTP calls and persistence adapters
hooks/       checkout/status/history orchestration
utils/       response parsing, URL selection, status helpers
components/  reusable payment presentation pieces when needed
```

TanStack Query keys are added under the existing centralized query key factory:

```ts
paymentsRoot()
paymentsHistory(limit)
payment(orderId)
```

Checkout/sync/cancel are mutations with no automatic mutation retry. Retry is explicit so idempotency behavior remains understandable.

Successful fulfillment invalidates only payment/subscription data required by the lifecycle. It must not clear client/transaction/report domain caches merely because payment status changed.

## UI Architecture

### SubscriptionScreen remains the catalog screen

The existing subscription screen continues to render:

- current subscription;
- available subscription plans;
- available SMS packages.

Existing “admin activation/contact” purchase actions are replaced by real checkout actions where appropriate.

Selecting a non-current plan opens `paymentCheckout`.

Selecting an SMS package opens `paymentCheckout`.

FREE plans use the same checkout sheet and backend endpoint. Copy is adapted from “pay” to “switch/activate” when amount is zero, but the backend flow is unchanged.

The screen exposes a clear “To‘lovlar tarixi” action that navigates to `PaymentHistoryScreen`.

### `paymentCheckout` bottom sheet

Typed sheet props describe the selected product without leaking HTTP implementation details.

The sheet shows:

- product name;
- product type;
- formatted amount;
- relevant plan/package benefits;
- concise external-payment explanation for paid products;
- primary confirm action;
- cancel action.

The primary action is protected against double submit.

During order creation the sheet is dismissal-locked to prevent an ambiguous half-finished request.

After a valid order is created:

- immediately fulfilled -> transition to success status;
- otherwise persist order reference;
- if valid checkout URL exists -> open it;
- transition to `paymentStatus` for canonical status/actions.

### `paymentStatus` bottom sheet

This is the post-checkout lifecycle sheet. It is driven by canonical `orderId`, not by a stale copied status object.

It renders the current backend state and context-sensitive actions:

- pending -> continue, sync, cancel;
- paid/not fulfilled -> manual refresh;
- fulfilled -> success and close;
- failed/expired/cancelled -> terminal explanation and close/new-purchase path.

### PaymentHistoryScreen

A dedicated full screen is used because history can contain up to 30 rows and should not be constrained by a transactional sheet.

The screen uses:

```http
GET /payments?limit=30
```

It provides loading, empty, error, pull-to-refresh, and list states.

Each row contains at minimum:

- product name;
- localized amount;
- localized status;
- relevant created/paid date;
- status indicator.

Selecting a row opens `paymentDetail`.

### `paymentDetail` bottom sheet

The detail sheet loads the canonical order by `orderId` and displays:

- product name/code/type;
- amount and currency;
- status;
- provider when present;
- account number when present;
- invoice/external identifiers only when present and useful;
- created/paid/fulfilled timestamps when present;
- pending-order actions when applicable.

`paymentStatus` and `paymentDetail` may reuse shared presentation components internally, but remain separate typed sheet entries because their entry contexts and primary UX intent differ.

## Bottom-Sheet Registry Changes

The existing typed sheet map is extended with:

```ts
| "paymentCheckout"
| "paymentStatus"
| "paymentDetail"
```

All payment sheets use the shared bottom-sheet provider/registry. No ad-hoc `Modal` is introduced for payment checkout/status/detail.

`paymentCheckout` and status/detail sheets use dynamic sizing unless content proves to require a bounded snap point during implementation testing.

Destructive cancel confirmation continues to use the project’s existing confirmation-dialog pattern rather than nesting an additional bottom sheet.

## Navigation

Add `PaymentHistory` to `RootStackParamList` and the existing authenticated stack.

Subscription catalog remains the entry point for purchases. Payment history is also accessible from the subscription area; no new main tab is created.

## Error and Offline Handling

All payment mutations go through the existing shared mutation guard.

Offline behavior:

- catalog/history GET queries may use normal React Query reconnect behavior;
- create checkout, sync, and cancel are blocked offline;
- no payment mutation is queued for later replay;
- unresolved idempotency metadata is preserved after a network/timeout error.

Checkout creation error:

- keep the bottom sheet open;
- preserve the same checkout attempt key;
- show localized recoverable error;
- retry uses the same key.

External URL error:

- keep the canonical order;
- do not create another checkout order automatically;
- show an action to retry opening the existing order URL or sync status.

Sync error:

- do not change the displayed canonical status to success/failure;
- preserve pending reference;
- show retry.

Cancel canonical-refresh error:

- the cancel command may have succeeded;
- do not invent a local cancelled status;
- keep order recoverable and offer refresh.

## Security and Data Handling

The app never collects card details or payment credentials.

Payment provider pages are external HTTPS pages opened from backend-provided URLs.

Idempotency keys and order IDs are operational identifiers, not authentication credentials. Authentication continues to use the existing secure session layer.

Frontend never logs bearer tokens, payment provider secrets, or full backend payment payloads in production.

Checkout URL validation rejects non-HTTPS schemes before calling `Linking.openURL`.

## Subscription Catalog Compatibility

Existing plan/package parsers currently tolerate missing `createdDate`/`updatedDate`. Backend checkout examples do not require those fields for purchase logic.

Payment implementation must not make catalog checkout depend on catalog timestamp fields.

Plan/package IDs, names, codes, prices, limits, and capabilities continue to come from the existing subscription catalog queries.

## Localization and Accessibility

Payment UI is added to both existing Uzbek and Russian localization dictionaries.

Required localized concepts include:

- buy/activate plan;
- buy SMS package;
- payment history;
- waiting for payment;
- payment received;
- activating service;
- payment successful;
- failed/cancelled/expired;
- continue payment;
- refresh status;
- cancel payment;
- retry;
- no payment URL;
- offline/payment network errors.

Buttons expose accessibility roles/labels and loading/disabled state. Status is represented by text in addition to icon/color.

## Testing Strategy

### Pure unit tests

Cover:

- strict `PaymentOrder` parsing;
- status union rejection;
- HTTPS checkout URL selection and fallback;
- fulfilled-state decision logic;
- checkout attempt key reuse/rotation policy where extractable as pure logic.

### Service contract checks

Verify exact methods/routes/headers:

- `POST /payments/subscriptions/{planId}` with `Idempotency-Key`, no body;
- `POST /payments/sms-packages/{packageId}` with `Idempotency-Key`, no body;
- `POST /payments/{id}/sync`;
- `GET /payments?limit=30`;
- `GET /payments/{id}`;
- `POST /payments/{id}/cancel` without depending on body.

### Persistence tests

Verify:

- retrying unresolved same product reuses UUID;
- valid order response resolves request attempt;
- later purchase gets a fresh UUID;
- attempts are user-scoped;
- pending order survives process-style rehydration;
- terminal order clears pending reference.

### Checkout controller tests

Verify:

- double tap creates one order;
- fulfilled response skips browser;
- `paymentUrl` preferred over Payme fallback;
- invalid/missing URL does not create a duplicate order;
- foreground return triggers one sync;
- manual sync and AppState sync deduplicate;
- `paid && !isFulfilled` does not claim success;
- fulfilled order refreshes subscription and payment queries.

### UI/contract checks

Verify:

- typed sheet registry entries exist;
- SubscriptionScreen opens checkout sheet instead of admin-contact purchase flow;
- SMS package is actionable;
- payment history route is registered;
- payment status/detail expose correct actions per status;
- cancel requires confirmation;
- localization keys exist in both languages.

### Full checkpoint

Run:

```bash
npm run verify
```

No payment implementation task is considered complete until this is green after the final integration batch.

## Backend Contract Changes Later

If backend later defines a structured response for cancel, frontend may extend the cancel service/parser and use that response as an optimization. Until then, the accepted contract remains: 2xx command success followed by canonical GET.

If backend later adds pagination, provider-specific links, webhooks/deep links, or automatic fulfillment timing guarantees, those are separate contract amendments. They are not guessed in this implementation.
