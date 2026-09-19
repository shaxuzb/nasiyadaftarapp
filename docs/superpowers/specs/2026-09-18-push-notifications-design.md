# Push notifications design

## Status

Draft for implementation review. No application code or native configuration is changed by this document.

## Goal

Add a production-ready FCM push notification flow for Android and iOS, backed by the existing authenticated API. Users should receive announcements, see them inside the app, open the relevant internal notification view from a push tap, and manage device notification permission from Profile.

The admin sending API is out of scope for the mobile app; it remains an admin-web/backend responsibility.

## Repository findings

- The app is Expo SDK 55 / React Native 0.83 with a custom development-client workflow.
- `expo-notifications` and Firebase Messaging are not currently installed.
- `android/` exists locally; iOS native files are generated for builds.
- The existing auth storage creates and persists `uniqueId`, and login refresh/logout already send it to the backend.
- The app uses Axios and TanStack Query through existing service and query-key conventions.
- Main tabs are Customers, Reports, Client SMS, and Profile. A fifth notification tab is not needed.
- UZ and RU translations are the current supported locales.

## Firebase configuration

The supplied `google-services.json` and `GoogleService-Info.plist` were checked:

- Firebase project: `nasiya-daftar-8b362`
- Sender ID: `1047856631244`
- Android package: `com.rbsx.nasiyadaftarapp`
- iOS bundle ID: `com.rbsx.nasiyadaftarapp`

They match the mobile app identifiers. The APNs production key is configured outside the repository in Apple/Firebase. APNs `.p8` and Firebase service-account private keys must never be added to the mobile project or committed.

## Chosen implementation

Use native Firebase Messaging through an Expo-compatible custom development/production build, rather than Expo Push Service. The backend contract explicitly stores an FCM token for both platforms and sends through Firebase, so the client must register a native FCM token and send `platform: "android" | "ios"`.

### 1. Push device lifecycle

Create a focused push module with:

- typed device payload and notification models;
- API functions for `PUT /push/devices`, `DELETE /push/devices/{installationId}`;
- permission and token registration helpers;
- token refresh handling;
- a provider/controller mounted below `AuthProvider` so it reacts to authenticated session changes.

Registration rules:

1. Do nothing while there is no authenticated user.
2. Request notification permission once at the appropriate authenticated entry point.
3. If permission is granted, obtain the native FCM token and register it with the existing persistent `uniqueId` as `installationId`.
4. Re-register when Firebase rotates the token or when the authenticated user/app session changes.
5. Treat registration failure as non-blocking: the user can continue using the app and retry from Profile.
6. On logout, attempt `DELETE /push/devices/{installationId}` before clearing the auth session. Logout must still finish if the push delete request fails.

The current `uniqueId` is persistent but is not an RFC UUID string. We will reuse it because the backend explicitly links push deactivation to `logout.uniqueId`; backend validation must accept it as a string. If the endpoint enforces a UUID format, the ID generator needs a separate migration before release.

### 2. Notification data and caching

Add scoped TanStack Query keys for:

- paginated notification list;
- unread count.

Implement service/hooks for:

- `GET /push/notifications?page=1&pageSize=20`;
- `GET /push/notifications/unread-count`;
- `POST /push/notifications/{id}/read`.

The notification list will support initial loading, pull-to-refresh, pagination, empty state, retry state, and cached content during background refresh. Marking a notification read will update the row and invalidate/update unread count without refetching the entire application domain.

### 3. User interface and navigation

Do not add a fifth bottom tab.

- Add a bell button with an unread badge to the Customers screen header, opening a new `NotificationsScreen` stack route.
- Add a `Bildirishnomalar` row in Profile. It opens a dedicated `NotificationSettingsScreen`, not a crowded bottom sheet, because permission status, retry actions, and operating-system settings need readable states.
- The settings screen will show permission status, a clear enable/retry action, and an OS settings action when the permission is blocked. It will not show unsupported fake categories because the backend has no notification-preferences endpoint.
- The notification list will use the existing theme, typography, safe-area, loading/error/empty patterns, and UZ/RU translations.

### 4. Incoming notification behavior

Handle three states consistently:

- Foreground: show a custom in-app banner containing title and body; tapping it opens the notification list and uses `data.notificationId` when present.
- Background: let the operating system show the push; when the user taps it, navigate to the internal notification list and focus the supplied notification ID.
- Terminated: process the initial notification response after navigation/auth hydration, then open the internal notification list once the authenticated navigator is ready.

Notification payload parsing must tolerate numeric or string `notificationId` values and ignore malformed data without crashing startup.

### 5. Native/build configuration

- Add the Firebase messaging dependencies using Expo-compatible versions.
- Add the Firebase config files through app configuration/native build setup.
- Enable Android notification channel/default behavior and iOS remote-notification capability as required by the chosen library.
- Test only on a custom development build and production/TestFlight build; Expo Go is not a valid push-delivery test target for this project.

## Error and security rules

- Never put APNs `.p8` or Firebase service-account JSON in the mobile app, repository, or frontend bundle.
- Never block login, app startup, or logout on a notification registration failure.
- Handle denied permission separately from network/API failure and show an actionable message.
- Do not log FCM tokens in production logs.
- A `401` during registration must use the existing auth refresh flow; if the session is no longer valid, silently stop registration.

## Verification plan

Add contract/unit coverage for:

- device registration payload and platform mapping;
- token refresh re-registration;
- logout cleanup being best-effort;
- notification response parsing and malformed payload safety;
- unread-count invalidation after read;
- pagination and empty/error states;
- notification settings permission states;
- UZ/RU translation coverage.

Manual matrix:

- Android development build: permission, foreground, background, tap, token refresh, logout.
- iOS development/TestFlight build: APNs permission, foreground, background, tap, token refresh, logout.
- cold start from a notification tap;
- blocked permission followed by OS Settings recovery;
- authenticated user with no notifications and with multiple pages.

## Explicit non-goals

- Admin notification composer/history UI in the mobile app.
- Marketing/topic subscriptions or per-category preferences without a backend API.
- Sending notifications directly from the mobile app.
- Shipping any private Firebase/Apple signing key in the repository.
