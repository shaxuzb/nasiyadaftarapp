# Backend App Version Check Implementation Plan

> **For implementation:** Execute this plan in order. Use strict RED → GREEN → REFACTOR. Do not change `main`.

**Goal:** Move app-update checks from GitHub Raw JSON to the backend `/app-versions/check` endpoint while using only semantic app version (`expo.version` / native application version), preserving the existing update bottom-sheet UX.

**Architecture:** Keep update checks auth-independent and fail-open. A small fetch service uses `API_BASE_URL`, validates a single-platform response, and returns backend flags as authoritative state. `useAppUpdate` keeps its startup/foreground throttle, dismissal storage, and store-opening behavior.

**Tech:** Expo 55, React Native, expo-application, expo-constants, TypeScript, Node standalone tests.

---

## Task 1: Fix runtime API base URL selection

**Files:**
- Create: `src/config/apiBaseUrl.ts`
- Create: `src/config/apiBaseUrl.test.ts`
- Modify: `src/config/env.ts`

**RED:** Add a standalone test proving a valid configured HTTP(S) URL wins over fallback, blank/invalid values use fallback, and trailing slash removal happens at the exported boundary. Run `npm test` and confirm the new test fails because the resolver does not exist.

**GREEN:** Implement a pure `resolveApiBaseUrl(configured, fallback)` helper and use it from `env.ts`. Preserve development validation behavior. Do not alter Google config.

**Verify:** `npm run typecheck && npm test`.

**Commit:** `fix: honor configured API base URL`

---

## Task 2: Define and validate backend update response

**Files:**
- Modify: `src/modules/app-update/types/appUpdate.types.ts`
- Create: `src/modules/app-update/utils/appVersionResponse.ts`
- Create: `src/modules/app-update/utils/appVersionResponse.test.ts`

**RED:** Test a valid Android payload; reject wrong platform, malformed semantic versions, non-boolean flags, blank title/message, non-HTTPS store URL, and `latestVersion < minimumVersion`. Test that `updateRequired=true` is retained even when `updateAvailable=false`.

**GREEN:** Add `AppVersionCheckResponse` and a pure parser `parseAppVersionCheckResponse(value, expectedPlatform)`. Keep `PlatformUpdateConfig` only as the presentation shape needed by the existing bottom sheet. No local availability calculation from build number/versionCode.

**Verify:** `npm test`.

**Commit:** `test: define app version response contract`

---

## Task 3: Migrate update fetch to backend

**Files:**
- Modify: `src/modules/app-update/constants/appUpdate.constants.ts`
- Modify: `src/modules/app-update/services/appUpdateService.ts`
- Create: `scripts/check-app-version-service.cjs`

**RED:** Contract check must prove the service constructs `/app-versions/check?platform=<encoded>&currentVersion=<encoded>` from `API_BASE_URL`, sends GET with JSON accept header, uses the existing 8s abort timeout, parses through the new parser, and contains no GitHub Raw URL dependency.

**GREEN:** Remove `APP_VERSION_CONFIG_URL`. Expose `fetchAppVersionCheck(platform, currentVersion)`. Use `fetch(`${API_BASE_URL}/app-versions/check?...`)`. Do not use `apiClient` or auth refresh. Non-2xx throws to the hook; malformed payload returns `null` or throws a controlled validation error that the hook catches. Always clear timeout.

**Verify:** `npm run check`.

**Commit:** `feat: check app version through backend`

---

## Task 4: Make backend flags authoritative in the hook

**Files:**
- Modify: `src/modules/app-update/hooks/useAppUpdate.ts`
- Modify: `src/modules/app-update/utils/compareVersions.ts` only if dead runtime availability logic can be safely removed
- Add/modify standalone pure tests as needed

**RED:** Cover mapping behavior:
- neither flag → no sheet,
- `updateAvailable=true` → optional sheet,
- `updateRequired=true` → forced sheet even if `updateAvailable=false`,
- dismissed optional latest version stays hidden,
- required update ignores dismissal.

**GREEN:** Pass the current semantic app version into `fetchAppVersionCheck`. Set `isForced = response.updateRequired`; show update when `response.updateAvailable || response.updateRequired`. Map response title/message/store/latest/minimum/forceUpdate into the existing `PlatformUpdateConfig`. Keep startup and 15-minute foreground throttle. Keep fail-open catch behavior.

**Verify:** `npm run typecheck && npm test`.

**Commit:** `feat: use backend update availability flags`

---

## Task 5: Switch EAS app version source to local

**Files:**
- Modify: `eas.json`
- Create: `scripts/check-local-app-version.cjs`

**RED:** Contract check must assert `cli.appVersionSource === "local"`, `app.json.expo.version` is a valid semantic version, and the app-update source does not reference `android.versionCode` or `ios.buildNumber`.

**GREEN:** Change only `appVersionSource` from `remote` to `local`. Do not modify `expo.version`, `versionCode`, `buildNumber`, or `production.autoIncrement` as part of this feature.

**Verify:** `npm run check`.

**Commit:** `chore: source app version locally`

---

## Task 6: Full checkpoint

Run locally:

```bash
npm run verify
```

Expected: typecheck, standalone unit tests, and contract checks all pass. Manually confirm an API payload with `currentVersion > latestVersion` and both update flags false produces no update UI; optional and required flags render the existing sheet correctly.

Do not proceed to Apple Auth until this checkpoint is green.
