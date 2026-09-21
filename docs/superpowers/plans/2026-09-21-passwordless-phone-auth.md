# Passwordless Phone Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace password-based mobile login/register with phone OTP authentication and route the authenticated user by `hasOrganization`.

**Architecture:** Keep one centralized `AuthContext.completeAuth` path. Add phone OTP request/confirm services, share one phone entry and verification flow between login/register routes, and use the existing PIN/organization bootstrapping after the auth response is stored.

**Tech Stack:** Expo SDK 55, React Native 0.83, React Navigation, Axios, SecureStore, existing `OtpInput` and `useOtpAutoFill`.

**Spec:** `docs/superpowers/specs/2026-09-21-passwordless-phone-auth-design.md`

## Global Constraints

- Do not collect or send passwords in the phone auth flow.
- Use `user.hasOrganization` as the canonical organization-entry signal.
- Preserve Google/Apple sign-in; Apple is iOS-only.
- Preserve existing PIN, refresh-token, subscription, and organization resolution flows.
- Do not guess the unknown Google/Apple profile-update response.
- Do not install or upgrade packages.

## Review Focus

- A new phone user with `fullName: null` must reach organization setup without crashing PIN metadata.
- An existing phone user with `hasOrganization: true` must reach the current organization/main flow.
- OTP resend must use the server's `expiresInSeconds` value and re-arm Android SMS Consent before requesting a code.
- iOS must keep the native one-time-code input and manual fallback; no SMS-read permission is assumed.
- A failed OTP request/confirm must leave the user on the auth flow and show the localized API error.

### Task 1: Phone auth contracts and route classification

**Files:**
- Modify: `src/modules/auth/types/index.ts`
- Modify: `src/services/authApi.ts`
- Modify: `src/services/accountRoute.ts`
- Modify: `src/services/accountRoute.test.ts`
- Test: `src/modules/auth/utils/phoneAuth.test.ts`

**Interfaces:**
- Produce `PhoneAuthRequestResponse` with `maskedPhone` and `expiresInSeconds`.
- Produce `requestPhoneAuthCode({ phoneNumber })` and `confirmPhoneAuth({ phoneNumber, code })`.
- Extend `AuthUser` with nullable `fullName` and provider metadata.

- [ ] Write failing tests for phone request/confirm payload contracts and public route matching.
- [ ] Run the targeted tests and confirm they fail because the new service/types are absent.
- [ ] Implement the service methods and types using `/account/phone/request` and `/account/phone/confirm`.
- [ ] Add both phone routes to the public account route set without making profile routes public.
- [ ] Run targeted tests and then the full unit suite.

### Task 2: AuthContext phone confirmation and nullable user metadata

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/modules/pin-auth/context/AppLockContext.tsx`
- Modify: `src/modules/pin-auth/utils/appLockController.ts` if type normalization requires it
- Test: `src/navigation/appNavigatorState.test.ts` or a focused auth utility test

**Interfaces:**
- Add `loginWithPhoneCode(phoneNumber, code): Promise<void>` to the auth context.
- Reuse `completeAuth(AuthResponse)` so token/refreshToken replacement remains centralized.

- [ ] Add a failing test for `fullName: null` normalization at the PIN metadata boundary.
- [ ] Run the test and confirm the nullable value is rejected by the current path.
- [ ] Add a stable fallback display name and the phone-confirm context method.
- [ ] Verify the auth context stores both returned tokens through the existing session path.

### Task 3: Shared phone entry and OTP verification screens

**Files:**
- Create: `src/screens/PhoneAuthScreen.tsx`
- Create: `src/screens/PhoneAuthVerifyScreen.tsx`
- Modify: `src/navigation/index.tsx`
- Modify: `src/types/index.ts`
- Modify: `src/i18n/translations/uz.ts`
- Modify: `src/i18n/translations/ru.ts`
- Remove or deprecate from navigation: `src/screens/PasswordResetRequestScreen.tsx`, `src/screens/PasswordResetConfirmScreen.tsx` only after no route references remain

**Interfaces:**
- `PhoneAuthScreen` accepts `mode: "login" | "register"`, social callbacks, and navigation callbacks.
- `PhoneAuthVerifyScreen` accepts `{ phoneNumber, mode }`, requests/resends via the new service, and confirms through `loginWithPhoneCode`.

- [ ] Add a failing contract test for the phone verification route params and six-digit confirmation guard.
- [ ] Run the test and confirm the new route/component contract is missing.
- [ ] Implement phone-only entry UI using existing `AppInput`, `PrimaryButton`, `OtpInput`, `useOtpAutoFill`, and design tokens.
- [ ] Use `maskedPhone` and `expiresInSeconds` from the request response.
- [ ] Update login/register navigation to use the shared flow and remove password/forgot-password controls.
- [ ] Keep Apple visible only on iOS and send only `identityToken`; keep Google sending only `idToken`.
- [ ] Run typecheck and auth/navigation tests.

### Task 4: Organization routing by backend state

**Files:**
- Modify: `src/navigation/index.tsx`
- Modify: `src/context/AuthContext.tsx` only where the canonical `hasOrganization` value is overwritten
- Test: `src/navigation/appNavigatorState.test.ts`

- [ ] Add failing tests for `hasOrganization: false` selecting setup and `hasOrganization: true` selecting organization/main flow.
- [ ] Implement navigation decisions from the authenticated user state, not the auth screen mode.
- [ ] Preserve organization selection return-tab and PIN overlay behavior.
- [ ] Run the focused tests and full suite.

### Task 5: Remove password-based auth surface from the active app

**Files:**
- Modify: `src/screens/AccountSecurityScreen.tsx`
- Modify: `src/bottom-sheet/registry.ts`
- Modify: `src/bottom-sheet/types.ts`
- Modify: `src/modules/account/services/accountService.ts`
- Modify: `src/services/authApi.ts`
- Modify: `src/i18n/translations/uz.ts`
- Modify: `src/i18n/translations/ru.ts`

- [ ] Add a contract check proving no active navigation path points to password reset screens or password-change UI.
- [ ] Remove only obsolete active UI/API references; leave unrelated provider-link work for the next contract-driven phase.
- [ ] Run typecheck, unit tests, i18n checks, and the app contract checks.
