# In-App Account Deletion Implementation Plan

> **For implementation:** Execute after shared sensitive-action re-auth exists. Use strict RED → GREEN → REFACTOR. A successful backend delete must never be followed by normal server logout.

**Goal:** Add a discoverable, professional account-deletion flow in Account Security using `DELETE /account/my-account`, then reliably remove local credentials/security state/cache and return to unauthenticated navigation.

**Architecture:** The account API performs the authenticated DELETE. AuthContext owns local auth/org/query finalization but never imports AppLock. AppLock exposes local security cleanup without logout. `AccountSecurityScreen` orchestrates destructive confirmation, shared sensitive re-auth when PIN exists, DELETE, and cleanup.

---

## Prerequisite: Finish shared sensitive-action re-auth

Implement the already approved production-hardening security amendment before wiring deletion:

- `src/modules/pin-auth/components/SensitiveActionReauthModal.tsx`
- reusable sensitive-action authorization flow using existing PIN attempt/logout semantics,
- PIN removal and biometric settings migrated to it.

Do not create a deletion-specific PIN modal or parallel attempt counter.

---

## Task 1: Add delete-account API

**Files:**
- Modify: `src/services/authApi.ts`
- Modify: `src/modules/account/services/accountService.ts`
- Create: `scripts/check-account-delete-api.cjs`

**RED:** VM contract check calls `deleteMyAccount()` and asserts exactly one authenticated `DELETE /account/my-account`; no body/response body is assumed.

**GREEN:** Add `deleteMyAccount(): Promise<void>` and re-export it through account service.

Do not add this route to the public-auth route matcher: it is an authenticated account operation and may use normal refresh behavior on a genuine expired access token.

**Verify:** `npm run check && npm run typecheck`.

**Commit:** `feat: add account deletion API`

---

## Task 2: Add local PIN/security cleanup without logout

**Files:**
- Modify: `src/modules/pin-auth/context/AppLockContext.tsx`
- Modify: `src/modules/pin-auth/services/pinStorageFactory.ts` if a single helper improves atomic cleanup
- Modify/add standalone tests for pin storage/context contract

Expose an AppLock operation such as:

```ts
clearLocalSecurity(): Promise<void>
```

It must clear for the current user:
- PIN record,
- biometric preference,
- PIN setup state,
- in-memory PIN/biometric/lock state.

It must NOT call `logout()` and must NOT make network requests.

**RED:** Test local storage cleanup covers all per-user security keys and preserves other users.

**GREEN:** Implement minimal cleanup and context state reset.

**Verify:** `npm test && npm run typecheck`.

**Commit:** `feat: clear local app-lock state without logout`

---

## Task 3: Add explicit AuthContext post-delete finalization

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Create: `scripts/check-account-delete-finalization.cjs`

Expose:

```ts
finalizeDeletedAccount(): Promise<void>
```

Behavior:
1. clear auth SecureStore session,
2. clear all React Query user/business cache with `queryClient.clear()`,
3. reset organization selector refs/return tab,
4. set `currentOrganization = null`,
5. set `organizations = []`,
6. set `user = null`.

This function does not call `/account/logout` and does not call `deleteMyAccount`; it is local finalization only.

**RED:** Static/VM check proves normal `logoutAccount` is not invoked from finalization and query cache is cleared.

**GREEN:** Implement explicit callback and expose it through context.

**Verify:** `npm run typecheck && npm run check`.

**Commit:** `feat: finalize deleted account locally`

---

## Task 4: Add Danger Zone UI and deletion orchestration

**Files:**
- Modify: `src/screens/AccountSecurityScreen.tsx`
- Modify: `src/i18n/translations/uz.ts`
- Modify: `src/i18n/translations/ru.ts`
- Modify: `scripts/check-i18n.cjs`
- Create: `scripts/check-account-deletion-ui.cjs`

Add a bottom `Danger Zone` section with destructive `Delete account` row and explanatory text.

Flow:
1. first destructive confirmation explains loss of access and that the action cannot be undone from the app,
2. if local PIN security exists, run the shared sensitive-action re-auth; if no PIN exists, continue without blocking deletion,
3. final confirmation,
4. set deletion loading/disable duplicate actions,
5. call `deleteMyAccount()`,
6. after server success, attempt `clearLocalSecurity()`,
7. in a `finally` around local-security cleanup, call `finalizeDeletedAccount()` so local auth is removed even if PIN cleanup encounters a local storage error,
8. unauthenticated navigator naturally shows Login.

If server DELETE fails, do not clear local session/PIN/cache and show localized API error.

Cancellation at either confirmation or re-auth is neutral.

**RED:** Static check proves DELETE occurs before finalization and `logout()`/`logoutAccount()` are not part of the success path.

**Verify:** `npm run verify`.

**Commit:** `feat: add in-app account deletion`

---

## Task 5: Offline and regression checkpoint

Verify:
- offline DELETE is blocked by centralized write guard and never replayed,
- failed backend DELETE leaves the user signed in,
- success returns directly to Login,
- no cached client/debt/report data remains after success,
- no server logout request occurs after success,
- account deletion remains accessible when PIN is not configured,
- existing logout remains unchanged.

---

## Backend release blockers (not frontend-invented)

Before App Store release, backend owners must confirm:
- archive behavior actually deletes/anonymizes personal data or retains only documented required data,
- Sign in with Apple authorization/token revocation is handled for Apple-authenticated accounts.

Do not add unsupported frontend fields/endpoints to simulate these backend responsibilities.
