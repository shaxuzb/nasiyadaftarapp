# Native Apple Authentication Implementation Plan

> **For implementation:** Execute only after the backend app-version checkpoint is green. Use strict RED → GREEN → REFACTOR.

**Goal:** Add native Sign in with Apple on iOS for Login and Register, routing the backend response through the existing auth/session pipeline without changing Google login.

**Architecture:** Native Apple credential acquisition is isolated in `appleSignInService.ts`. Backend exchange lives in the existing auth API/service layer. `AuthContext.completeAuth()` remains the single session bootstrap path. UI uses the official Apple button on iOS only.

---

## Task 1: Install/configure native Apple capability

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json`

Use `npx expo install expo-apple-authentication` locally so Expo chooses the SDK-compatible version and lockfile is generated rather than hand-edited.

Configure `ios.usesAppleSignIn = true` and add `expo-apple-authentication` to plugins if required by the installed package/SDK docs.

**Verify:** `npx expo config --type public` and `npm run doctor`.

**Commit:** `chore: configure native Apple sign in`

---

## Task 2: Define Apple auth types and backend endpoint

**Files:**
- Modify: `src/modules/auth/types/index.ts`
- Modify: `src/services/authApi.ts`
- Create: `scripts/check-apple-auth-api.cjs`

Add:

```ts
export interface AppleLoginRequest {
  identityToken: string;
  email?: string | null;
  fullName?: string | null;
}
```

**RED:** Contract check loads `authApi.ts` with a fake `apiClient`, calls `appleAccount`, and asserts exactly one POST to `/account/apple` with the exact payload and unchanged response object.

**GREEN:** Add `appleAccount(payload): Promise<AuthResponse>`.

**Verify:** `npm run check`.

**Commit:** `feat: add Apple auth API exchange`

---

## Task 3: Add native Apple credential service

**Files:**
- Create: `src/modules/auth/services/appleSignInService.ts`
- Create: `src/modules/auth/services/appleCredential.ts`
- Create: `src/modules/auth/services/appleCredential.test.ts`

Separate pure normalization from native calls so behavior is testable without iOS runtime.

Pure contract:

```ts
interface NativeAppleCredential {
  identityToken: string;
  email: string | null;
  fullName: string | null;
}
```

**RED:** Test missing/blank identity token rejection; email/fullName may be null; whitespace is trimmed; no placeholder values are generated.

**GREEN:** Native service calls `AppleAuthentication.signInAsync` requesting `FULL_NAME` and `EMAIL`, formats full name through Apple/Expo formatter when available, then normalizes through the pure helper. Export a typed cancellation/error-key mapper.

Cancellation maps to neutral `auth.appleErrors.cancelled`; missing token maps to `tokenMissing`; unsupported/non-iOS maps to `unavailable`; other native errors map to `unexpected`.

**Verify:** `npm run typecheck && npm test`.

**Commit:** `feat: add native Apple credential service`

---

## Task 4: Route Apple response through AuthContext

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Create/modify contract check for auth social pipeline

Add `loginWithAppleCredential(payload: AppleLoginRequest): Promise<void>` to `AuthContextValue`. Implementation calls `appleAccount(payload)` then existing `completeAuth(response)`; no separate SecureStore/session logic.

**RED:** Static/VM contract check must prove Apple method calls the Apple API and existing complete-auth path, while `loginWithGoogleIdToken` remains present and unchanged in intent.

**GREEN:** Add imports, callback, context value, dependencies.

**Verify:** `npm run typecheck && npm run check`.

**Commit:** `feat: integrate Apple auth session flow`

---

## Task 5: Mark Apple route as public auth endpoint

**Files:**
- Refactor: `src/services/axiosService.ts`
- Create: `src/services/accountRoute.ts`
- Create: `src/services/accountRoute.test.ts`

**RED:** Test exact/normalized matching for login/register/google/apple/refresh/logout and reject unrelated paths such as `/account/google-change/request` or `/foo/account/apple-extra`.

**GREEN:** Replace broad `includes` matcher with a pure exact pathname matcher. Add `/account/apple`. Preserve support for absolute URLs and optional `/api` prefix.

**Verify:** `npm test && npm run typecheck`.

**Commit:** `fix: match public account routes exactly`

---

## Task 6: Add iOS Apple actions to Login and Register

**Files:**
- Modify: `src/screens/LoginScreen.tsx`
- Modify: `src/screens/RegisterScreen.tsx`
- Modify: `src/i18n/translations/uz.ts`
- Modify: `src/i18n/translations/ru.ts`
- Modify: `scripts/check-i18n.cjs`
- Create: `scripts/check-apple-auth-ui.cjs`

UI rules:
- render official `AppleAuthenticationButton` only when `Platform.OS === "ios"` and capability is available,
- keep Google button unchanged,
- Apple has independent loading state,
- disable duplicate Apple taps while pending,
- show localized neutral cancellation and localized backend/native errors,
- successful Login/Register both call the same `loginWithAppleCredential` method.

Add UZ/RU copy for Apple signing in, Apple success, and error keys.

**RED:** Static check proves Apple button is platform-gated in both screens and both handlers call the Apple credential service + AuthContext method.

**Verify:** `npm run verify`.

**Commit:** `feat: add Apple sign in to auth screens`

---

## Task 7: Native checkpoint

Requires a new iOS native build. Verify on a real iOS device:
- first authorization with email/name returned,
- later authorization where email/name are absent,
- cancellation,
- successful backend session and organization resolution,
- Google login still works on iOS and Android.

If backend rejects null email/fullName on subsequent login, stop release and fix backend contract rather than fabricate frontend values.
