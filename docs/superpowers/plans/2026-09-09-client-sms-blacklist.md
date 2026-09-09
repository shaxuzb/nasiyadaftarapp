# Client SMS and Blacklist Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permission-aware debt SMS recipient, bulk-send, history, client blacklist visibility, and organization blacklist settings to the existing mobile app.

**Architecture:** Extend the shared client model for blacklist data, place all SMS contracts and behavior in a focused `client-sms` module, and place blacklist settings in the organization module. Use organization-scoped TanStack Query keys, existing React Navigation stack screens, existing theme components, and server-driven pagination/filtering.

**Tech Stack:** Expo SDK 55, React Native 0.83, TypeScript, React Navigation 7, TanStack Query 5, Axios, existing app theme/toast/confirm components.

**Spec:** `docs/superpowers/specs/2026-09-09-client-sms-blacklist-design.md`

## Global Constraints

- Work directly in the current checkout; do not create a worktree.
- Preserve all existing uncommitted user changes and stage only files owned by each task.
- `blacklistAfterDays` starts at frontend default `30` whenever the screen opens.
- Do not add dependencies.
- List search/filter/pagination is backend-driven; do not load all records and filter locally.
- Never optimistically claim an SMS was delivered.
- Do not send any real SMS during automated or device verification.
- Permission codes are exact strings: `CLIENT_SMS_VIEW`, `CLIENT_SMS_SEND`, `CLIENT_SMS_BULK_SEND`, `CLIENT_SMS_HISTORY_VIEW`.

---

### Task 1: Extend the Client Domain with Blacklist Data

**Files:**
- Modify: `src/modules/clients/types/index.ts`
- Modify: `src/services/clientsApi.ts`
- Create: `scripts/check-client-blacklist.cjs`

**Interfaces:**
- Produces: `BlacklistedOrganization`, expanded `Customer`, expanded `ClientDto`.
- Produces mapped defaults: `isBlacklisted=false`, `overdueBalance=0`, `blacklistedOrganizationCount=0`, `blacklistedOrganizations=[]`.
- Consumed by: client profile and SMS recipient models.

- [ ] **Step 1: Write the failing client-mapping test**

Create a script that transpiles and loads `clientsApi.ts` with a mocked `apiClient`, calls `getClientById(82)`, and asserts literal mapped values:

```js
assert.deepEqual(customer.blacklistedOrganizations, [
  { id: 7, name: "Chorsu savdo" },
  { id: 9, name: "Yangi bozor" },
]);
assert.equal(customer.isBlacklisted, true);
assert.equal(customer.overdueBalance, 125000);
assert.equal(customer.blacklistedOrganizationCount, 2);
```

Add a second response with omitted blacklist fields and assert the four safe defaults.

- [ ] **Step 2: Run the test and verify RED**

Run: `node scripts/check-client-blacklist.cjs`

Expected: FAIL because the mapped `Customer` lacks blacklist fields.

- [ ] **Step 3: Add types and defensive mapping**

Define:

```ts
export interface BlacklistedOrganization {
  id?: number;
  name: string;
}

export interface Customer {
  // existing fields remain
  isBlacklisted?: boolean;
  overdueBalance?: number;
  blacklistedOrganizationCount?: number;
  blacklistedOrganizations?: BlacklistedOrganization[];
}
```

Keep the domain fields optional so existing cached/demo customer objects remain backward compatible, but always populate all four values in `mapClient`. Extend `ClientDto` with optional unknown-compatible API fields and add private mapping helpers that accept organization objects containing `id`, `organizationId`, `name`, or `organizationName`. Drop malformed organization entries without inventing names. Use finite numeric coercion for balances/counts and never infer `isBlacklisted=true` solely from debt. UI consumers use `?? false`, `?? 0`, and `?? []` defensively.

- [ ] **Step 4: Run focused and existing client checks**

Run:

```powershell
node scripts/check-client-blacklist.cjs
node scripts/check-client-update.cjs
npm.cmd run typecheck
```

Expected: all exit 0.

- [ ] **Step 5: Commit only Task 1 files**

```powershell
git add -- src/modules/clients/types/index.ts src/services/clientsApi.ts scripts/check-client-blacklist.cjs
git commit -m "feat: map client blacklist status"
```

---

### Task 2: Add SMS Contracts, Parsers, Services, and Scoped Query Keys

**Files:**
- Create: `src/modules/client-sms/types/index.ts`
- Create: `src/modules/client-sms/utils/smsParsing.ts`
- Create: `src/modules/client-sms/services/clientSmsService.ts`
- Modify: `src/core/query/queryKeys.ts`
- Modify: `src/core/query/queryInvalidation.ts`
- Create: `scripts/check-client-sms-api.cjs`

**Interfaces:**
- Produces: `SmsRecipientFilters`, `SmsHistoryFilters`, `SmsRecipient`, `SmsHistoryItem`, `BulkSmsResponse`, `PagedResult<T>`.
- Produces: `getSmsRecipients`, `sendDebtSms`, `sendBulkDebtSms`, `getDebtSmsHistory`.
- Produces scoped keys `clientSmsRecipients(scope, filters)` and `clientSmsHistory(scope, filters)` plus roots.

- [ ] **Step 1: Write failing parser and request-contract tests**

Use literal fixtures to cover direct and wrapped paginated responses. Assert:

```js
assert.deepEqual(recipientRequest.params, {
  search: "Ali",
  blacklisted: true,
  hasDebt: true,
  canSend: true,
  pageNumber: 2,
  pageSize: 20,
});
assert.deepEqual(bulkRequest.body, { clientIds: [1, 2, 3] });
assert.deepEqual(result, {
  sentCount: 1,
  failedCount: 1,
  skippedCount: 1,
  results: fixtureResults,
});
```

Also assert duplicate/invalid IDs normalize to `[1, 2, 3]`, an empty normalized bulk payload rejects before HTTP, omitted optional filters are absent, and history forwards `status`, `search`, `pageNumber`, `pageSize`.

- [ ] **Step 2: Run and verify RED**

Run: `node scripts/check-client-sms-api.cjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement explicit contracts and parsers**

Use these public signatures:

```ts
export function getSmsRecipients(
  filters: SmsRecipientFilters,
  signal?: AbortSignal,
): Promise<PagedResult<SmsRecipient>>;

export function sendDebtSms(clientId: number): Promise<IndividualSmsResult>;

export function sendBulkDebtSms(clientIds: number[]): Promise<BulkSmsResponse>;

export function getDebtSmsHistory(
  filters: SmsHistoryFilters,
  signal?: AbortSignal,
): Promise<PagedResult<SmsHistoryItem>>;
```

Map `results/items/data/result` page wrappers, read `count` with item-length fallback, reject non-positive client IDs, trim search, and omit empty query values. Preserve unknown server status text as a displayable string while normalizing comparisons to lowercase.

- [ ] **Step 4: Add scoped cache roots and organization cleanup**

Add:

```ts
clientSmsRoot: () => ["client-sms"] as const,
clientSmsRecipientsRoot: (scope: QueryScope) => ["client-sms", scope, "recipients"] as const,
clientSmsRecipients: (scope: QueryScope, filters: SmsRecipientFilters) =>
  ["client-sms", scope, "recipients", filters] as const,
clientSmsHistoryRoot: (scope: QueryScope) => ["client-sms", scope, "history"] as const,
clientSmsHistory: (scope: QueryScope, filters: SmsHistoryFilters) =>
  ["client-sms", scope, "history", filters] as const,
```

Include `clientSmsRoot()` in organization-dependent query cleanup.

- [ ] **Step 5: Run focused and type checks**

Run:

```powershell
node scripts/check-client-sms-api.cjs
npm.cmd run typecheck
```

Expected: both exit 0.

- [ ] **Step 6: Commit only Task 2 files**

```powershell
git add -- src/modules/client-sms src/core/query/queryKeys.ts src/core/query/queryInvalidation.ts scripts/check-client-sms-api.cjs
git commit -m "feat: add client SMS API contracts"
```

---

### Task 3: Add Permission Decisions and Query Hooks

**Files:**
- Create: `src/modules/client-sms/utils/smsPermissions.ts`
- Create: `src/modules/client-sms/hooks/useClientSms.ts`
- Create: `scripts/check-client-sms-permissions.cjs`

**Interfaces:**
- Produces: `getClientSmsCapabilities(permissions?: string[])`.
- Produces: `useSmsRecipients(filters)`, `useSmsHistory(filters)`, `useSendDebtSms()`, `useSendBulkDebtSms()`.
- Consumes Task 2 services and query keys.

- [ ] **Step 1: Write failing permission-table tests**

Assert exact, case-sensitive behavior for empty, view-only, send-only, bulk-only, history-only, and all permissions:

```js
assert.deepEqual(getClientSmsCapabilities(["CLIENT_SMS_VIEW"]), {
  canView: true,
  canSendOne: false,
  canSendBulk: false,
  canViewHistory: false,
});
assert.equal(getClientSmsCapabilities(["client_sms_view"]).canView, false);
```

- [ ] **Step 2: Run and verify RED**

Run: `node scripts/check-client-sms-permissions.cjs`

Expected: FAIL because the permission helper does not exist.

- [ ] **Step 3: Implement pure permission helper and hooks**

Queries use `keepPreviousData`, `staleTime: 30_000`, and `enabled` guarded by authentication plus matching view permission. Mutations synchronously reject duplicate submissions in the screen/controller and invalidate these roots only after POST success:

```ts
queryKeys.clientSmsRecipientsRoot(scope)
queryKeys.clientSmsHistoryRoot(scope)
```

Do not await invalidation inside the mutation’s accepted POST path.

- [ ] **Step 4: Run checks**

Run:

```powershell
node scripts/check-client-sms-permissions.cjs
node scripts/check-client-sms-api.cjs
npm.cmd run typecheck
```

Expected: all exit 0.

- [ ] **Step 5: Commit only Task 3 files**

```powershell
git add -- src/modules/client-sms/utils/smsPermissions.ts src/modules/client-sms/hooks/useClientSms.ts scripts/check-client-sms-permissions.cjs
git commit -m "feat: add client SMS permissions and queries"
```

---

### Task 4: Build the Recipient Selection and Send Screen

**Files:**
- Create: `src/modules/client-sms/utils/recipientSelection.ts`
- Create: `src/modules/client-sms/components/SmsRecipientRow.tsx`
- Create: `src/screens/ClientSmsScreen.tsx`
- Create: `scripts/check-recipient-selection.cjs`

**Interfaces:**
- Produces pure functions `toggleRecipientSelection`, `selectEligibleRecipients`, `reconcileRecipientSelection`.
- Produces `ClientSmsScreen` expecting root-stack navigation.
- Consumes Task 3 hooks/capabilities.

- [ ] **Step 1: Write failing selection tests**

Assert literal behavior:

```js
assert.deepEqual([...toggleRecipientSelection(new Set([1]), 2)], [1, 2]);
assert.deepEqual([...toggleRecipientSelection(new Set([1, 2]), 1)], [2]);
assert.deepEqual([...selectEligibleRecipients([
  { id: 1, canSend: true }, { id: 2, canSend: false }, { id: 3, canSend: true },
])], [1, 3]);
assert.equal(reconcileRecipientSelection(new Set([1, 2]), new Set([2, 3])).size, 0);
```

The final assertion encodes the product rule: filter/page changes clear selection rather than silently retaining hidden recipients.

- [ ] **Step 2: Run and verify RED**

Run: `node scripts/check-recipient-selection.cjs`

Expected: FAIL because the selection utility does not exist.

- [ ] **Step 3: Implement selection utility and memoized row**

`SmsRecipientRow` receives primitives plus stable callbacks, uses `Pressable`, renders initials/name/phone, debt and overdue balance, blacklist badge, disabled reason, and an accessible checked state. It never derives eligibility from debt; `canSend` comes from the API.

- [ ] **Step 4: Implement backend-driven screen state**

Use page size 20, 350 ms debounced search, and filters `blacklisted`, `hasDebt`, `canSend` with `undefined` meaning “Hammasi”. Reset page and selection whenever debounced search or filters change. Render a `FlatList` with pull-to-refresh, empty/error states, and page controls or safe incremental pagination based on response count.

The sticky footer appears only for non-empty selection and bulk permission. Before individual or bulk mutation, call the existing custom confirmation dialog. Use a `useRef(false)` submission lock before awaiting confirmation/mutation. Bulk completion toast must include all server counts, for example: `1 yuborildi · 1 xato · 1 o'tkazildi`.

- [ ] **Step 5: Add access-denied behavior**

If `canView` is false, render a themed access-denied state with a back button and do not mount the recipients query. Hide history without history permission, individual actions without send permission, and all selection affordances without bulk permission.

- [ ] **Step 6: Run focused, Babel, and type checks**

Run:

```powershell
node scripts/check-recipient-selection.cjs
node -e "require('@babel/core').transformFileSync('src/screens/ClientSmsScreen.tsx'); console.log('ClientSmsScreen: Babel OK')"
npm.cmd run typecheck
```

Expected: all exit 0.

- [ ] **Step 7: Commit only Task 4 files**

```powershell
git add -- src/modules/client-sms/utils/recipientSelection.ts src/modules/client-sms/components/SmsRecipientRow.tsx src/screens/ClientSmsScreen.tsx scripts/check-recipient-selection.cjs
git commit -m "feat: add client SMS recipient workflow"
```

---

### Task 5: Build SMS History

**Files:**
- Create: `src/modules/client-sms/components/SmsHistoryRow.tsx`
- Create: `src/screens/ClientSmsHistoryScreen.tsx`

**Interfaces:**
- Produces `ClientSmsHistoryScreen` expecting root-stack navigation.
- Consumes `useSmsHistory` and `getClientSmsCapabilities`.

- [ ] **Step 1: Add a failing transform/import smoke check before implementation**

Run:

```powershell
node -e "require('@babel/core').transformFileSync('src/screens/ClientSmsHistoryScreen.tsx')"
```

Expected: FAIL with file-not-found.

- [ ] **Step 2: Implement history row and screen**

Use backend page size 20 and 350 ms debounced search. Add status chips: “Hammasi” (`undefined`), “Yuborildi” (`sent`), “Xato” (`failed`), and “O‘tkazildi” (`skipped`). Rows show recipient name/phone, formatted time, a semantic status badge, and optional message/error text. Keep unknown status values displayable with neutral theme styling.

If history permission is absent, render access denied and do not run the query. Preserve filters on retry and retain previous page data during page changes.

- [ ] **Step 3: Run Babel and type checks**

Run:

```powershell
node -e "require('@babel/core').transformFileSync('src/screens/ClientSmsHistoryScreen.tsx'); console.log('ClientSmsHistoryScreen: Babel OK')"
npm.cmd run typecheck
```

Expected: both exit 0.

- [ ] **Step 4: Commit only Task 5 files**

```powershell
git add -- src/modules/client-sms/components/SmsHistoryRow.tsx src/screens/ClientSmsHistoryScreen.tsx
git commit -m "feat: add client SMS history"
```

---

### Task 6: Add Organization Blacklist Settings

**Files:**
- Modify: `src/modules/organization/types/index.ts`
- Modify: `src/services/organizationsApi.ts`
- Create: `src/modules/organization/utils/blacklistSettings.ts`
- Create: `src/modules/organization/hooks/useBlacklistSettings.ts`
- Create: `src/screens/BlacklistSettingsScreen.tsx`
- Create: `scripts/check-blacklist-settings.cjs`

**Interfaces:**
- Produces `updateBlacklistSettings({ blacklistAfterDays })`.
- Produces `parseBlacklistDays(input): number | null`.
- Produces `useUpdateBlacklistSettings()` and `BlacklistSettingsScreen`.

- [ ] **Step 1: Write failing validation and HTTP payload tests**

Assert:

```js
assert.equal(parseBlacklistDays("30"), 30);
assert.equal(parseBlacklistDays("1"), 1);
assert.equal(parseBlacklistDays("3650"), 3650);
for (const value of ["", "0", "1.5", "-1", "3651", "abc"]) {
  assert.equal(parseBlacklistDays(value), null);
}
assert.deepEqual(putRequest, {
  url: "/organizations/current/blacklist-settings",
  body: { blacklistAfterDays: 30 },
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node scripts/check-blacklist-settings.cjs`

Expected: FAIL because validation/service do not exist.

- [ ] **Step 3: Implement setting service, validation, and mutation**

Define `BlacklistSettingsRequest { blacklistAfterDays: number }`. The mutation calls PUT and accepts an empty 200 response. Keep the value in screen state after success; do not invent a GET cache value.

- [ ] **Step 4: Build settings screen**

Initialize input to `"30"`. Use a compact numeric field, explanatory warning, header back button, and bottom-safe save action. Disable save unless the parsed number is valid, differs from 30, and no request is pending. Keep user input after server errors and show existing themed toasts.

- [ ] **Step 5: Run checks**

Run:

```powershell
node scripts/check-blacklist-settings.cjs
node -e "require('@babel/core').transformFileSync('src/screens/BlacklistSettingsScreen.tsx'); console.log('BlacklistSettingsScreen: Babel OK')"
npm.cmd run typecheck
```

Expected: all exit 0.

- [ ] **Step 6: Commit only Task 6 files**

```powershell
git add -- src/modules/organization src/services/organizationsApi.ts src/screens/BlacklistSettingsScreen.tsx scripts/check-blacklist-settings.cjs
git commit -m "feat: add blacklist threshold settings"
```

---

### Task 7: Integrate Navigation, Menus, and Client Detail Blacklist UI

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/navigation/index.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/CustomerDetailScreen.tsx`

**Interfaces:**
- Consumes all earlier screen and domain interfaces.
- Produces navigable `ClientSms`, `ClientSmsHistory`, and `BlacklistSettings` root routes.

- [ ] **Step 1: Extend navigation types and register screens**

Add:

```ts
ClientSms: undefined;
ClientSmsHistory: undefined;
BlacklistSettings: undefined;
```

Register all three with `headerShown: false`, following the existing dynamic stack API.

- [ ] **Step 2: Add permission-aware profile menu entries**

Compute capabilities once from `user?.permissions`. Add “Mijozlarga SMS” only when `canView`; navigate to `ClientSms`. Add “Qora ro‘yxat sozlamasi” in the organization section and navigate to `BlacklistSettings`. Preserve all existing menu order, theme, account security, organization switch, and user changes.

- [ ] **Step 3: Add compact blacklist card to client profile**

When `customer.isBlacklisted` is true, render a warning card between profile stats and transaction history. Show formatted overdue balance, `blacklistedOrganizationCount`, and organization names. Deduplicate names for rendering only. If the count is positive but names are absent, show the count without an empty list. Render nothing when not blacklisted.

- [ ] **Step 4: Verify route and profile integration**

Run:

```powershell
node -e "const b=require('@babel/core'); for(const f of ['src/navigation/index.tsx','src/screens/SettingsScreen.tsx','src/screens/CustomerDetailScreen.tsx']) { b.transformFileSync(f); console.log(f + ': Babel OK') }"
npm.cmd run typecheck
```

Expected: all exit 0.

- [ ] **Step 5: Commit only Task 7 files**

```powershell
git add -- src/types/index.ts src/navigation/index.tsx src/screens/SettingsScreen.tsx src/screens/CustomerDetailScreen.tsx
git commit -m "feat: integrate client SMS and blacklist UI"
```

---

### Task 8: Full Regression and Device-Safe Verification

**Files:**
- Modify only if verification exposes a feature-owned defect.

**Interfaces:**
- Validates the complete spec without sending production SMS.

- [ ] **Step 1: Run all automated checks fresh**

```powershell
node scripts/check-client-blacklist.cjs
node scripts/check-client-sms-api.cjs
node scripts/check-client-sms-permissions.cjs
node scripts/check-recipient-selection.cjs
node scripts/check-blacklist-settings.cjs
node scripts/check-client-update.cjs
node scripts/check-transaction-sheet.cjs
node scripts/check-android-sheet-keyboard.cjs
npm.cmd run check:sheet-keyboard
npm.cmd run typecheck
git diff --check
```

Expected: every command exits 0; `git diff --check` has no whitespace errors. CRLF conversion warnings are informational.

- [ ] **Step 2: Review permission combinations without network side effects**

Use development auth fixtures or the debugger to inspect these combinations: no SMS permissions, view only, view+individual, view+bulk, view+history, and all four. Confirm hidden actions do not mount protected queries and deep route access shows access denied.

- [ ] **Step 3: Device smoke-test read-only paths**

On the connected Android device, verify recipient loading, backend search, each filter, pagination, history filters, client blacklist card, blacklist setting validation without pressing save, dark/light theme, safe areas, and keyboard behavior. Open send confirmations but cancel them; do not submit real SMS requests.

- [ ] **Step 4: Review the final diff and working tree ownership**

```powershell
git status --short
git diff --stat
git diff -- src/modules/client-sms src/modules/clients/types/index.ts src/services/clientsApi.ts src/modules/organization src/services/organizationsApi.ts src/core/query src/types/index.ts src/navigation/index.tsx src/screens/ClientSmsScreen.tsx src/screens/ClientSmsHistoryScreen.tsx src/screens/BlacklistSettingsScreen.tsx src/screens/SettingsScreen.tsx src/screens/CustomerDetailScreen.tsx
```

Confirm unrelated pre-existing files remain untouched and unstaged.

- [ ] **Step 5: Commit only verification-owned fixes if any**

If Step 1–4 required no code correction, do not create an empty commit. If a correction was needed, stage only its exact files and use:

```powershell
git commit -m "fix: harden client SMS integration"
```
