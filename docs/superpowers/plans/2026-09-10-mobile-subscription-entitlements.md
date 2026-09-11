# Mobile Subscription Entitlements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the plans catalog, current subscription, SMS packages, capability, organization-limit, registration-conflict, and SMS-quota contracts into the existing mobile user flow without adding admin-panel APIs or UI.

**Architecture:** Add a small `subscription` module as the single source of truth for current plan, feature flags, organization/client limits, and SMS quota. Keep the subscription snapshot inside the authenticated user/session for immediate decisions, and back it with a React Query `GET /subscriptions/current` query for refresh after login, SMS sends, and subscription-affecting mutations. Existing SMS, blacklist, organization, and settings screens consume capability helpers instead of duplicating plan logic.

**Tech Stack:** Expo React Native, TypeScript, React Query v5, Axios service, existing AuthContext/session storage, existing source-level regression scripts.

**Spec:** `C:\Users\richb\.codex\attachments\61681606-6143-46cb-8bbf-f830a5aed83b\pasted-text.txt`

## Global Constraints

- Admin management endpoints and admin permissions are out of scope for this mobile project.
- `null` limits mean unlimited; `unlimitedOrganizations` and `unlimitedClients` remain explicit capability flags.
- Backend remains the final authority; frontend hides/disables unavailable actions but must surface backend `403`/`400` messages.
- Existing SMS permissions remain required; subscription capability is an additional gate, not a replacement.
- Existing API response compatibility must be preserved when older sessions do not yet contain `subscription`.
- Current UI language and design-system components must be reused; no new visual system is introduced.
- Every behavior change requires a failing regression test before production code and a fresh typecheck/test run afterward.

---

### Task 1: Define the subscription domain and query contracts

**Files:**
- Create: `src/modules/subscription/types/index.ts`
- Create: `src/modules/subscription/services/subscriptionService.ts`
- Create: `src/modules/subscription/hooks/useCurrentSubscription.ts`
- Create: `src/modules/subscription/hooks/useSubscriptionCatalog.ts`
- Modify: `src/core/query/queryKeys.ts`
- Test: `scripts/check-subscription-contract.cjs`

**Interfaces:**
- `SubscriptionSmsQuota = { monthlyLimit: number | null; monthlyUsed: number; monthlyRemaining: number | null; purchasedRemaining: number; totalRemaining: number | null }`.
- `CurrentSubscription = { subscriptionId: number; planId: number; planCode: string; planName: string; price: number; startAt: string; endAt: string | null; source: string; provider: string | null; maxOrganizations: number | null; maxClients: number | null; unlimitedOrganizations: boolean; unlimitedClients: boolean; telegramBotEnabled: boolean; blacklistEnabled: boolean; sms: SubscriptionSmsQuota }`.
- `SubscriptionPlan` and `SmsPackage` preserve the catalog response fields, including nullable duration and limits.
- `getCurrentSubscription(signal?: AbortSignal): Promise<CurrentSubscription>` calls `GET /subscriptions/current`.
- `useCurrentSubscription()` queries `queryKeys.subscriptionCurrent()` only when a user exists.
- `refreshCurrentSubscription()` invalidates/refetches the current subscription query.
- `useSubscriptionPlans()` calls `GET /subscriptions/plans`; `useSmsPackages()` calls `GET /subscriptions/sms-packages`.

- [ ] **Step 1: Write the failing contract test.**

Assert that the service path is `/subscriptions/current`, `null` limits are retained, boolean flags are parsed, and missing optional quota values do not become `undefined` in the normalized domain.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `node scripts/check-subscription-contract.cjs`

Expected: FAIL because the subscription module and query key do not exist.

- [ ] **Step 3: Implement the normalized types, parser, Axios service, query key, and hook.**

Normalize the backend object in one place and preserve `null` as unlimited:

```ts
const maxOrganizations =
  raw.maxOrganizations === null ? null : finiteInteger(raw.maxOrganizations);
const unlimitedOrganizations =
  raw.unlimitedOrganizations === true || maxOrganizations === null;
```

- [ ] **Step 4: Run the contract test and typecheck.**

Run: `node scripts/check-subscription-contract.cjs`

Run: `npx.cmd tsc --noEmit --pretty false`

Expected: both exit with code 0.

- [ ] **Step 5: Add the catalog queries and verify the exact plan/package fields.**

Use the API values as the source of truth. Price `0` must render as “Hozircha bepul”; do not invent a purchase request before a purchase endpoint is supplied.

- [ ] **Step 6: Commit the isolated subscription domain.**

```bash
git add src/modules/subscription src/core/query/queryKeys.ts scripts/check-subscription-contract.cjs
git commit -m "feat: add current subscription domain"
```

### Task 2: Persist and refresh subscription with authentication

**Files:**
- Modify: `src/modules/auth/types/index.ts`
- Modify: `src/modules/auth/utils/authResponse.ts`
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/modules/auth/services/authService.ts`
- Test: `scripts/check-auth-subscription.cjs`

**Interfaces:**
- `AuthUser.subscription?: CurrentSubscription` is optional for backward-compatible hydrated sessions.
- `AuthContextValue.refreshSubscription: () => Promise<void>` updates both React state and the persisted auth session.
- `completeAuth()` stores the subscription returned by login/register/google immediately, then refreshes `/subscriptions/current` without blocking the initial organization resolution on a transient refresh failure.

- [ ] **Step 1: Write the failing auth/session test.**

Cover login response subscription persistence, an old session without subscription, and a refresh replacing the in-memory and stored snapshot.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `node scripts/check-auth-subscription.cjs`

Expected: FAIL because `AuthUser` and `AuthContext` do not expose subscription state or refresh.

- [ ] **Step 3: Add the optional user field and wire auth completion/hydration.**

Keep the existing `AuthResponse` guard focused on auth tokens; subscription parsing belongs to the subscription normalizer. When the refresh call fails, keep the login response snapshot and log only in development.

- [ ] **Step 4: Run auth/session tests and typecheck.**

Run: `node scripts/check-auth-subscription.cjs`

Run: `npx.cmd tsc --noEmit --pretty false`

Expected: both exit with code 0.

- [ ] **Step 5: Commit the authenticated subscription snapshot.**

```bash
git add src/modules/auth/types/index.ts src/modules/auth/utils/authResponse.ts src/context/AuthContext.tsx src/modules/auth/services/authService.ts scripts/check-auth-subscription.cjs
git commit -m "feat: persist subscription with auth session"
```

### Task 3: Replace the hardcoded organization limit

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/screens/OrganizationSelectScreen.tsx`
- Modify: `src/screens/OrganizationSetupScreen.tsx`
- Modify: `src/modules/organization/types/index.ts`
- Create: `src/modules/subscription/utils/entitlements.ts`
- Test: `scripts/check-organization-entitlements.cjs`

**Interfaces:**
- `canCreateOrganization(subscription: CurrentSubscription | undefined, count: number): boolean` returns true when no subscription is available (backward-compatible optimistic UI), when `unlimitedOrganizations` is true, or when `count < maxOrganizations`.
- `getOrganizationLimitLabel(...)` returns a readable `Cheksiz` label for unlimited plans and `count/limit` for bounded plans.

- [ ] **Step 1: Write the failing entitlement test.**

Assert FREE `{ maxOrganizations: 1, unlimitedOrganizations: false }` blocks a second organization, PRO `{ maxOrganizations: null, unlimitedOrganizations: true }` allows creation, and a backend `403` still reaches the existing toast path.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `node scripts/check-organization-entitlements.cjs`

Expected: FAIL because the UI and `AuthContext` still import `MAX_ORGANIZATIONS_PER_USER`.

- [ ] **Step 3: Use the helper in creation guards and labels.**

Remove the fixed limit from runtime decisions. Keep a non-authoritative fallback only for legacy users without a subscription, and use the subscription snapshot from `useAuth()`.

- [ ] **Step 4: Run organization and existing selection tests.**

Run: `node scripts/check-organization-entitlements.cjs`

Run: `node scripts/check-organization-settings.cjs`

Expected: both exit with code 0.

- [ ] **Step 5: Commit dynamic organization entitlements.**

```bash
git add src/context/AuthContext.tsx src/screens/OrganizationSelectScreen.tsx src/screens/OrganizationSetupScreen.tsx src/modules/organization/types/index.ts src/modules/subscription/utils/entitlements.ts scripts/check-organization-entitlements.cjs
git commit -m "feat: enforce subscription organization limits"
```

### Task 4: Gate Telegram and blacklist capabilities

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/navigation/index.tsx`
- Modify: `src/screens/ClientSmsScreen.tsx`
- Modify: `src/screens/BlacklistSettingsScreen.tsx`
- Modify: `src/modules/client-sms/utils/smsPermissions.ts`
- Test: `scripts/check-subscription-capability-gates.cjs`

**Interfaces:**
- `hasSubscriptionCapability(user, "telegram" | "blacklist" | "sms")` reads the current subscription snapshot and returns false only when an explicit disabled flag is present.
- `getClientSmsCapabilities(permissions, subscription)` returns permission capabilities intersected with SMS availability.

- [ ] **Step 1: Write the failing capability-gate test.**

Assert Telegram is hidden when `telegramBotEnabled === false`, blacklist settings/filter are hidden when `blacklistEnabled === false`, and SMS send/view still require both permission and subscription availability.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `node scripts/check-subscription-capability-gates.cjs`

Expected: FAIL because settings currently render Telegram/blacklist unconditionally and SMS permissions only inspect permissions.

- [ ] **Step 3: Add capability helpers and apply them at menu/navigation/UI boundaries.**

Do not remove backend routes; guard navigation/menu entries and filter controls. If a deep link reaches a disabled screen, render the project’s existing empty/error state and offer back navigation.

- [ ] **Step 4: Run capability, blacklist, and SMS permission tests.**

Run: `node scripts/check-subscription-capability-gates.cjs`

Run: `node scripts/check-blacklist-settings.cjs`

Run: `node scripts/check-client-sms-permissions.cjs`

Expected: all exit with code 0.

- [ ] **Step 5: Commit capability visibility gates.**

```bash
git add src/screens/SettingsScreen.tsx src/navigation/index.tsx src/screens/ClientSmsScreen.tsx src/screens/BlacklistSettingsScreen.tsx src/modules/client-sms/utils/smsPermissions.ts scripts/check-subscription-capability-gates.cjs
git commit -m "feat: gate mobile features by subscription"
```

### Task 5: Handle registration SMS 409 at the request boundary

**Files:**
- Modify: `src/screens/RegisterScreen.tsx`
- Modify: `src/services/authApi.ts`
- Modify: `src/utils/apiError.ts` only if status extraction is missing
- Test: `scripts/check-registration-phone-conflict.cjs`

**Interfaces:**
- `sendSmsCode({ phone })` keeps returning the existing response on success.
- A `409` from `POST /sms/send` produces a specific user-facing state: “Bu telefon raqami allaqachon ro‘yxatdan o‘tgan”, does not navigate to OTP, and exposes the existing login action.

- [ ] **Step 1: Write the failing 409 flow test.**

Assert a rejected `sendSmsCode` with status 409 triggers the conflict path and `onGoToSmsVerify` is not called; non-409 errors keep the generic error toast.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `node scripts/check-registration-phone-conflict.cjs`

Expected: FAIL because `RegisterScreen` currently treats every send error identically.

- [ ] **Step 3: Implement the dedicated conflict state/toast and Login navigation.**

Do not call register or OTP navigation after the conflict. Preserve entered form data until the user chooses to switch to login.

- [ ] **Step 4: Run the flow test and typecheck.**

Run: `node scripts/check-registration-phone-conflict.cjs`

Run: `npx.cmd tsc --noEmit --pretty false`

Expected: both exit with code 0.

- [ ] **Step 5: Commit registration conflict handling.**

```bash
git add src/screens/RegisterScreen.tsx src/services/authApi.ts src/utils/apiError.ts scripts/check-registration-phone-conflict.cjs
git commit -m "fix: handle registered phone during signup"
```

### Task 6: Integrate SMS quota and refresh after sends

**Files:**
- Modify: `src/modules/client-sms/types/index.ts`
- Modify: `src/modules/client-sms/utils/smsParsing.ts`
- Modify: `src/modules/client-sms/services/clientSmsService.ts`
- Modify: `src/modules/client-sms/hooks/useClientSms.ts`
- Modify: `src/screens/ClientSmsScreen.tsx`
- Modify: `src/core/query/queryInvalidation.ts`
- Test: `scripts/check-client-sms-quota.cjs`

**Interfaces:**
- `SmsSendQuota = { monthlyRemaining: number | null; purchasedRemaining: number; totalRemaining: number | null }`.
- `SmsSendResult` gains `quotaSource?: "included" | "package" | string` and `quota?: SmsSendQuota`.
- `BulkSmsResponse` gains optional top-level `quotaSource` and `quota` while preserving `sentCount`, `failedCount`, `skippedCount`, and `results`.
- `useSendDebtSms` and `useSendBulkDebtSms` invalidate recipients/history and call `refreshSubscription()` on success.

- [ ] **Step 1: Write the failing parser and refresh test.**

Cover individual response quota, bulk top-level quota, quota exhaustion (`totalRemaining === 0`), and refresh invocation after successful sends.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `node scripts/check-client-sms-quota.cjs`

Expected: FAIL because current parsers discard quota and mutations only invalidate recipient/history queries.

- [ ] **Step 3: Normalize response quota and wire the refresh callback.**

After a successful send, refresh `/subscriptions/current`; do not refresh it for a failed mutation. Disable send controls with a clear “SMS limiti tugagan” message when the normalized total is zero, while still allowing backend errors to be displayed.

- [ ] **Step 4: Run SMS parser, API, permission, and quota tests.**

Run: `node scripts/check-client-sms-quota.cjs`

Run: `node scripts/check-client-sms-api.cjs`

Run: `node scripts/check-client-sms-permissions.cjs`

Expected: all exit with code 0.

- [ ] **Step 5: Commit SMS quota integration.**

```bash
git add src/modules/client-sms src/screens/ClientSmsScreen.tsx src/core/query/queryInvalidation.ts scripts/check-client-sms-quota.cjs
git commit -m "feat: integrate SMS subscription quota"
```

### Task 7: Add missing recipient metadata and preserve current SMS UI

**Files:**
- Modify: `src/modules/client-sms/types/index.ts`
- Modify: `src/modules/client-sms/utils/smsParsing.ts`
- Modify: `src/modules/client-sms/components/SmsRecipientRow.tsx`
- Modify: `src/screens/ClientSmsScreen.tsx`
- Test: `scripts/check-client-sms-recipient-metadata.cjs`

**Interfaces:**
- `SmsRecipient` gains `blacklistedOrganizationCount: number`.
- The parser accepts absent/null values as `0` and keeps `isBlacklisted`, `currentBalance`, `overdueBalance`, and `canSend` behavior unchanged.

- [ ] **Step 1: Write the failing metadata test.**

Assert the new backend field is parsed and the row displays a compact explanatory badge only when the count is positive.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `node scripts/check-client-sms-recipient-metadata.cjs`

Expected: FAIL because the type/parser currently omit the field.

- [ ] **Step 3: Add the field to the normalized model and row UI.**

Use existing danger/badge styles and avoid changing list density for normal recipients.

- [ ] **Step 4: Run metadata and existing SMS UI tests.**

Run: `node scripts/check-client-sms-recipient-metadata.cjs`

Run: `node scripts/check-client-sms-template.cjs`

Run: `node scripts/check-client-sms-query-scope.cjs`

Expected: all exit with code 0.

- [ ] **Step 5: Commit recipient metadata support.**

```bash
git add src/modules/client-sms/types/index.ts src/modules/client-sms/utils/smsParsing.ts src/modules/client-sms/components/SmsRecipientRow.tsx src/screens/ClientSmsScreen.tsx scripts/check-client-sms-recipient-metadata.cjs
git commit -m "feat: show SMS recipient blacklist metadata"
```

### Task 8: Add the user-facing plans and SMS packages screen

**Files:**
- Create: `src/screens/SubscriptionScreen.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/navigation/index.tsx`
- Modify: `src/types/index.ts`
- Test: `scripts/check-subscription-screen.cjs`

The Profile screen gets a compact current-plan card and a “Tariflar va limitlar” row. The dedicated screen shows the current plan, FREE/PRO feature comparison, SMS quota, and SMS packages. Since no purchase endpoint was supplied, actions use the existing Admin contact flow and never pretend a purchase succeeded.

### Task 9: Full mobile integration verification and explicit scope boundary

**Files:**
- Modify: `docs/superpowers/specs/2026-09-09-client-sms-blacklist-design.md` only if the existing spec needs a subscription dependency note.
- Test: existing `scripts/check-*.cjs` regression suite plus TypeScript check.

**Interfaces:**
- No new production interface. This task confirms all previous interfaces compose correctly.

- [ ] **Step 1: Run the complete mobile regression suite.**

Run each mobile-relevant checker:

```powershell
Get-ChildItem scripts\check-*.cjs | ForEach-Object { node $_.FullName }
npx.cmd tsc --noEmit --pretty false
git diff --check
```

Expected: every checker exits with code 0; TypeScript exits with code 0; `git diff --check` reports no whitespace errors.

- [ ] **Step 2: Verify the user-flow checklist.**

1. Login/register/google immediately expose the plan snapshot.
2. App bootstrap refreshes current subscription without losing a valid login snapshot on transient failure.
3. FREE blocks organization creation after one organization; PRO allows it when the backend does.
4. Telegram and blacklist UI follow feature flags.
5. SMS UI requires permission plus subscription capability and shows remaining quota.
6. Successful individual/bulk SMS refreshes current quota; quota-zero disables send controls.
7. Registered phone during signup never enters OTP and offers Login.
8. Admin management endpoints and admin menus remain absent from this mobile project.

- [ ] **Step 3: Commit the completed mobile integration.**

```bash
git add docs/superpowers/plans/2026-09-10-mobile-subscription-entitlements.md
git commit -m "docs: plan mobile subscription integration"
```

## Scope Review

Covered from the supplied contract: plans catalog, current subscription snapshot, SMS packages catalog, dynamic organization limits, Telegram/blacklist gates, signup `409`, SMS quota parsing/refresh, recipient metadata, and existing permission intersections.

Explicitly excluded: `GET/PUT /subscriptions/plans/management`, SMS package CRUD, admin user management/subscription APIs, and admin-only permissions. These require an admin frontend/navigation that does not exist in this repository. Online purchase is also excluded until a user-facing purchase endpoint and payment contract are supplied; the catalog UI is ready for that later mutation.
