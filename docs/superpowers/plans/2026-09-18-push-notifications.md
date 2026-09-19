# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated Firebase FCM push notifications for Android and iOS, an in-app notification inbox, unread badges, foreground/tap handling, and Profile notification settings.

**Architecture:** Use native Firebase Messaging in the existing Expo custom development-client workflow. Keep the existing persistent auth `uniqueId` as the backend `installationId`, isolate push API/query/registration logic under `src/modules/push`, and expose notification navigation through the existing native stack rather than adding a fifth bottom tab.

**Tech Stack:** Expo SDK 55, React Native 0.83, `@react-native-firebase/app`, `@react-native-firebase/messaging`, Axios service, TanStack Query v5, React Navigation native stack, existing theme/i18n/Toast patterns.

**Spec:** `docs/superpowers/specs/2026-09-18-push-notifications-design.md`

## Global Constraints

- Backend device registration uses `PUT /push/devices` with `{ installationId, platform, token }`.
- Backend device removal uses `DELETE /push/devices/{installationId}` and must be best-effort during logout.
- Backend notification APIs are `/push/notifications`, `/push/notifications/unread-count`, and `/push/notifications/{id}/read`.
- The current persistent `uniqueId` is reused as `installationId`; do not create a second device identifier unless backend rejects its non-UUID format.
- APNs `.p8` and Firebase service-account private keys never enter the mobile repository or bundle.
- The supplied `google-services.json` and `GoogleService-Info.plist` must match `com.rbsx.nasiyadaftarapp` and must be added without changing their contents.
- Push registration failures never block login, startup, navigation, or logout.
- User-facing copy must be added in both Uzbek and Russian.
- Push delivery must be tested with a custom development build or production/TestFlight build, not Expo Go.

## File Map

### Native/configuration

- Create: `google-services.json` — Firebase Android client configuration supplied by the backend/admin team.
- Create: `GoogleService-Info.plist` — Firebase iOS client configuration supplied by the backend/admin team.
- Modify: `app.json` — Firebase config paths, messaging plugin, Android notification configuration, and iOS remote-notification capability.
- Modify: `package.json` / `package-lock.json` — Firebase Messaging dependencies installed through Expo-compatible versions.
- Create: `scripts/check-push-native-config.cjs` — static contract for package/bundle IDs, Firebase config paths, and required dependencies.

### Push domain and API

- Create: `src/modules/push/types/index.ts` — notification, page, unread-count, platform, and device payload types.
- Create: `src/modules/push/services/pushService.ts` — authenticated API calls and response normalization.
- Create: `src/modules/push/hooks/usePushQueries.ts` — list, unread count, and read mutation hooks.
- Modify: `src/core/query/queryKeys.ts` — scoped push query keys.
- Create: `scripts/check-push-api.cjs` — endpoint, payload, and response-shape contract checks.

### Registration and runtime lifecycle

- Create: `src/modules/push/services/pushRegistration.ts` — permission state, native FCM token, platform, and registration helpers.
- Create: `src/modules/push/context/PushNotificationContext.tsx` — authenticated registration lifecycle, token refresh, incoming events, and pending notification state.
- Create: `src/modules/push/hooks/usePushNotifications.ts` — typed context access for screens and navigation.
- Create: `src/modules/push/utils/notificationPayload.ts` — safe parsing of `data.notificationId` from Firebase messages and responses.
- Modify: `App.tsx` — mount the push provider below `AuthProvider` and above navigation.
- Modify: `src/context/AuthContext.tsx` — best-effort device deletion before account logout.
- Create: `src/modules/push/services/pushRegistration.test.ts` — permission/platform/payload regression tests.
- Create: `src/modules/push/utils/notificationPayload.test.ts` — numeric, string, missing, and invalid notification ID cases.
- Create: `scripts/check-push-lifecycle.cjs` — provider placement, logout cleanup, and listener contract checks.

### Navigation and UI

- Create: `src/navigation/navigationRef.ts` — typed navigation ref for push taps received outside a screen component.
- Create: `src/screens/NotificationsScreen.tsx` — paginated inbox with loading, empty, error, refresh, and read states.
- Create: `src/screens/NotificationsScreen.test.ts` — screen contract for loading, empty, retry, pagination, read state, and back navigation. The repository test runner collects `.test.ts` files.
- Create: `src/screens/NotificationSettingsScreen.tsx` — permission status, retry action, and OS settings action.
- Create: `src/modules/push/components/PushInAppBanner.tsx` — foreground title/body banner with tap and dismiss behavior.
- Modify: `src/navigation/index.tsx` — notification routes, navigation ref, and pending notification handoff after auth/navigation hydration.
- Modify: `src/screens/CustomersScreen.tsx` — bell button and unread badge in the existing header.
- Modify: `src/screens/SettingsScreen.tsx` — Profile “Bildirishnomalar” row.
- Modify: `src/types/index.ts` — `Notifications` and `NotificationSettings` stack routes.
- Modify: `src/i18n/translations/uz.ts` and `src/i18n/translations/ru.ts` — all notification and permission copy.
- Modify: `scripts/check-i18n.cjs` — notification screen coverage.

---

### Task 1: Add native Firebase configuration and a failing build contract

**Files:**
- Create: `google-services.json`
- Create: `GoogleService-Info.plist`
- Modify: `app.json`
- Modify: `package.json`, `package-lock.json`
- Test: `scripts/check-push-native-config.cjs`

**Interfaces:**
- Produces native configuration consumed by Firebase Messaging in later tasks.
- Does not expose APNs `.p8` or Firebase service-account credentials.

- [x] **Step 1: Write the failing native configuration contract**

Assert that `package.json` contains `@react-native-firebase/app` and `@react-native-firebase/messaging`, `app.json` points to `./google-services.json` and `./GoogleService-Info.plist`, and both supplied files contain the expected Android package, iOS bundle ID, project ID, and sender ID.

- [x] **Step 2: Run the contract to verify it fails**

Run: `node scripts\check-push-native-config.cjs`

Expected: FAIL because Firebase dependencies, config paths, and config files are not yet in the repository.

- [x] **Step 3: Add the supplied client config files without editing their contents**

Copy the two supplied files into the project root using their exact names. Confirm that the Firebase project remains `nasiya-daftar-8b362` and the identifiers remain `com.rbsx.nasiyadaftarapp`.

- [x] **Step 4: Install the Expo-compatible Firebase packages**

Run: `npx.cmd expo install @react-native-firebase/app @react-native-firebase/messaging`

Expected: package versions compatible with the current Expo SDK are added to `package.json` and `package-lock.json`.

- [x] **Step 5: Configure the app build**

Add the Android and iOS Firebase file paths to `app.json`, add the Firebase app/messaging config plugins required by the installed package version, and enable iOS remote notifications. Keep the existing Apple Sign In, contacts, secure store, and build-properties plugins unchanged.

- [x] **Step 6: Run the contract to verify native setup**

Run: `node scripts\check-push-native-config.cjs`

Expected: PASS with matching package/bundle IDs and required dependencies/config paths.

- [ ] **Step 7: Commit the isolated configuration change**

```bash
git add google-services.json GoogleService-Info.plist app.json package.json package-lock.json scripts/check-push-native-config.cjs
git commit -m "feat: configure Firebase messaging clients"
```

---

### Task 2: Add push types, API services, query keys, and API contracts

**Files:**
- Create: `src/modules/push/types/index.ts`
- Create: `src/modules/push/services/pushService.ts`
- Create: `src/modules/push/hooks/usePushQueries.ts`
- Modify: `src/core/query/queryKeys.ts`
- Test: `scripts/check-push-api.cjs`

**Interfaces:**

```ts
export type PushPlatform = "android" | "ios";

export interface PushDevicePayload {
  installationId: string;
  platform: PushPlatform;
  token: string;
}

export interface PushNotification {
  id: number;
  title: string;
  body: string;
  createdDate: string;
  isRead: boolean;
}

export interface PushNotificationPage {
  count: number;
  results: PushNotification[];
}

export interface PushNotificationListParams {
  page: number;
  pageSize: number;
}

export async function registerPushDevice(
  payload: PushDevicePayload,
): Promise<void>;
export async function unregisterPushDevice(
  installationId: string,
): Promise<void>;
export async function getPushNotifications(
  params: PushNotificationListParams,
): Promise<PushNotificationPage>;
export async function getUnreadPushNotificationCount(): Promise<number>;
export async function markPushNotificationRead(id: number): Promise<void>;
```

- [x] **Step 1: Write the failing API contract**

Mock the existing `apiClient` and assert that registration uses `put("/push/devices", payload)`, deletion uses `delete(`/push/devices/${installationId}`)`, list sends `page` and `pageSize` as query params, unread count reads `count`, and read uses `post(`/push/notifications/${id}/read`)`.

- [x] **Step 2: Run the contract to verify it fails**

Run: `node scripts\check-push-api.cjs`

Expected: FAIL because the push service and query keys do not exist.

- [x] **Step 3: Add types and query keys**

Add `pushRoot`, `pushNotifications`, and `pushUnreadCount` keys to `src/core/query/queryKeys.ts`. Keep keys independent from organization scope because the API is user-scoped, while the user ID can be included when the hook is instantiated to prevent cross-user cache reuse.

- [x] **Step 4: Implement the API service using the existing Axios client**

Use the existing authenticated `apiClient`; do not create a second HTTP client. Normalize `results` to an empty array and `count` to zero only for structurally valid empty responses. Let HTTP errors propagate so the existing refresh/error handling remains active.

- [x] **Step 5: Implement query and mutation hooks**

Use `useInfiniteQuery` with page parameter starting at `1`, `pageSize: 20`, and `getNextPageParam` based on `count`. Use `useQuery` for unread count with a short stale time. After a successful read mutation, update the notification row and invalidate the unread count.

- [x] **Step 6: Run the API contract to verify it passes**

Run: `node scripts\check-push-api.cjs`

Expected: PASS with exact endpoint paths and payloads.

- [ ] **Step 7: Commit the domain layer**

```bash
git add src/modules/push src/core/query/queryKeys.ts scripts/check-push-api.cjs
git commit -m "feat: add push notification API domain"
```

---

### Task 3: Implement FCM permission, token registration, refresh, and provider lifecycle

**Files:**
- Create: `src/modules/push/services/pushRegistration.ts`
- Create: `src/modules/push/context/PushNotificationContext.tsx`
- Create: `src/modules/push/hooks/usePushNotifications.ts`
- Modify: `App.tsx`
- Test: `src/modules/push/services/pushRegistration.test.ts`
- Test: `scripts/check-push-lifecycle.cjs`

**Interfaces:**

```ts
export type PushPermissionState = "granted" | "denied" | "undetermined";

export interface PushRegistrationState {
  permission: PushPermissionState;
  isRegistering: boolean;
  lastError: string | null;
  requestPermissionAndRegister: () => Promise<boolean>;
  retryRegistration: () => Promise<boolean>;
  openSystemSettings: () => Promise<void>;
}

export interface PendingPushNavigation {
  notificationId: number | null;
}
```

- [x] **Step 1: Write permission and payload tests**

Cover granted, denied, and undetermined permission states; Android/iOS platform mapping; empty token rejection; and registration payload creation from `{ token, getOrCreateUniqueId(), Platform.OS }`.

- [x] **Step 2: Run the tests to verify they fail**

Run: `node --experimental-strip-types scripts/run-unit-tests.cjs src/modules/push/services/pushRegistration.test.ts`

Expected: FAIL because the registration module is not implemented.

- [x] **Step 3: Implement platform permission and native token helpers**

Use `@react-native-firebase/messaging`. On iOS call the messaging permission request and map Firebase authorization status to the three app states. On Android request `POST_NOTIFICATIONS` on API 33+ and treat older Android versions as granted after native registration. Obtain the FCM registration token only after permission is granted.

- [x] **Step 4: Implement idempotent registration**

Call `getOrCreateUniqueId()` and `registerPushDevice`. Track the last `{ installationId, platform, token }` in memory so repeated app renders do not duplicate the PUT request. Register again when Firebase invokes its token-refresh listener.

- [x] **Step 5: Implement the provider lifecycle**

Mount `PushNotificationProvider` below `AuthProvider`. When `user` becomes available, initialize listeners and attempt registration without blocking the navigator. When `user` becomes null, remove listeners and clear pending navigation state. Store incoming notification events in context until the navigation layer is ready.

- [x] **Step 6: Add the foreground banner contract boundary**

Expose a context callback/event with `{ title, body, notificationId }` for foreground messages. Do not navigate directly from the provider; navigation is handled by the navigation ref in Task 5.

- [x] **Step 7: Run lifecycle contracts and unit tests**

Run: `node scripts\check-push-lifecycle.cjs`

Run: `npm test`

Expected: push lifecycle tests pass and the existing test suite remains green.

- [ ] **Step 8: Commit the registration lifecycle**

```bash
git add App.tsx src/modules/push scripts/check-push-lifecycle.cjs
git commit -m "feat: register authenticated FCM devices"
```

---

### Task 4: Integrate device cleanup into authenticated logout

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Test: `scripts/check-push-lifecycle.cjs`

**Interfaces:**
- Consumes `unregisterPushDevice(installationId: string)` from Task 2.
- Produces logout behavior where device deletion is attempted before local auth is cleared and never prevents logout.

- [x] **Step 1: Extend the logout contract test**

Assert that `AuthContext.tsx` obtains the existing session `uniqueId`, calls the push unregister service before `clearAuthSession()`, and catches the unregister failure without throwing.

- [x] **Step 2: Run the contract to verify the integration is absent**

Run: `node scripts\check-push-lifecycle.cjs`

Expected: FAIL on the missing logout cleanup assertions.

- [x] **Step 3: Add best-effort unregister before account logout**

In `logout`, call `unregisterPushDevice(session.uniqueId).catch(() => undefined)` before `/account/logout` and before clearing the local session. Keep account logout and local cleanup behavior unchanged even if push deletion fails or returns 404.

- [x] **Step 4: Run logout and auth regression checks**

Run: `node scripts\check-push-lifecycle.cjs`

Run: `npm test`

Expected: PASS; existing auth refresh/logout tests remain green.

- [ ] **Step 5: Commit logout cleanup**

```bash
git add src/context/AuthContext.tsx scripts/check-push-lifecycle.cjs
git commit -m "feat: remove push device on logout"
```

---

### Task 5: Add push-aware navigation and foreground/tap handling

**Files:**
- Create: `src/navigation/navigationRef.ts`
- Create: `src/modules/push/components/PushInAppBanner.tsx`
- Modify: `src/navigation/index.tsx`
- Modify: `src/modules/push/context/PushNotificationContext.tsx`
- Modify: `App.tsx`

**Interfaces:**

```ts
export const navigationRef: NavigationContainerRef<RootStackParamList>;
export function navigateToPushNotification(notificationId: number | null): void;
```

- [x] **Step 1: Write notification response parsing tests**

Cover `notificationId` values supplied as number, numeric string, missing data, and invalid text. The parser must return `number | null` and never throw.

- [x] **Step 2: Run the parser test to verify it fails**

Run: `npm test -- src/modules/push/utils/notificationPayload.test.ts`

Expected: FAIL because the parser and navigation ref do not exist.

- [x] **Step 3: Implement the typed navigation ref**

Attach the ref to `NavigationContainer`. `navigateToPushNotification` must wait for `navigationRef.isReady()` and navigate to `Notifications` with an optional `highlightId`; if the ref is not ready, keep the pending ID in the provider until the navigator mounts.

- [x] **Step 4: Implement foreground and opened-message listeners**

Handle foreground message events by showing the custom banner and invalidating the notification list/unread query. Handle background-open and cold-start responses by storing the parsed ID and handing it to the navigation ref only after the authenticated main navigator is active.

- [x] **Step 5: Implement the custom banner**

Render a safe-area-aware themed banner with title, body, close action, accessibility role `alert`, and a press action that navigates to the inbox. Use existing motion/theme conventions and avoid logging token or payload secrets.

- [x] **Step 6: Run the navigation and parser tests**

Run: `npm test`

Expected: response parsing passes; no notification event can crash cold-start navigation.

- [ ] **Step 7: Commit push navigation handling**

```bash
git add src/navigation src/modules/push App.tsx
git commit -m "feat: handle push notification navigation"
```

---

### Task 6: Build the notifications inbox screen

**Files:**
- Create: `src/screens/NotificationsScreen.tsx`
- Test: `src/screens/NotificationsScreen.test.ts`
- Modify: `src/types/index.ts`
- Modify: `src/navigation/index.tsx`
- Modify: `src/modules/push/hooks/usePushQueries.ts`

**Interfaces:**
- Route: `Notifications: { highlightId?: number } | undefined`.
- Screen consumes the infinite query and read mutation from Task 2.

- [x] **Step 1: Add the route type and screen contract**

Add `Notifications` to `RootStackParamList` and register it in `MainNavigator` with the existing headerless stack conventions.

- [x] **Step 2: Write the screen contract checks in `src/screens/NotificationsScreen.test.ts`**

Assert that the screen renders loading, empty, error/retry, refresh, pagination, read/unread row styling, and a back action using localized copy.

- [x] **Step 3: Implement the initial loading and empty states**

Use the project’s existing `EmptyState`, `ActivityIndicator`, `PrimaryButton`, theme, and safe-area patterns. Empty state must explain that there are no new announcements and offer refresh.

- [x] **Step 4: Implement the paginated list**

Render title, body, localized date, unread indicator, and stable keys. Load the next page from `onEndReached` while preserving cached pages during refresh.

- [x] **Step 5: Implement mark-read behavior**

When an unread row is opened, optimistically mark it read in the query cache, call the 204 endpoint, and roll back the row on failure while showing the existing localized toast error.

- [x] **Step 6: Implement `highlightId` scrolling**

After the first page is available, locate the highlighted notification if present, scroll to it when loaded, and do nothing if the ID is not in the current page.

- [x] **Step 7: Run screen contracts and unit tests**

Run: `npm test`

Expected: the notification screen contract and existing UI/domain tests pass.

- [ ] **Step 8: Commit the inbox screen**

```bash
git add src/screens/NotificationsScreen.tsx src/types/index.ts src/navigation/index.tsx src/modules/push/hooks/usePushQueries.ts
git commit -m "feat: add notification inbox"
```

---

### Task 7: Add unread badge entry point and Profile notification settings

**Files:**
- Create: `src/screens/NotificationSettingsScreen.tsx`
- Modify: `src/screens/CustomersScreen.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/types/index.ts`
- Modify: `src/navigation/index.tsx`
- Modify: `src/i18n/translations/uz.ts`
- Modify: `src/i18n/translations/ru.ts`
- Modify: `scripts/check-i18n.cjs`

**Interfaces:**
- Route: `NotificationSettings: undefined`.
- Customers header consumes `useUnreadPushNotificationCount()`.
- Profile settings consumes `usePushNotifications()`.

- [x] **Step 1: Add all UZ/RU notification strings**

Add keys for screen title, inbox empty/error/retry, unread accessibility, permission states, enable/retry/open-settings actions, and notification load/read errors in both translation files. Keep placeholders identical between locales.

- [x] **Step 2: Extend i18n contract coverage**

Add both new screens to `scripts/check-i18n.cjs` and assert that every notification key exists in UZ and RU.

- [x] **Step 3: Add the Customers bell button**

Add a bell button beside the existing add-customer button. Show a compact unread badge only when count is greater than zero, cap the visual label at `99+`, and expose an accessibility label containing the count. Navigate to `Notifications` on press.

- [x] **Step 4: Add the Profile settings row**

Add `Bildirishnomalar` under the Account section after security. Show `Yoqilgan`, `Ruxsat berilmagan`, or a localized equivalent based on permission state. Navigate to `NotificationSettings` and keep the row available even when permission is denied.

- [x] **Step 5: Implement the settings screen**

Show current permission, an enable/retry button, and an OS Settings button when the system has blocked permission. Keep registration pending state visible and disable repeat actions while registering. Do not add unsupported category switches.

- [x] **Step 6: Run i18n and screen checks**

Run: `node scripts\check-i18n.cjs`

Run: `npm test`

Expected: UZ/RU coverage and notification settings behavior pass.

- [ ] **Step 7: Commit notification entry points and settings**

```bash
git add src/screens src/navigation src/types/index.ts src/i18n scripts/check-i18n.cjs
git commit -m "feat: add notification entry points and settings"
```

---

### Task 8: Verify native builds, full contracts, and delivery behavior

**Files:**
- Modify: `scripts/check-push-native-config.cjs` if build configuration reveals a concrete mismatch.
- Modify: `scripts/check-push-lifecycle.cjs` if lifecycle contract coverage needs a concrete assertion.
- Modify: `scripts/check-i18n.cjs` only for missing notification screen coverage.

- [x] **Step 1: Run static and unit verification**

Run:

```bash
npm test
node scripts\check-push-native-config.cjs
node scripts\check-push-api.cjs
node scripts\check-push-lifecycle.cjs
node scripts\check-i18n.cjs
npx.cmd tsc --noEmit --pretty false
```

Expected: all push-specific checks and unit tests pass. Any unrelated existing TypeScript or contract failure must be reported separately rather than hidden.

- [ ] **Step 2: Create an Android development build**

Run: `npx.cmd expo run:android`

Install the build on a physical Android device with Google Play Services. Confirm permission, token registration request, foreground banner, background tray notification, tap navigation, unread count, read endpoint, token refresh, and logout cleanup.

- [ ] **Step 3: Create an iOS development/TestFlight build**

Run the project’s configured EAS development or production iOS build on a physical device. Confirm that Firebase uses the matching bundle ID, APNs production credentials are configured for the release channel, and the same foreground/background/tap/logout matrix passes.

- [ ] **Step 4: Validate backend queue behavior**

Send one admin announcement to a single test user and verify: device registration exists, the push arrives, `data.notificationId` opens the inbox, unread count changes, read returns 204, and logout deactivates the device.

- [ ] **Step 5: Run the final release checks**

Run: `npm run check`

Expected: push-specific contracts pass. Existing unrelated baseline failures, if any, must be named with their exact command output before release is declared ready.

- [ ] **Step 6: Commit final verification adjustments**

```bash
git add scripts src app.json package.json package-lock.json google-services.json GoogleService-Info.plist
git commit -m "test: verify push notification delivery flow"
```
