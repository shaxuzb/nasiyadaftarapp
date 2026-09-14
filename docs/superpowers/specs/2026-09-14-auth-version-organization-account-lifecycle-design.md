# Auth, Version, Organization, and Account Lifecycle Design

Date: 2026-09-14
Branch: `feat/mobile-production-hardening`
Status: Awaiting written-spec approval

## Context

This specification extends the existing mobile production hardening work with four newly available backend capabilities:

1. backend-driven app-version checks,
2. native Sign in with Apple,
3. current-organization profile editing,
4. in-app account deletion.

The implementation must preserve the existing Google login flow, auth/session model, organization isolation, PIN/app-lock model, update bottom-sheet UX, and current visual language.

No work is performed on `main`.

## Goals

- Make `app.json` the repository source of truth for the user-facing app version.
- Replace the GitHub Raw app-version config with the backend app-version endpoint.
- Add native Apple authentication on iOS without changing Google authentication behavior.
- Add a professional current-organization edit flow to Profile/Settings.
- Add an easily discoverable account-deletion flow suitable for App Store review.
- Reuse existing auth/session, query, bottom-sheet, error, offline, and security infrastructure rather than create parallel systems.
- Avoid inventing unspecified backend contracts.

## Non-goals

- Do not redesign Login, Register, Settings, or Account Security from scratch.
- Do not change Google authentication behavior.
- Do not add Apple login to Android.
- Do not add an offline write queue.
- Do not infer native build numbers or App Store identifiers that are not present in the repository/backend.
- Do not treat account archival as equivalent to compliant deletion unless backend retention semantics are confirmed.

---

# 1. Local app versioning and backend update checks

## Build configuration

Change EAS CLI configuration to:

```json
{
  "cli": {
    "appVersionSource": "local"
  }
}
```

The user-facing application version comes from `app.json -> expo.version`.

Native store build counters remain separate concerns:

- Android: `android.versionCode`
- iOS: `ios.buildNumber`

The implementation must not invent a new `versionCode` or `buildNumber`. They are updated only when the actual next store build number is known.

Existing `production.autoIncrement` behavior must be reviewed during implementation. If it conflicts with deterministic local version ownership, remove it; otherwise retain it only for native build counters, never as a replacement for `expo.version`.

## API base URL bug

Before migrating version checks, fix the existing runtime-config bug where both branches of the API URL selection currently resolve to the fallback URL.

Expected behavior:

```ts
const apiBaseUrl = isHttpUrl(configuredApiBaseUrl)
  ? configuredApiBaseUrl
  : fallbackApiBaseUrl;
```

Because the configured base URL already ends in `/api`, the frontend endpoint path is:

```text
/app-versions/check
```

not `/api/app-versions/check`.

## Update request

On app startup and the existing throttled foreground checks, request:

```http
GET /app-versions/check?platform=android&currentVersion=<native-version>
```

or:

```http
GET /app-versions/check?platform=ios&currentVersion=<native-version>
```

Use `Application.nativeApplicationVersion` as the primary current version and `Constants.expoConfig?.version` as the existing fallback.

The update check remains public and independent of authentication. Prefer a small fetch-based service using `API_BASE_URL`, the existing 8-second timeout, and fail-open behavior rather than routing the request through token refresh/logout logic.

## Response model

```ts
interface AppVersionCheckResponse {
  platform: "android" | "ios";
  currentVersion: string;
  latestVersion: string;
  minimumVersion: string;
  updateAvailable: boolean;
  updateRequired: boolean;
  forceUpdate: boolean;
  title: string;
  message: string;
  storeUrl: string;
}
```

Validation requirements:

- `platform` must match the requested platform.
- `currentVersion`, `latestVersion`, and `minimumVersion` must be valid semantic versions.
- update flags must be booleans.
- title/message must be non-empty strings.
- `storeUrl` must be HTTPS.
- Reject malformed payloads without blocking app startup.

## Update behavior

Backend flags are authoritative:

```text
show update UI = updateAvailable || updateRequired
forced UI      = updateRequired
```

`updateRequired` is the only frontend source of truth for whether the user may dismiss the update.

`forceUpdate` is parsed and retained in the response model but does not gain additional frontend behavior until its backend semantic difference from `updateRequired` is explicitly defined.

The existing `AppUpdateBottomSheet` is retained.

- Optional update: user can choose Later.
- Required update: back, backdrop dismiss, and pan-down remain blocked.
- Update action opens the backend-provided `storeUrl`.
- Existing Android native-market deep-link may be attempted first, with HTTPS `storeUrl` fallback.

The old GitHub Raw version-config constant/file dependency becomes unused and should be removed from runtime update logic.

---

# 2. Native Sign in with Apple

## Native capability

Install the Expo-compatible `expo-apple-authentication` package through Expo's dependency resolver so `package.json` and `package-lock.json` remain consistent.

Configure iOS with:

```json
{
  "ios": {
    "usesAppleSignIn": true
  }
}
```

and add the Apple authentication config plugin as required by the installed Expo SDK.

A new iOS native build is required after adding this capability.

## Platform behavior

Apple authentication is rendered only on iOS.

Login/Register social actions become:

```text
iOS:
  Sign in with Apple
  Continue with Google

Android:
  Continue with Google
```

Use the official native Apple authentication button rather than a custom imitation.

## Apple credential request

Request:

- `FULL_NAME`
- `EMAIL`

The native service returns a normalized result:

```ts
interface NativeAppleCredential {
  identityToken: string;
  email: string | null;
  fullName: string | null;
}
```

`identityToken` is mandatory. If absent, authentication fails locally and no backend request is sent.

`fullName` should use the platform's locale-aware Apple full-name formatter rather than manual first/last-name concatenation when available.

## Backend request

```http
POST /account/apple
```

Conceptual payload:

```ts
interface AppleLoginRequest {
  identityToken: string;
  email?: string | null;
  fullName?: string | null;
}
```

The endpoint returns the same authentication shape as Google:

```ts
AuthResponse = {
  token,
  refreshToken,
  user
}
```

The response flows through the existing `completeAuth()` pipeline:

```text
Apple native credential
  -> POST /account/apple
  -> completeAuth()
  -> SecureStore session
  -> organization resolution
  -> subscription sync
```

No duplicate Apple-specific session store is created.

## Critical backend contract requirement

Apple may return `email` and `fullName` only on the first authorization. Subsequent sign-ins can legitimately contain `null` for those fields.

Therefore the backend `/account/apple` contract must accept missing/null `email` and `fullName` for existing Apple identities and authenticate using the validated Apple identity/token rather than requiring profile fields on every login.

Frontend implementation must not invent placeholder email/name values to satisfy a stricter backend schema.

If backend currently requires non-null values every time, Apple login is not production-ready until that contract is corrected.

## Auth error handling

Create Apple-specific error mapping for:

- user cancellation,
- missing identity token,
- unsupported platform/capability,
- native authentication failure,
- backend authentication error.

Cancellation should not be presented as a scary generic error; use neutral localized copy.

The axios account-route matcher must recognize `/account/apple` as a public authentication route so a 401 response cannot trigger access-token refresh/logout recursion.

---

# 3. Current organization profile editing

## API contract

Add:

```http
PUT /organizations/current
```

Request:

```ts
interface UpdateCurrentOrganizationRequest {
  name: string;
  address: string;
}
```

Do not reuse `OrganizationRequest`, because create currently requires fields that update does not (`note`).

The response body is unspecified. Do not assume the PUT returns the updated organization.

## Canonical refresh after update

On successful 2xx PUT:

1. fetch the current organization from `GET /organizations/current`,
2. update `currentOrganization`,
3. merge the same organization into `organizations[]`,
4. update `user.organizationName`,
5. persist the updated user/session,
6. invalidate only account/organization views that actually depend on organization metadata.

Do not clear clients, transactions, or reports merely because the organization name/address changed; organization ID remains the same.

If `GET /organizations/current` fails after a successful PUT, keep the previous local state and surface a recoverable refresh error rather than inventing server-returned values.

## Profile UX

The organization area in Settings should no longer overload a single row with both profile and organization-switch semantics.

Target structure:

```text
Organization
  Current organization summary
    name
    address (when present)

  Edit organization information
  Switch organization
  Blacklist settings
```

The edit action opens a keyboard-aware bottom sheet consistent with the existing organization-create sheet.

Fields:

- Name — required, trimmed.
- Address — optional unless backend validation says otherwise; send trimmed string.

Actions:

- Save
- Cancel

UX rules:

- pre-fill from `currentOrganization`,
- disable duplicate submits,
- show inline validation for missing name,
- show loading state on Save,
- dismiss only after successful update + canonical refresh,
- preserve entered values after recoverable API failure,
- show localized success/error toast.

Do not add note editing because the new update endpoint does not include `note`.

---

# 4. In-app account deletion

## API contract

```http
DELETE /account/my-account
```

A successful 2xx response is sufficient for frontend completion; no response body shape is assumed.

## Discoverability and UI placement

Place account deletion in:

```text
Profile
  -> Account Security
      -> Danger Zone
          -> Delete account
```

This keeps the destructive action easy to find without mixing it with ordinary profile rows.

The row uses clear destructive styling and explicit text. Do not label the user-facing action as merely "Archive" or "Deactivate".

## Confirmation flow

Recommended flow:

```text
Delete account
  -> explanatory destructive confirmation
  -> sensitive re-auth when local PIN security is enabled
  -> final confirm
  -> DELETE /account/my-account
  -> local cleanup
  -> Login screen
```

If PIN/app-lock is configured, reuse the shared sensitive-action re-auth flow planned by the production-hardening security work. Do not build an independent deletion-only PIN implementation.

If no local PIN is configured, the destructive confirmation remains available so account deletion is not blocked by an optional local-security feature.

Do not call the normal `/account/logout` endpoint after successful deletion.

## Local cleanup after successful deletion

After the backend returns success:

1. clear per-user PIN/biometric secure-storage records,
2. clear auth/session tokens from SecureStore,
3. clear organization selection state,
4. clear React Query caches (`queryClient.clear()` or equivalent complete user-data cleanup),
5. reset in-memory `user`, `organizations`, and `currentOrganization`,
6. return to the unauthenticated navigator/Login screen.

Cleanup should be exposed as an explicit local account-finalization operation rather than indirectly calling `logout()` and creating an unnecessary server request.

If the DELETE request fails, do not clear local data and do not sign the user out.

Offline behavior follows the existing global mutation guard: deletion is unavailable offline and must never be queued for later replay.

## Critical backend compliance requirement

The backend description currently says the account is archived and data is not deleted.

For App Store account-deletion compliance, frontend wording and UI cannot compensate for a backend that only disables login while retaining all personal data indefinitely.

Before release, backend behavior must be confirmed as one of:

- deleting personal account data,
- anonymizing personal account data,
- retaining only data that has a documented legal/business retention requirement while removing unnecessary personal data.

If backend merely marks the account archived and preserves all personal data without a valid retention basis, treat App Store compliance as unresolved.

## Sign in with Apple revocation requirement

Once Apple authentication exists, backend account deletion must also address Apple authorization/token revocation where required.

The current `/account/apple` request contract contains only `identityToken`, `email`, and `fullName`; frontend must not invent an `authorizationCode` field or a separate revocation endpoint.

Backend owners must confirm how Apple authorization is stored/revoked during account deletion. This is a release blocker for the Apple-authenticated deletion path, not a reason to fabricate an unsupported frontend request.

---

# 5. Auth/session architecture changes

## Auth types

Add:

```ts
interface AppleLoginRequest {
  identityToken: string;
  email?: string | null;
  fullName?: string | null;
}
```

Extend AuthContext with:

```ts
loginWithAppleCredential(payload: AppleLoginRequest): Promise<void>
updateCurrentOrganizationProfile(payload: UpdateCurrentOrganizationRequest): Promise<void>
deleteCurrentAccount(): Promise<void>
```

Keep `loginWithGoogleIdToken` unchanged.

## Services

Add or extend services so boundaries remain:

```text
screens/components
  -> AuthContext / feature hook
  -> module service
  -> apiClient/fetch
```

Expected service additions:

- auth: `appleAccount(payload)`
- account: `deleteMyAccount()`
- organization: `updateCurrentOrganization(payload)`
- app-update: `checkAppVersion(platform, currentVersion)`

No screen should construct raw endpoint URLs directly.

---

# 6. Error handling and network behavior

- Apple auth native cancellation is handled locally and does not trigger backend traffic.
- App-version check failure remains fail-open and does not block launch.
- Organization update and account deletion are writes; the existing centralized offline mutation guard blocks them immediately.
- Account deletion is never queued or replayed.
- Organization edit retains form values after failed save.
- Backend validation/error copy goes through the existing localized API error translator.
- No auth token should be logged.

---

# 7. Testing strategy

Use the existing TDD + `npm run verify` workflow.

## App update tests

Cover:

- request URL platform/currentVersion encoding,
- valid response parsing,
- malformed response rejection,
- `updateAvailable=true` optional update,
- `updateRequired=true` forced update,
- contradictory flags where `updateRequired=true` still forces UI,
- fail-open network error,
- HTTPS store URL validation.

## Apple auth tests

Cover pure/native-service behavior where feasible:

- missing identity token rejected before API request,
- email/fullName may be null,
- payload maps correctly,
- backend AuthResponse uses existing complete-auth pipeline,
- public auth route matcher includes Apple,
- Login/Register Apple action is iOS-only.

Native Apple UI itself requires iOS device/build verification.

## Organization edit tests

Cover:

- PUT endpoint and exact payload,
- name trim/validation,
- no `note` field sent,
- successful PUT followed by canonical current-organization refresh,
- AuthContext state/session merge,
- organization ID remains stable,
- unrelated business query caches are not cleared.

## Account deletion tests

Cover:

- exact DELETE endpoint,
- failed DELETE preserves local session/cache,
- successful DELETE clears auth state and query cache,
- successful delete does not call normal logout endpoint,
- per-user PIN data cleanup path,
- offline mutation guard blocks deletion,
- destructive action remains accessible when no PIN exists.

## Verification commands

```bash
npm run verify
npm run doctor
npm run audit:production
```

For release candidate verification also test:

- iOS real-device Apple login first authorization,
- iOS Apple login subsequent authorization with absent profile fields,
- Apple-authenticated account deletion,
- Android Google login regression,
- organization edit on both platforms,
- optional and forced update UI on both platforms.

---

# 8. Implementation order

1. Restore/confirm current branch verification baseline.
2. Fix `API_BASE_URL` runtime-config selection bug.
3. Change EAS version source to local without inventing native build counters.
4. Migrate app-update service to backend endpoint and keep existing update UI.
5. Add Apple native dependency/config through Expo-compatible install.
6. Add Apple native credential service and backend auth service.
7. Route Apple AuthResponse through existing AuthContext complete-auth pipeline.
8. Add iOS Apple buttons to Login and Register.
9. Add organization update type/service/context state synchronization.
10. Add organization profile edit bottom sheet and Settings UX split.
11. Add account-delete API service.
12. Add explicit local post-delete cleanup operation.
13. Reuse sensitive-action re-auth for account deletion where PIN exists.
14. Add Account Security Danger Zone UI.
15. Run full verification and platform regression checks.

---

# 9. Release blockers / backend confirmations

These are not frontend details to guess:

1. `/account/apple` must accept missing/null `email` and `fullName` on subsequent Apple sign-ins.
2. Account deletion must satisfy real deletion/anonymization/legal-retention semantics; simple indefinite archival is not sufficient for release confidence.
3. Backend must define/implement the Sign in with Apple authorization revocation strategy used when an Apple-authenticated account is deleted.
4. The iOS `storeUrl` returned by the version endpoint must be the real App Store application URL before production release.
5. The semantic distinction, if any, between backend `forceUpdate` and `updateRequired` must be documented before `forceUpdate` receives independent frontend behavior.

Frontend implementation may proceed for all behavior that is fully defined above, but release is blocked where these server contracts remain unresolved.

---

# Definition of Done

- EAS version source is local and `expo.version` is the user-facing version source of truth.
- No native store build counter is invented.
- API runtime base URL honors a valid configured `EXPO_PUBLIC_API_BASE_URL`.
- Update checks use `/app-versions/check` and no longer depend on GitHub Raw config at runtime.
- Optional/required update UX is driven by backend flags.
- Apple login/register exists on iOS only, uses native Apple authentication, and reuses `completeAuth()`.
- Google auth remains unchanged.
- Organization name/address can be edited from Settings with canonical server refresh and polished bottom-sheet UX.
- Account deletion is easily discoverable under Account Security, uses destructive confirmation, and performs complete local cleanup only after backend success.
- Successful account deletion never calls normal logout.
- Offline account deletion/update writes are blocked and never replayed.
- Tests cover the new service/state contracts.
- `npm run verify` is green.
- release-only backend blockers are explicitly resolved before App Store submission.
