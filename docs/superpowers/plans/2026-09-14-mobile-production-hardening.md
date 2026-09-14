# Mobile Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing Expo/React Native app for production by making organization-scoped queries precise, offline behavior read-only and predictable, cache invalidation consistent, local security actions re-authenticated, API parsing defensive, large screens more maintainable, and verification reproducible.

**Architecture:** Keep TanStack Query as the only owner of server state, gate organization-owned data behind `currentOrganization`, connect native connectivity to TanStack `onlineManager`, and route all server mutations through one offline guard. Preserve the public `useAuth()` and navigation contracts while extracting focused helpers; decompose only the large screens touched by the hardening work.

**Tech Stack:** Expo SDK 55, React Native 0.83, React 19, TypeScript 5.9, TanStack Query 5, Axios, Expo SecureStore, Expo Local Authentication, React Navigation 7, `@react-native-community/netinfo`, `tsx` for existing standalone TypeScript regression tests.

**Spec:** `docs/superpowers/specs/2026-09-14-mobile-production-hardening-design.md`

## Global Constraints

- Work only on `feat/mobile-production-hardening`; never write directly to `main`.
- Preserve current mobile navigation, brand, bottom tabs, bottom-sheet UX, subscription semantics, SMS permission constants, and backend contracts.
- Offline mode is read-only: show in-memory React Query cache, block server writes, and never replay blocked mutations automatically.
- Do not persist business/query cache to disk.
- Do not invent subscription purchase endpoints or other backend behavior.
- Use finite backend `currentBalance` first; transaction history is compatibility fallback only.
- Sensitive local security changes require fresh re-authentication, except PIN change where the existing current-PIN verification is the re-auth step.
- Performance changes must remove known duplicate/incorrect work; do not add blanket memoization or list knobs without evidence.
- Every behavior change follows TDD: failing regression test first, minimal implementation second, then full relevant verification.

---

## Planned File Ownership

New focused units:

- `src/core/network/networkState.ts` — framework-independent connectivity state and mutation guard.
- `src/core/network/NetworkProvider.tsx` — NetInfo subscription, React context, and `onlineManager` bridge.
- `src/core/network/OfflineBanner.tsx` — one global offline indicator.
- `src/core/query/organizationScope.ts` — deterministic organization-scoped query enable/scope rules.
- `src/core/query/clientInvalidation.ts` — canonical client/transaction/report/SMS invalidation helpers.
- `src/modules/clients/utils/balanceResolution.ts` — balance source hierarchy and missing-balance ID helpers.
- `src/modules/pin-auth/services/reauthentication.ts` — reusable local sensitive-action verification result contract.
- `src/modules/clients/utils/apiParsing.ts` — finite numeric/id parsing helpers used by client/transaction mappers.
- `src/modules/auth/utils/accountRouteMatcher.ts` — exact account endpoint refresh-bypass policy.
- `scripts/run-unit-tests.ts` — cross-platform runner for existing standalone `*.test.ts` files.
- `scripts/run-contract-checks.cjs` — cross-platform sequential runner for `scripts/check-*.cjs`.

Existing files remain the public integration points unless a task explicitly extracts a component.

---

### Task 1: Establish a reproducible verification baseline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/run-unit-tests.ts`
- Create: `scripts/run-contract-checks.cjs`
- Test: all existing `src/**/*.test.ts`

**Interfaces:**
- Produces: `npm test`, `npm run check`, `npm run verify`, `npm run verify:release`.
- `npm run verify` must be network-independent: typecheck + unit tests + static contract checks.
- `npm run verify:release` extends it with Expo Doctor and production audit.

- [ ] **Step 1: Add the test runner dependency and scripts**

Add `tsx` as a dev dependency and set scripts to:

```json
{
  "test": "tsx scripts/run-unit-tests.ts",
  "check": "node scripts/run-contract-checks.cjs",
  "verify": "npm run typecheck && npm test && npm run check",
  "verify:release": "npm run verify && npm run doctor && npm run audit:production"
}
```

Keep all existing named `check:*` scripts intact.

- [ ] **Step 2: Create the unit-test runner**

Create `scripts/run-unit-tests.ts`:

```ts
import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function collect(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full)));
    else if (entry.isFile() && entry.name.endsWith(".test.ts")) files.push(full);
  }
  return files;
}

const files = (await collect(path.resolve("src"))).sort();
for (const file of files) {
  console.log(`\n▶ ${path.relative(process.cwd(), file)}`);
  await import(pathToFileURL(file).href);
}
console.log(`\n✓ ${files.length} test files passed`);
```

- [ ] **Step 3: Create the contract-check runner**

Create `scripts/run-contract-checks.cjs` so it lists `scripts/check-*.cjs`, excludes itself, and executes each with the current Node executable:

```js
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const dir = __dirname;
const files = fs.readdirSync(dir)
  .filter((name) => name.startsWith("check-") && name.endsWith(".cjs"))
  .sort();

for (const name of files) {
  console.log(`\n▶ scripts/${name}`);
  const result = spawnSync(process.execPath, [path.join(dir, name)], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`\n✓ ${files.length} contract checks passed`);
```

- [ ] **Step 4: Run the baseline**

Run:

```bash
npm ci
npm run verify
```

Expected: either fully green or a written list of pre-existing failures. Do not change production behavior merely to silence an invalid check; reconcile the check with the approved spec.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/run-unit-tests.ts scripts/run-contract-checks.cjs
git commit -m "test: add reproducible mobile verification commands"
```

---

### Task 2: Add native connectivity and a canonical offline mutation guard

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/core/network/networkState.ts`
- Create: `src/core/network/networkState.test.ts`
- Create: `src/core/network/NetworkProvider.tsx`
- Create: `src/core/network/OfflineBanner.tsx`
- Modify: `App.tsx`
- Modify: `src/i18n/translations/uz.ts`
- Modify: `src/i18n/translations/ru.ts`

**Interfaces:**
- Produces: `NetworkStatus = "unknown" | "online" | "offline"`.
- Produces: `assertOnlineForMutation(status: NetworkStatus): void`.
- Produces: `useNetworkStatus(): { status: NetworkStatus; isOnline: boolean; isOffline: boolean }`.
- `NetworkProvider` calls TanStack `onlineManager.setOnline(...)` from one NetInfo subscription.

- [ ] **Step 1: Write failing pure tests for network state**

Create `networkState.test.ts` with cases:

```ts
import { assertOnlineForMutation, normalizeNetworkStatus } from "./networkState.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(normalizeNetworkStatus(true, true) === "online", "reachable connection is online");
assert(normalizeNetworkStatus(false, false) === "offline", "disconnected state is offline");
assert(normalizeNetworkStatus(null, null) === "unknown", "unresolved state remains unknown");

let blocked = false;
try { assertOnlineForMutation("offline"); } catch { blocked = true; }
assert(blocked, "offline server mutation must be blocked");
assertOnlineForMutation("online");
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test`
Expected: failure because `networkState.ts` does not exist.

- [ ] **Step 3: Implement the pure contract**

`networkState.ts` exports:

```ts
export type NetworkStatus = "unknown" | "online" | "offline";
export const OFFLINE_MUTATION_ERROR_CODE = "OFFLINE_MUTATION";

export function normalizeNetworkStatus(
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
): NetworkStatus {
  if (isConnected === false || isInternetReachable === false) return "offline";
  if (isConnected === true && isInternetReachable !== false) return "online";
  return "unknown";
}

export function assertOnlineForMutation(status: NetworkStatus): void {
  if (status === "offline") {
    const error = new Error("Internet aloqasi kerak");
    error.name = OFFLINE_MUTATION_ERROR_CODE;
    throw error;
  }
}
```

- [ ] **Step 4: Integrate NetInfo once at app root**

Install `@react-native-community/netinfo` with the Expo-compatible version, create `NetworkProvider`, and wrap the app inside `QueryClientProvider` but outside feature providers. The provider must call `onlineManager.setOnline(status !== "offline")`; `unknown` must not force the app offline during startup.

- [ ] **Step 5: Add one global `OfflineBanner`**

Render it under the root provider stack so it is visible across authenticated screens without duplicating banners. Add localized `common.offline` and `common.internetRequired` keys to UZ/RU translations.

- [ ] **Step 6: Verify and commit**

Run: `npm run verify`

```bash
git add package.json package-lock.json App.tsx src/core/network src/i18n/translations
git commit -m "feat: add native offline awareness"
```

---

### Task 3: Gate organization-owned queries behind the active organization

**Files:**
- Create: `src/core/query/organizationScope.ts`
- Create: `src/core/query/organizationScope.test.ts`
- Modify: `src/context/AppContext.tsx`
- Modify: `src/modules/clients/hooks/useClientDetail.ts`
- Modify: `src/modules/clients/hooks/useClientSearch.ts`
- Modify: `src/modules/reports/hooks/useReports.ts`
- Modify: `src/modules/client-sms/hooks/useClientSms.ts`
- Modify: `src/modules/organization/hooks/useBlacklistSettings.ts`

**Interfaces:**
- Produces: `getOrganizationQueryScope(userId, organizationId)` returning `{ scope, enabled }`.
- Organization business queries are enabled only for a positive/current organization id.

- [ ] **Step 1: Write failing scope tests**

```ts
import { getOrganizationQueryScope } from "./organizationScope.ts";

function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: ${actual} !== ${expected}`);
}

let state = getOrganizationQueryScope(7, 42);
equal(state.scope, 42, "organization id is the scope");
equal(state.enabled, true, "active organization enables query");

state = getOrganizationQueryScope(7, null);
equal(state.enabled, false, "user alone cannot enable organization query");
```

- [ ] **Step 2: Run RED, then implement the helper**

Use `scope: organizationId ?? "no-organization"`; never fall back to user id for organization-owned business data.

- [ ] **Step 3: Apply the helper to all listed hooks/contexts**

`AppContext` must obtain `currentOrganization` from `useAuth()` and stop client/transaction fetches while organization selection/setup is active. Reports, client SMS, blacklist, client detail, and search must follow the same rule.

- [ ] **Step 4: Verify no account-level subscription hook was accidentally gated**

Run: `npm run verify`
Expected: subscription current/catalog behavior unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/core/query/organizationScope* src/context/AppContext.tsx src/modules
git commit -m "fix: gate organization data by active organization"
```

---

### Task 4: Centralize client-domain cache invalidation

**Files:**
- Create: `src/core/query/clientInvalidation.ts`
- Create: `src/core/query/clientInvalidation.test.ts`
- Modify: `src/modules/clients/hooks/useClientQueries.ts`
- Modify: `src/modules/clients/hooks/useClientDetail.ts`
- Modify: `src/context/AppContext.tsx`
- Modify: `src/bottom-sheet/sheets/TransactionSheet.tsx`
- Modify: `src/modules/client-sms/hooks/useClientSms.ts` only if balance-dependent SMS cache invalidation is currently duplicated there.

**Interfaces:**
- Produces pure `getClientInvalidationKeys(scope, event, clientId?)`.
- Produces `invalidateClientDomain(queryClient, scope, event, clientId?)`.
- Events: `"created" | "updated" | "deleted" | "transaction"`.

- [ ] **Step 1: Write failing invalidation-policy tests**

Test that:

```ts
const keys = getClientInvalidationKeys(42, "transaction", 8);
```

contains clients list, client detail 8, transaction history 8, reports scope, and balance-dependent SMS recipient root; and that `deleted` removes/invalidates the same domain without touching unrelated subscription catalog keys.

- [ ] **Step 2: Implement the policy as data first**

The pure function returns query-key arrays. `invalidateClientDomain` performs `invalidateQueries`; callers may still use `setQueryData/removeQueries` first for immediate UI consistency.

- [ ] **Step 3: Wire create/update/delete**

Keep current immediate cache patches, then call the canonical invalidator so Reports cannot remain stale after create/delete/update.

- [ ] **Step 4: Wire debt/payment mutation**

After successful transaction creation, invalidate affected history/detail/list/reports and balance-dependent SMS recipients. Never invalidate all organization/user caches globally.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`

```bash
git add src/core/query/clientInvalidation* src/modules/clients src/context/AppContext.tsx src/bottom-sheet/sheets/TransactionSheet.tsx
git commit -m "fix: keep client domain caches consistent"
```

---

### Task 5: Make balance fallback correct for main lists and search results

**Files:**
- Create: `src/modules/clients/utils/balanceResolution.ts`
- Create: `src/modules/clients/utils/balanceResolution.test.ts`
- Modify: `src/modules/transactions/hooks/useTransactionQueries.ts`
- Modify: `src/modules/clients/hooks/useClientSearch.ts`
- Modify: `src/screens/CustomersScreen.tsx`
- Modify: `src/context/AppContext.tsx`

**Interfaces:**
- Produces: `hasFiniteCurrentBalance(customer): boolean`.
- Produces: `getMissingBalanceClientIds(customers): number[]`.
- Produces: `resolveCustomerBalance(customer, historyBalance): number`.
- `useTransactionQueries(scope, ids, enabled)` remains the bounded history loader and may be reused for search-specific missing ids.

- [ ] **Step 1: Write failing hierarchy tests**

Cover `0`, positive, negative, `undefined`, `NaN`, and `Infinity`. Finite `0` is present, malformed numeric values are missing, and fallback is used only when current balance is unavailable.

- [ ] **Step 2: Implement helpers and replace ad-hoc `== null` checks**

The app must not treat `NaN`/`Infinity` as a valid backend balance.

- [ ] **Step 3: Give search results their own bounded fallback histories**

When a debounced search is active, calculate missing IDs from `searchResult.customers` and run the same bounded transaction-history query for those IDs only. Merge those fallback transactions into the balance map used by the displayed search results; do not fetch all customer histories.

- [ ] **Step 4: Verify debtor filter and displayed balances**

Run: `npm run verify`
Expected: debtor-only filter uses `resolveCustomerBalance` consistently for normal and search lists.

- [ ] **Step 5: Commit**

```bash
git add src/modules/clients/utils/balanceResolution* src/modules/transactions/hooks/useTransactionQueries.ts src/modules/clients/hooks/useClientSearch.ts src/screens/CustomersScreen.tsx src/context/AppContext.tsx
git commit -m "fix: resolve client balances consistently"
```

---

### Task 6: Add reusable security re-authentication

**Files:**
- Create: `src/modules/pin-auth/services/reauthentication.ts`
- Create: `src/modules/pin-auth/services/reauthentication.test.ts`
- Modify: `src/modules/pin-auth/context/AppLockContext.tsx`
- Modify: `src/screens/AccountSecurityScreen.tsx`
- Modify: `src/modules/pin-auth/screens/PinChangeScreen.tsx` only to align messaging/contracts; do not add a second current-PIN prompt.
- Modify: `src/i18n/translations/uz.ts`
- Modify: `src/i18n/translations/ru.ts`

**Interfaces:**
- Produces:

```ts
export type ReauthResult =
  | { success: true; method: "biometric" | "pin" }
  | { success: false; reason: "cancelled" | "invalid" | "unavailable" };
```

- `AppLockContext` exposes a single sensitive-action helper that may accept a PIN supplied by a UI prompt when biometric is unavailable/cancelled.

- [ ] **Step 1: Write failing decision tests**

Pure tests cover:
- enabled/available biometric success -> authorized by biometric;
- biometric cancel + supplied valid PIN -> authorized by PIN;
- no biometric + no PIN input -> unavailable;
- invalid PIN -> invalid.

- [ ] **Step 2: Implement decision logic without UI dependencies**

Keep biometric/device prompt integration in `AppLockContext`; keep result normalization in `reauthentication.ts`.

- [ ] **Step 3: Require re-auth before PIN removal**

Flow must be danger confirmation -> biometric/current-PIN verification -> `removePin()` -> success toast. Cancellation closes the verification UI without an error toast.

- [ ] **Step 4: Require re-auth before biometric enable and disable**

Enabling still uses the platform biometric prompt as required by device identity. Disabling must also prove current identity before changing the stored preference.

- [ ] **Step 5: Preserve current-PIN verification as PIN-change re-auth**

Do not prompt twice. `PinChangeScreen` current PIN validation is the fresh sensitive-action verification.

- [ ] **Step 6: Commit after verification**

Run: `npm run verify`

```bash
git add src/modules/pin-auth src/screens/AccountSecurityScreen.tsx src/i18n/translations
git commit -m "feat: require reauth for local security changes"
```

---

### Task 7: Fix PIN-gate profile metadata freshness

**Files:**
- Create: `src/modules/pin-auth/utils/profileMetadata.ts`
- Create: `src/modules/pin-auth/utils/profileMetadata.test.ts`
- Modify: `src/modules/pin-auth/context/AppLockContext.tsx`

**Interfaces:**
- Produces `getPinDisplayMetadata(user)` returning stable `{ displayName, maskedContact }`.

- [ ] **Step 1: Write tests for changed name/phone/email metadata**

Test masking and fallback email behavior as pure values.

- [ ] **Step 2: Use the helper in AppLockContext**

The metadata sync effect must depend on `user?.id`, `user?.fullName`, `user?.phoneNumber`, and `user?.email` so same-account profile updates refresh SecureStore metadata.

- [ ] **Step 3: Verify and commit**

Run: `npm run verify`

```bash
git add src/modules/pin-auth/utils/profileMetadata* src/modules/pin-auth/context/AppLockContext.tsx
git commit -m "fix: refresh pin profile metadata"
```

---

### Task 8: Harden client/transaction parsing and account-route matching

**Files:**
- Create: `src/modules/clients/utils/apiParsing.ts`
- Create: `src/modules/clients/utils/apiParsing.test.ts`
- Create: `src/modules/auth/utils/accountRouteMatcher.ts`
- Create: `src/modules/auth/utils/accountRouteMatcher.test.ts`
- Modify: `src/services/clientsApi.ts`
- Modify: `src/services/axiosService.ts`

**Interfaces:**
- Produces `readRequiredPositiveId`, `readFiniteNumber`, `readOptionalFiniteNumber`.
- Produces `isRefreshBypassAccountRoute(url?: string): boolean` using normalized pathname matching.

- [ ] **Step 1: Write parser RED tests**

`readFiniteNumber("12.5")` returns `12.5`; `NaN`, `Infinity`, `"abc"`, `undefined` throw. Optional finite parser returns `undefined` only for nullish input, not malformed input.

- [ ] **Step 2: Write route-matcher RED tests**

Exact account auth endpoints bypass refresh, while `/clients/account/login-history` and similarly containing strings do not.

- [ ] **Step 3: Implement helpers and migrate client/transaction mapping**

A malformed transaction amount must throw before entering balance calculations. Keep presentation sign behavior unchanged.

- [ ] **Step 4: Replace Axios string-fragment matcher**

Normalize absolute or relative URL pathname and compare against an explicit set of login/register/google/refresh/logout routes.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`

```bash
git add src/modules/clients/utils/apiParsing* src/modules/auth/utils/accountRouteMatcher* src/services/clientsApi.ts src/services/axiosService.ts
git commit -m "fix: harden API parsing and auth route matching"
```

---

### Task 9: Integrate offline write blocking across server mutations

**Files:**
- Modify: `src/modules/clients/hooks/useClientQueries.ts`
- Modify: `src/modules/clients/hooks/useClientDetail.ts`
- Modify: `src/bottom-sheet/sheets/TransactionSheet.tsx`
- Modify: `src/modules/client-sms/hooks/useClientSms.ts`
- Modify: `src/modules/organization/hooks/useBlacklistSettings.ts`
- Modify: `src/context/AuthContext.tsx` for backend-dependent organization/account writes only.
- Modify: screens/components that expose affected buttons to show disabled state/feedback.

**Interfaces:**
- Consumes `useNetworkStatus()` and `assertOnlineForMutation()` from Task 2.
- Server mutations must fail before API invocation while status is explicitly `offline`.
- `unknown` startup state does not permanently disable the app; first actual mutation may proceed unless NetInfo has resolved offline.

- [ ] **Step 1: Add a regression contract check**

Create `scripts/check-offline-mutation-guard.cjs` that asserts the canonical guard is imported by the client mutation hooks, transaction sheet, SMS mutation hooks, blacklist settings, and organization creation/select path.

- [ ] **Step 2: Guard each server mutation at its feature boundary**

Prefer hook/mutation-function boundaries so a screen cannot accidentally bypass offline protection. Keep purely local theme/PIN operations available offline.

- [ ] **Step 3: Disable obvious write controls while offline**

Customers add, transaction submit, client edit/delete, SMS send, blacklist save, organization create/select, and backend account-update actions should expose a disabled state and `common.internetRequired` feedback where a press is still possible.

- [ ] **Step 4: Verify and commit**

Run: `npm run verify`

```bash
git add src scripts/check-offline-mutation-guard.cjs
git commit -m "feat: block server writes while offline"
```

---

### Task 10: Extract Customers screen responsibilities without redesigning it

**Files:**
- Create: `src/modules/clients/hooks/useCustomerListState.ts`
- Create: `src/modules/clients/hooks/useCustomerCreate.ts`
- Create: `src/modules/clients/components/CustomersHeader.tsx`
- Create: `src/modules/clients/components/CustomerCreateSheet.tsx`
- Modify: `src/screens/CustomersScreen.tsx`
- Test: pure helpers used by the new hooks where behavior is extracted.

**Interfaces:**
- `useCustomerListState` owns query/debounce/debtor-only/source-list/balance resolution and exposes render-ready `{ items, countLabelData, loading, error, query, setQuery, debtorOnly, toggleDebtorOnly, refresh }`.
- `useCustomerCreate` owns form values, validation, contact picker mapping, pending state, and create submit.
- Components remain presentation-focused and accept callbacks/state rather than importing API services.

- [ ] **Step 1: Move list-state calculations behind one hook with existing behavior unchanged**

Use the Task 5 balance helpers; no new fetch path may be introduced.

- [ ] **Step 2: Move create-form orchestration to `useCustomerCreate`**

Preserve phone validation, contact picker behavior, keyboard dismissal, haptics, and localized API errors.

- [ ] **Step 3: Extract header/filter and create-sheet UI**

Keep current colors/spacing/bottom-sheet design. This task is structural, not visual redesign.

- [ ] **Step 4: Run verification and the existing formatted-input/keyboard checks**

Run:

```bash
npm run verify
npm run check:sheet-keyboard
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/clients src/screens/CustomersScreen.tsx
git commit -m "refactor: split customer list responsibilities"
```

---

### Task 11: Extract Customer Detail sections and keep transaction data local to the detail

**Files:**
- Create: `src/modules/clients/components/CustomerProfileHeader.tsx`
- Create: `src/modules/clients/components/CustomerBalanceCard.tsx`
- Create: `src/modules/clients/components/CustomerBlacklistSection.tsx`
- Create: `src/modules/transactions/components/CustomerTransactionsSection.tsx`
- Modify: `src/screens/CustomerDetailScreen.tsx`
- Modify: `src/modules/clients/hooks/useClientDetail.ts` only where section contracts need stable derived state.

**Interfaces:**
- Detail/history remain owned by `useClientDetail`.
- Transactions section receives already-loaded `transactions`, date filter state, callbacks, and no global `AppContext.transactions` dependency.

- [ ] **Step 1: Extract display-only sections one at a time**

Start with profile header and balance card; run typecheck after each extraction.

- [ ] **Step 2: Extract blacklist and transaction sections**

Preserve date filtering, transaction detail sheet, edit sheet, currentBalance fallback, and blacklist metadata.

- [ ] **Step 3: Confirm no global all-customer transaction dependency returned**

Run static search/check ensuring `CustomerDetailScreen` uses `useClientDetail().history` rather than `useApp().transactions` for its history list.

- [ ] **Step 4: Verify and commit**

Run: `npm run verify`

```bash
git add src/modules/clients src/modules/transactions src/screens/CustomerDetailScreen.tsx
git commit -m "refactor: split customer detail sections"
```

---

### Task 12: Extract Reports presentation sections and preserve server authority

**Files:**
- Create: `src/modules/reports/components/ReportsSummary.tsx`
- Create: `src/modules/reports/components/MonthlyStatistics.tsx`
- Create: `src/modules/reports/components/TopDebtors.tsx`
- Create: `src/modules/reports/components/ReportInsights.tsx`
- Create: `src/modules/reports/components/ReportExportAction.tsx`
- Modify: `src/screens/ReportsScreen.tsx`

**Interfaces:**
- `ReportsScreen` remains the orchestration point for `useReports`, refresh, navigation, and export state.
- Child components consume `ReportsResponse` fields/derived presentation data only; they do not call APIs.

- [ ] **Step 1: Extract KPI summary and monthly statistics**

Keep exact report values server-authoritative; do not restore local transaction-derived fallback totals.

- [ ] **Step 2: Extract Top Debtors and preserve navigation by `clientId`**

No customer-name lookup against local lists is required for navigation.

- [ ] **Step 3: Extract insights and export action**

Keep Excel export behavior and sharing errors unchanged.

- [ ] **Step 4: Verify report contract and commit**

Run:

```bash
npm run verify
node scripts/check-reports-response.cjs
```

```bash
git add src/modules/reports src/screens/ReportsScreen.tsx
git commit -m "refactor: split reports presentation sections"
```

---

### Task 13: Reduce context/service legacy coupling in touched domains

**Files:**
- Modify: `src/context/AppContext.tsx`
- Modify: `src/context/AuthContext.tsx`
- Modify/Create focused helpers under `src/modules/organization/` and `src/modules/auth/` only when extracted behavior already exists.
- Move touched client API implementation from legacy re-export boundary toward `src/modules/clients/services/` if doing so does not create circular imports.
- Keep compatibility re-exports temporarily where existing imports still need them.

**Interfaces:**
- Public `useAuth()` contract remains compatible.
- `AppContext` becomes a convenience facade over feature hooks, not a second server-state store.

- [ ] **Step 1: Remove duplicated query/orchestration code made obsolete by Tasks 3–5**

Do not change UI behavior; remove only now-redundant calculations/invalidation logic.

- [ ] **Step 2: Extract organization selection/session helpers from AuthContext where a pure boundary is clear**

Keep state transitions in one place and preserve `openOrganizationSelector`, `cancelOrganizationSelection`, and selection return-tab behavior.

- [ ] **Step 3: Migrate touched legacy service ownership incrementally**

Avoid a repository-wide move. If `clientsApi.ts` is moved, keep a compatibility export so untouched callers do not break in the same commit.

- [ ] **Step 4: Verify and commit**

Run: `npm run verify`

```bash
git add src/context src/modules src/services
git commit -m "refactor: clarify mobile state ownership"
```

---

### Task 14: Harden app-update URL validation and repository environment handling

**Files:**
- Create: `src/modules/app-update/utils/storeUrl.ts`
- Create: `src/modules/app-update/utils/storeUrl.test.ts`
- Modify: `src/modules/app-update/services/appUpdateService.ts`
- Delete from git tracking: `.env`
- Modify: `.env.example` only if any required public key is missing.

**Interfaces:**
- Produces `isAllowedStoreUrl(platform, value)`.
- Android allows HTTPS Play Store URLs for the app package; iOS allows HTTPS App Store URLs. Arbitrary HTTPS destinations are rejected.
- Update-config fetch failure remains fail-open.

- [ ] **Step 1: Write store URL validation tests**

Accept `https://play.google.com/...` for Android and `https://apps.apple.com/...` for iOS; reject `https://example.com/...`, `http://...`, and cross-platform store destinations.

- [ ] **Step 2: Integrate platform-aware validation**

Validate the selected platform config’s URL when fetching/evaluating it without changing semantic-version logic.

- [ ] **Step 3: Stop tracking `.env`**

The actual public values remain available through local/EAS environment configuration. Keep `.env.example` documenting required `EXPO_PUBLIC_*` keys; do not claim rotation is needed because these values are client-public.

- [ ] **Step 4: Verify and commit**

Run: `npm run verify`

```bash
git rm --cached .env
git add .env.example src/modules/app-update
git commit -m "chore: harden update URLs and env handling"
```

---

### Task 15: Final release-readiness audit and verification

**Files:**
- Modify tests/check scripts only for defects found during verification.
- Do not add feature scope during this task.

**Interfaces:**
- Produces fresh evidence for the Definition of Done.

- [ ] **Step 1: Run the full network-independent suite**

```bash
npm ci
npm run verify
```

Expected: PASS.

- [ ] **Step 2: Run release checks**

```bash
npm run doctor
npm run audit:production
```

Expected: Doctor clean or every warning documented as understood/non-blocking; audit reviewed with no unresolved production vulnerability at the configured threshold.

- [ ] **Step 3: Run targeted static checks again**

At minimum:

```bash
node scripts/check-transaction-sheet.cjs
node scripts/check-client-update.cjs
node scripts/check-client-sms-api.cjs
node scripts/check-client-sms-permissions.cjs
node scripts/check-reports-response.cjs
node scripts/check-subscription-contract.cjs
node scripts/check-organization-settings.cjs
```

Expected: PASS.

- [ ] **Step 4: Audit request ownership manually from code**

Confirm:
- organization selector/setup state cannot fetch client/report/SMS/blacklist business data;
- offline server mutations fail before API invocation;
- reconnect does not replay blocked writes;
- search missing-balance histories are bounded to missing search IDs;
- customer detail uses per-client detail/history queries;
- reports remain server-authoritative;
- sensitive PIN/biometric changes require re-auth;
- no query cache persistence was added.

- [ ] **Step 5: Compare branch against main**

```bash
git diff --stat main...feat/mobile-production-hardening
git diff --name-only main...feat/mobile-production-hardening
```

Review for accidental generated files, `.env`, native build outputs, or unrelated changes.

- [ ] **Step 6: Final verification commit only if verification itself required tracked fixes**

```bash
git add -A
git commit -m "test: finalize mobile production verification"
```

Do not create an empty commit.

---

## Plan Self-Review Checklist

- Spec coverage: network/offline, organization query gating, cache matrix, balance fallback, security re-auth, PIN metadata, defensive parsing, UI states, screen decomposition, context ownership, app update validation, environment handling, and verification are each mapped to tasks.
- No disk persistence for business/query cache is introduced.
- No offline replay/queue is introduced.
- No second PIN prompt is added to PIN-change flow.
- Subscription stays account-scoped where backend semantics require it.
- SMS permission constants and plan semantics are unchanged.
- Large-screen decomposition tasks preserve current UI behavior rather than redesigning.
- Test runner is cross-platform and does not rely on shell recursive glob expansion.
- CI is intentionally not added until `npm run verify` is proven green in a dependency-equipped environment.
