# Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a typed Uzbek/Russian localization system to Nasiya Daftari with device-scoped persistence, immediate switching, and language selection from Profile, Login, and Register.

**Architecture:** Add a small internal `src/i18n/` layer with typed dictionaries, a memoized `LanguageProvider`, a pure translator, localized formatters, and a shared language bottom sheet registered in the existing bottom-sheet infrastructure. Migrate shared UI first, then auth, profile/organization, customers/transactions, SMS/reports, subscriptions, and security while keeping API contracts and business data unchanged.

**Tech Stack:** Expo SDK 55, React Native 0.83, TypeScript strict mode, React Context, `@react-native-async-storage/async-storage`, `@gorhom/bottom-sheet`, existing theme and navigation systems.

**Spec:** `docs/superpowers/specs/2026-09-11-localization-design.md`

## Global Constraints

- Supported locales in this release are exactly `"uz"` and `"ru"`; future locales must be additive.
- Uzbek (`uz`) is the default when no valid stored preference exists.
- Persist the selected locale in `AsyncStorage` under exactly `language_preference_v1`.
- The preference is device-scoped and must survive logout.
- A locale change updates mounted UI immediately without restart or logout.
- Do not add i18next or another localization dependency.
- Do not change API request bodies, response parsing, permission codes, plan codes, filter values, or business calculations.
- Do not translate customer names, organization names, notes, or other user-owned/server-provided business content unless a stable presentation mapping is explicitly defined.
- Place `LanguageProvider` below `ThemeProvider` and above the existing application providers and navigator.
- Preserve unrelated working-tree changes; do not use a worktree for this implementation.
- Use existing theme tokens, bottom-sheet infrastructure, safe-area handling, and accessibility conventions.

## File map

### New localization files

- `src/i18n/types.ts` — locale union, dictionary schema, deep translation-key type, interpolation types, and public translator interfaces.
- `src/i18n/translations/uz.ts` — canonical Uzbek dictionary.
- `src/i18n/translations/ru.ts` — Russian dictionary with the exact same key coverage.
- `src/i18n/translate.ts` — pure dictionary selection, key lookup, interpolation, and Uzbek fallback.
- `src/i18n/i18nStorage.ts` — validated `AsyncStorage` read/write adapter for `language_preference_v1`.
- `src/i18n/formatters.ts` — memoized locale-aware date, number, currency, and count presentation helpers.
- `src/i18n/apiErrors.ts` — known API error-code/status to translation-key mapping.
- `src/i18n/LanguageContext.tsx` — hydration, global locale state, `setLocale`, and `useTranslation`.
- `src/i18n/index.ts` — stable public exports.
- `src/components/LanguageSelectorButton.tsx` — reusable auth-screen language trigger.
- `src/bottom-sheet/sheets/LanguageSheet.tsx` — shared Uzbek/Russian selection sheet.
- `scripts/check-i18n.cjs` — standalone regression check for locale validation, dictionary coverage, interpolation, and migrated integration points.

### Existing files grouped by responsibility

- Root/providers: `App.tsx`, `src/navigation/index.tsx`, `src/context/ConfirmDialogContext.tsx`.
- Shared UI and feedback: `src/components/AppErrorBoundary.tsx`, `src/components/AppInput.tsx`, `src/components/OtpInput.tsx`, `src/components/SearchBar.tsx`, `src/components/EmptyState.tsx`, `src/components/CustomerCard.tsx`, `src/components/TransactionItem.tsx`, `src/modules/clients/components/CustomerCard.tsx`, `src/modules/transactions/components/TransactionItem.tsx`, `src/modules/support/components/AdminContactButton.tsx`, `src/modules/account/components/PhoneVerificationModal.tsx`, `src/modules/app-update/components/AppUpdateGate.tsx`, `src/modules/app-update/components/AppUpdateBottomSheet.tsx`, and `src/utils/apiError.ts`.
- Auth/onboarding: `src/screens/OnboardingScreen.tsx`, `src/screens/LoginScreen.tsx`, `src/screens/RegisterScreen.tsx`, `src/screens/RegisterSmsVerifyScreen.tsx`, `src/screens/PasswordResetRequestScreen.tsx`, `src/screens/PasswordResetConfirmScreen.tsx`, and `src/modules/auth/services/googleSignInService.ts`.
- Profile/organization/subscription: `src/screens/SettingsScreen.tsx`, `src/screens/OrganizationSelectScreen.tsx`, `src/screens/OrganizationSetupScreen.tsx`, `src/screens/BlacklistSettingsScreen.tsx`, `src/screens/SubscriptionScreen.tsx`, `src/modules/organization/components/OrganizationCreateSheetContent.tsx`, and `src/modules/subscription/components/SubscriptionUpgradeModal.tsx`.
- Customers/transactions: `src/screens/CustomersScreen.tsx`, `src/screens/CustomerDetailScreen.tsx`, `src/bottom-sheet/sheets/TransactionSheet.tsx`, `src/bottom-sheet/sheets/TransactionDetailSheet.tsx`, and `src/modules/clients/components/CustomerEditSheet.tsx`.
- Reports/SMS/security: `src/screens/ReportsScreen.tsx`, `src/screens/ClientSmsScreen.tsx`, `src/screens/ClientSmsHistoryScreen.tsx`, `src/modules/client-sms/components/SmsRecipientRow.tsx`, `src/modules/client-sms/components/SmsHistoryRow.tsx`, `src/screens/AccountSecurityScreen.tsx`, `src/modules/pin-auth/screens/PinGateScreen.tsx`, and `src/modules/pin-auth/screens/PinChangeScreen.tsx`.

---

### Task 1: Build the typed localization core

**Files:**
- Create: `src/i18n/types.ts`
- Create: `src/i18n/translations/uz.ts`
- Create: `src/i18n/translations/ru.ts`
- Create: `src/i18n/translate.ts`
- Create: `src/i18n/i18nStorage.ts`
- Create: `src/i18n/formatters.ts`
- Create: `src/i18n/index.ts`
- Create: `scripts/check-i18n.cjs`
- Modify: `package.json`

**Interfaces:**
- Produce `Locale = "uz" | "ru"`, `DEFAULT_LOCALE = "uz"`, and `LANGUAGE_STORAGE_KEY = "language_preference_v1"`.
- Produce `TranslateKey`, `TranslateParams`, `Translate`, `isSupportedLocale`, `createTranslator`, `readStoredLocale`, and `writeStoredLocale`.
- Produce locale-aware formatting functions that accept a `Locale` and do not mutate API values.

- [ ] **Step 1: Define the shared dictionary schema and public types.**

  Use the Uzbek dictionary as the canonical `as const` schema and derive deep dot-path keys from it. The translator signature must accept only a `TranslateKey` and optional `Record<string, string | number>` interpolation parameters.

  ```ts
  export type Locale = "uz" | "ru";
  export const DEFAULT_LOCALE: Locale = "uz";
  export const LANGUAGE_STORAGE_KEY = "language_preference_v1";

  export type Translate = (
    key: TranslateKey,
    params?: Readonly<Record<string, string | number>>,
  ) => string;
  ```

- [ ] **Step 2: Add the initial complete shared dictionary shape in both locales.**

  Create the namespaces `common`, `auth`, `profile`, `customers`, `transactions`, `reports`, `sms`, `subscription`, `organization`, and `security`. Include shared loading, empty, save/cancel/close/back actions, validation, accessibility, and error fallback keys in both files. Keep Russian typed against the exact Uzbek shape so omitted keys fail `tsc`.

- [ ] **Step 3: Implement pure lookup and interpolation.**

  Implement `createTranslator(locale)` with these rules in order: use the selected locale value, fall back to the Uzbek value when the key is absent, and return a development-only missing-key marker rather than throwing. Replace `{placeholder}` tokens from the params object without evaluating arbitrary expressions.

- [ ] **Step 4: Implement storage validation and formatters.**

  `readStoredLocale()` must return `Locale | null`, accept only `"uz"` or `"ru"`, and convert storage failures to `null`. `writeStoredLocale(locale)` must write only validated locale values. Add memoized locale formatter factories for dates, numbers, currency, and count labels; use `uz-UZ` and `ru-RU` presentation locales while keeping the project’s existing so‘m business meaning.

- [ ] **Step 5: Add the standalone regression check and package command.**

  Add `"check:i18n": "node scripts/check-i18n.cjs"` to `package.json`. The script must load the TypeScript pure modules using the repository’s existing `typescript` dependency and assert that both dictionaries have equal leaf-key sets, invalid locale values are rejected, interpolation works for `{fullName}` and `{balance}`, and Uzbek is the fallback. It must also assert that `App.tsx`, `SettingsScreen.tsx`, `LoginScreen.tsx`, and `RegisterScreen.tsx` contain the planned provider/selector integration after those files are migrated.

- [ ] **Step 6: Run the core checks.**

  Run:

  ```powershell
  npm run check:i18n
  npx.cmd tsc --noEmit --pretty false
  ```

  Expected: the new script passes and TypeScript reports no errors.

- [ ] **Step 7: Commit only the localization core.**

  ```powershell
  git add src/i18n scripts/check-i18n.cjs package.json
  git commit -m "feat: add typed localization core"
  ```

  If repository Git permissions remain unavailable, keep the files in the working tree and report that commit is pending; never stage unrelated files.

### Task 2: Mount global language state and persistence

**Files:**
- Create: `src/i18n/LanguageContext.tsx`
- Modify: `App.tsx`
- Modify: `src/i18n/index.ts`

**Interfaces:**
- Produce `LanguageProvider` and `useTranslation()`.
- `useTranslation()` returns `{ locale, isHydrated, setLocale, t }`.
- `setLocale(locale: Locale): void` updates memory synchronously and persists asynchronously.

- [ ] **Step 1: Write provider behavior checks.**

  Extend `scripts/check-i18n.cjs` with source assertions for `LanguageProvider`, `useTranslation`, `LANGUAGE_STORAGE_KEY`, and the validation of stored values. Add runtime assertions for the pure storage adapter using an injected AsyncStorage mock with a valid, invalid, and rejected read.

- [ ] **Step 2: Implement `LanguageContext.tsx`.**

  Initialize with `DEFAULT_LOCALE`, hydrate once on mount, ignore stale async results after unmount, and expose `isHydrated`. Memoize the translator and context value. When storage write fails, keep the in-memory selection, log only in development, and do not throw or log out the user.

- [ ] **Step 3: Mount the provider at the root.**

  Change the root tree to:

  ```tsx
  <ThemeProvider>
    <LanguageProvider>
      <ThemedApp />
    </LanguageProvider>
  </ThemeProvider>
  ```

  Keep the existing onboarding and app bootstrap behavior intact. Hold text-heavy app rendering behind the existing startup/loading gate until language hydration is ready, using the existing themed loader so a saved Russian user does not see an Uzbek flash.

- [ ] **Step 4: Verify persistence and startup behavior.**

  Run `npm run check:i18n` and `npx.cmd tsc --noEmit --pretty false`. Manually select Russian, reload the app, log out, and confirm the locale remains Russian; remove the stored value and confirm Uzbek is used.

- [ ] **Step 5: Commit the provider integration.**

  ```powershell
  git add App.tsx src/i18n/LanguageContext.tsx src/i18n/index.ts scripts/check-i18n.cjs
  git commit -m "feat: persist app language preference"
  ```

### Task 3: Add the shared language bottom sheet and triggers

**Files:**
- Create: `src/bottom-sheet/sheets/LanguageSheet.tsx`
- Create: `src/components/LanguageSelectorButton.tsx`
- Modify: `src/bottom-sheet/types.ts`
- Modify: `src/bottom-sheet/registry.ts`
- Modify: `src/screens/LoginScreen.tsx`
- Modify: `src/screens/RegisterScreen.tsx`
- Modify: `src/screens/SettingsScreen.tsx`

**Interfaces:**
- Add `SheetType` value `"language"` and `SheetPropsMap["language"] = {}`.
- Register `LanguageSheet` with dynamic sizing and pan-down dismissal.
- `LanguageSelectorButton` accepts no locale state props; it reads `useTranslation()` and `useBottomSheet()` so all callers share one source of truth.

- [ ] **Step 1: Add the language sheet type and registry entry.**

  Extend `src/bottom-sheet/types.ts` without changing existing transaction signatures. Add the empty language props entry and register `LanguageSheet` in `src/bottom-sheet/registry.ts` with `enableDynamicSizing: true` and `enablePanDownToClose: true`.

- [ ] **Step 2: Implement the sheet UI.**

  Use the existing `useTheme`, `useSafeAreaInsets`, `radius`, `spacing`, and `typography` tokens. Render the localized title, Uzbek and Russian rows, selected state, checkmark, close action, safe-area bottom padding, and accessible labels. On selection call `setLocale(locale)` and `closeSheet()`; do not involve the keyboard or invalidate query caches.

- [ ] **Step 3: Implement the reusable auth trigger.**

  Build a top-right globe/language control with a minimum 44×44 touch target, current locale label, pressed state, and localized accessibility label. Its handler must call `openSheet("language", {})`.

- [ ] **Step 4: Wire Profile, Login, and Register.**

  Add the selector button to the Login and Register content header. Add the Profile `Til` / `Язык` row using the existing `ProfileMenuRow`; show `O‘zbekcha` or `Русский` from the current locale and open the same sheet. Do not add a second sheet implementation.

- [ ] **Step 5: Verify the sheet on both platforms.**

  Run `npx.cmd tsc --noEmit --pretty false`. On Android and iOS, open it from all three entry points, switch languages, confirm immediate screen updates, check safe-area spacing, swipe dismissal, dark/light themes, and long Russian labels.

- [ ] **Step 6: Commit the selector feature.**

  ```powershell
  git add src/bottom-sheet/types.ts src/bottom-sheet/registry.ts src/bottom-sheet/sheets/LanguageSheet.tsx src/components/LanguageSelectorButton.tsx src/screens/LoginScreen.tsx src/screens/RegisterScreen.tsx src/screens/SettingsScreen.tsx
  git commit -m "feat: add language selection sheet"
  ```

### Task 4: Localize shared components, dialogs, and API errors

**Files:**
- Create: `src/i18n/apiErrors.ts`
- Modify: `src/utils/apiError.ts`
- Modify: `src/context/ConfirmDialogContext.tsx`
- Modify: `src/components/AppErrorBoundary.tsx`
- Modify: `src/components/AppInput.tsx`
- Modify: `src/components/OtpInput.tsx`
- Modify: `src/components/SearchBar.tsx`
- Modify: `src/components/EmptyState.tsx`
- Modify: `src/components/CustomerCard.tsx`
- Modify: `src/components/TransactionItem.tsx`
- Modify: `src/modules/clients/components/CustomerCard.tsx`
- Modify: `src/modules/transactions/components/TransactionItem.tsx`
- Modify: `src/modules/support/components/AdminContactButton.tsx`
- Modify: `src/modules/account/components/PhoneVerificationModal.tsx`
- Modify: `src/modules/app-update/components/AppUpdateGate.tsx`
- Modify: `src/modules/app-update/components/AppUpdateBottomSheet.tsx`

**Interfaces:**
- Produce `getLocalizedApiErrorMessage(error, fallbackKey, t)` while keeping the old helper temporarily available until all callers migrate.
- API mapping consumes normalized backend `code`/`errorCode` and HTTP status and returns a `TranslateKey | null`; unknown values resolve to the caller’s localized fallback key.
- Shared components resolve their own default labels with `useTranslation`; caller-provided business text remains unchanged.

- [ ] **Step 1: Write error and shared-copy regression checks.**

  Add assertions to `scripts/check-i18n.cjs` for known status/code mapping, unknown-error fallback, and the presence of localized lookup in the shared files. Verify that no API request code is modified by the error migration.

- [ ] **Step 2: Implement known API error mapping.**

  Read only safe error metadata (`code`, `errorCode`, and status) from Axios responses. Map known authentication, validation, permission, network, and generic server cases to translation keys. Never display an unknown server free-form sentence as the localized UI fallback; return `t(fallbackKey)` instead.

- [ ] **Step 3: Localize shared feedback and accessibility text.**

  Replace hardcoded strings in inputs, password visibility toggles, OTP clipboard actions/errors, search clear/filter labels, admin contact labels, app update actions, error-boundary copy, customer/transaction accessibility descriptions, and dialog default action labels. Preserve dynamic names, balances, and server data as interpolation values.

- [ ] **Step 4: Run shared checks.**

  Run:

  ```powershell
  npm run check:i18n
  npx.cmd tsc --noEmit --pretty false
  node scripts/check-input-focus-coverage.cjs
  node scripts/check-formatted-input-performance.cjs
  ```

  Expected: all commands pass and the shared UI still focuses, formats, and reads inputs as before.

- [ ] **Step 5: Commit the shared migration.**

  ```powershell
  git add src/i18n/apiErrors.ts src/utils/apiError.ts src/context/ConfirmDialogContext.tsx src/components/AppErrorBoundary.tsx src/components/AppInput.tsx src/components/OtpInput.tsx src/components/SearchBar.tsx src/components/EmptyState.tsx src/components/CustomerCard.tsx src/components/TransactionItem.tsx src/modules/clients/components/CustomerCard.tsx src/modules/transactions/components/TransactionItem.tsx src/modules/support/components/AdminContactButton.tsx src/modules/account/components/PhoneVerificationModal.tsx src/modules/app-update/components/AppUpdateGate.tsx src/modules/app-update/components/AppUpdateBottomSheet.tsx
  git commit -m "feat: localize shared feedback and errors"
  ```

### Task 5: Migrate authentication and onboarding

**Files:**
- Modify: `src/screens/OnboardingScreen.tsx`
- Modify: `src/screens/LoginScreen.tsx`
- Modify: `src/screens/RegisterScreen.tsx`
- Modify: `src/screens/RegisterSmsVerifyScreen.tsx`
- Modify: `src/screens/PasswordResetRequestScreen.tsx`
- Modify: `src/screens/PasswordResetConfirmScreen.tsx`
- Modify: `src/modules/auth/services/googleSignInService.ts`

**Interfaces:**
- All screens consume `const { t } = useTranslation()` and pass localized fallback keys to `getLocalizedApiErrorMessage`.
- Google sign-in service exposes stable error categories or a translator-aware message helper; it must not force Uzbek strings into the UI layer.

- [ ] **Step 1: Add auth/onboarding dictionary keys in both locale files.**

  Cover welcome copy, onboarding steps, login/register fields and actions, Google sign-in states, password reset states, OTP verification, resend/countdown states, validation, success toasts, and accessibility labels. Add the same leaf keys to Uzbek and Russian before migrating screens.

- [ ] **Step 2: Migrate screen-rendered strings.**

  Replace headings, descriptions, labels, placeholders, buttons, footer links, loading labels, and accessible names with `t(...)`. Keep `APP_NAME`, phone numbers, entered names, and OTP values as interpolation/data values.

- [ ] **Step 3: Migrate toast and error fallbacks.**

  Pass translation keys for invalid forms, login failures, SMS failures, Google failures, reset failures, and successful actions. Ensure a Russian user never receives an accidental Uzbek fallback from these handlers.

- [ ] **Step 4: Verify the auth flow.**

  Run `npm run check:i18n` and `npx.cmd tsc --noEmit --pretty false`. Manually switch languages on Login, navigate to Register and OTP verification, exercise invalid and success states, and confirm the selected locale remains active across navigation.

- [ ] **Step 5: Commit the auth migration.**

  ```powershell
  git add src/screens/OnboardingScreen.tsx src/screens/LoginScreen.tsx src/screens/RegisterScreen.tsx src/screens/RegisterSmsVerifyScreen.tsx src/screens/PasswordResetRequestScreen.tsx src/screens/PasswordResetConfirmScreen.tsx src/modules/auth/services/googleSignInService.ts src/i18n/translations
  git commit -m "feat: localize auth and onboarding"
  ```

### Task 6: Migrate navigation, Profile, organization, and subscriptions

**Files:**
- Modify: `src/navigation/index.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/OrganizationSelectScreen.tsx`
- Modify: `src/screens/OrganizationSetupScreen.tsx`
- Modify: `src/screens/BlacklistSettingsScreen.tsx`
- Modify: `src/screens/SubscriptionScreen.tsx`
- Modify: `src/modules/organization/components/OrganizationCreateSheetContent.tsx`
- Modify: `src/modules/subscription/components/SubscriptionUpgradeModal.tsx`

**Interfaces:**
- `TabNavigator` resolves tab titles and accessibility text from `useTranslation` on render so the tab bar updates immediately.
- Plan codes such as `FREE` and `PRO` remain API values; any standard presentation labels are selected through a stable plan-code mapping, not by mutating the response.

- [ ] **Step 1: Add profile/organization/subscription keys.**

  Cover tab titles, profile identity/status, theme choices, language row, organization actions and limits, blacklist settings, subscription cards/plans/limits, upgrade reasons, admin contact states, and all custom alerts/toasts in both dictionaries.

- [ ] **Step 2: Migrate navigation and Profile.**

  Replace static tab titles, Profile headings, subscription labels, status badges, theme option labels, logout confirmation, and accessibility labels. Keep the subscription query and navigation behavior unchanged.

- [ ] **Step 3: Migrate organization and blacklist flows.**

  Translate setup/select/create organization copy, one-organization limit messages, loading/empty/error states, blacklist settings labels/help/errors, and confirmation/toast messages. Continue sending the same `blacklistAfterDays` payload.

- [ ] **Step 4: Migrate subscription UI and upgrade sheets.**

  Translate plan feature labels, SMS package labels, quotas, upgrade modal titles/descriptions/steps/actions, admin-routing copy, and fallback states. Render server numeric values and plan codes through presentation helpers without changing subscription data.

- [ ] **Step 5: Verify long-copy layout and navigation.**

  Run `npm run check:i18n`, `npx.cmd tsc --noEmit --pretty false`, `node scripts/check-subscription-screen.cjs`, `node scripts/check-subscription-upgrade-sheet.cjs`, and `node scripts/check-organization-settings.cjs`. Manually test both locales with small Android/iOS widths and large system font settings.

- [ ] **Step 6: Commit the navigation/profile migration.**

  ```powershell
  git add src/navigation/index.tsx src/screens/SettingsScreen.tsx src/screens/OrganizationSelectScreen.tsx src/screens/OrganizationSetupScreen.tsx src/screens/BlacklistSettingsScreen.tsx src/screens/SubscriptionScreen.tsx src/modules/organization/components/OrganizationCreateSheetContent.tsx src/modules/subscription/components/SubscriptionUpgradeModal.tsx src/i18n/translations
  git commit -m "feat: localize profile organization and plans"
  ```

### Task 7: Migrate customers and transaction surfaces

**Files:**
- Modify: `src/screens/CustomersScreen.tsx`
- Modify: `src/screens/CustomerDetailScreen.tsx`
- Modify: `src/bottom-sheet/sheets/TransactionSheet.tsx`
- Modify: `src/bottom-sheet/sheets/TransactionDetailSheet.tsx`
- Modify: `src/modules/clients/components/CustomerEditSheet.tsx`

**Interfaces:**
- Transaction and customer components consume localized labels and error fallbacks while preserving customer names, phone numbers, balances, API filters, and transaction types.
- Bottom-sheet content continues using the existing `SheetRenderProps` and keyboard behavior without adding locale-specific snap points.

- [ ] **Step 1: Add customer/transaction keys.**

  Cover customer counts, search/filter labels, debtor/blacklist states, add/edit/delete flows, contact picker messages, transaction types, amount/note fields, keyboard-safe action labels, date filters, profile actions, validation, and accessibility descriptions.

- [ ] **Step 2: Migrate customer list/detail and edit sheet.**

  Replace visible literals and accessibility strings with translation keys. Use interpolation for count, customer name, amount, and organization name. Keep the server-side search/filter behavior and current list performance unchanged.

- [ ] **Step 3: Migrate transaction sheets.**

  Translate debt/payment labels, balance summaries, validation, success/error toasts, close/profile actions, and transaction detail copy. Keep the existing Android keyboard bridge, sticky footer, and dynamic sizing untouched except for localized text sizing constraints.

- [ ] **Step 4: Run regression checks.**

  Run `npm run check:i18n`, `npx.cmd tsc --noEmit --pretty false`, `node scripts/check-transaction-sheet.cjs`, `node scripts/check-bottom-sheet-keyboard.cjs`, `node scripts/check-customer-detail-blacklist-ui.cjs`, and `node scripts/check-input-focus-coverage.cjs`. Manually open the first transaction/add-customer sheet on Android with the keyboard visible in both locales.

- [ ] **Step 5: Commit the customer/transaction migration.**

  ```powershell
  git add src/screens/CustomersScreen.tsx src/screens/CustomerDetailScreen.tsx src/bottom-sheet/sheets/TransactionSheet.tsx src/bottom-sheet/sheets/TransactionDetailSheet.tsx src/modules/clients/components/CustomerEditSheet.tsx src/i18n/translations
  git commit -m "feat: localize customers and transactions"
  ```

### Task 8: Migrate reports, SMS, account security, and PIN screens

**Files:**
- Modify: `src/screens/ReportsScreen.tsx`
- Modify: `src/screens/ClientSmsScreen.tsx`
- Modify: `src/screens/ClientSmsHistoryScreen.tsx`
- Modify: `src/modules/client-sms/components/SmsRecipientRow.tsx`
- Modify: `src/modules/client-sms/components/SmsHistoryRow.tsx`
- Modify: `src/screens/AccountSecurityScreen.tsx`
- Modify: `src/modules/pin-auth/screens/PinGateScreen.tsx`
- Modify: `src/modules/pin-auth/screens/PinChangeScreen.tsx`

**Interfaces:**
- Report, SMS, security, and PIN screens use the same `useTranslation`, localized formatters, and API error helper; API response shapes and permission checks remain unchanged.
- Count/limit labels use locale-aware count helpers rather than concatenated Uzbek suffixes.

- [ ] **Step 1: Add reports/SMS/security/PIN keys.**

  Cover report summaries, export states, SMS filters/history/results/limits/template actions, subscription upgrade prompts, account security labels and alerts, PIN setup/change/forgotten/incorrect/loading/biometric copy, and accessibility labels in both locales.

- [ ] **Step 2: Migrate reports and formatting.**

  Replace headings, metric labels, debtor labels, export feedback, and accessibility text. Route all dates, amounts, and count labels through the locale-aware formatter while retaining the current report response mapping and calculations.

- [ ] **Step 3: Migrate SMS screens and rows.**

  Translate SMS filters, recipient selection, bulk result summaries, history statuses, limit/upgrade sheets, loading/empty/error states, and buttons. Keep phone numbers, client names, SMS template content from the API, and permission logic unchanged.

- [ ] **Step 4: Migrate account security and PIN screens.**

  Translate PIN/biometric labels, wrong-PIN animation state text, phone/email verification copy, password/Google-account flows, logout/forgotten-PIN alerts, and all accessibility labels. Do not change secure storage keys, biometric capability checks, inactivity timeout, or authentication order.

- [ ] **Step 5: Run feature checks.**

  Run `npm run check:i18n`, `npx.cmd tsc --noEmit --pretty false`, `node scripts/check-reports-response.cjs`, `node scripts/check-client-sms-api.cjs`, `node scripts/check-client-sms-permissions.cjs`, `node scripts/check-pin-biometric-entry.cjs`, and `node scripts/check-phone-verification-pin-order.cjs`.

- [ ] **Step 6: Commit the reports/SMS/security migration.**

  ```powershell
  git add src/screens/ReportsScreen.tsx src/screens/ClientSmsScreen.tsx src/screens/ClientSmsHistoryScreen.tsx src/modules/client-sms/components/SmsRecipientRow.tsx src/modules/client-sms/components/SmsHistoryRow.tsx src/screens/AccountSecurityScreen.tsx src/modules/pin-auth/screens/PinGateScreen.tsx src/modules/pin-auth/screens/PinChangeScreen.tsx src/i18n/translations
  git commit -m "feat: localize reports messaging and security"
  ```

### Task 9: Complete coverage audit and production verification

**Files:**
- Modify: `scripts/check-i18n.cjs`
- Modify: `package.json` only if additional check commands are needed
- Review: all `src/**/*.tsx`, `src/**/*.ts`, and `App.tsx`

**Interfaces:**
- The completed check script reports missing dictionary keys and known user-facing literals in migrated files with file/line context.
- The final implementation exposes no screen-specific storage reads or duplicate language-selection state.

- [ ] **Step 1: Add the literal and key-coverage audit.**

  Scan migrated source files for remaining user-facing literals in JSX text, `placeholder`, `accessibilityLabel`, `accessibilityHint`, toast/alert arguments, validation messages, and navigation titles. Allow only app constants, API values, user data, technical logs, and explicitly documented non-UI strings. Fail with the exact file and line for each unallowlisted literal.

- [ ] **Step 2: Run the full automated verification set.**

  Run:

  ```powershell
  npm run check:i18n
  npx.cmd tsc --noEmit --pretty false
  git diff --check
  Get-ChildItem scripts\check-*.cjs | ForEach-Object { node $_.FullName }
  ```

  Expected: every check passes, no translation-key mismatch exists, and no whitespace errors are introduced. Existing unrelated working-tree modifications may remain visible in `git status` and must not be reverted.

- [ ] **Step 3: Execute the manual localization matrix.**

  Verify Uzbek and Russian on Android and iOS for: cold start, onboarding, Login, Register, OTP, password reset, organization select/setup, all four tabs, Profile, subscription and upgrade sheets, customer add/edit/detail, transaction sheets with keyboard, SMS bulk/history flows, blacklist settings with keyboard, account security, PIN/biometric entry, logout, and app update UI. Include loading, empty, success, validation, API error, dialog, toast, and accessibility states.

- [ ] **Step 4: Confirm future-locale extensibility.**

  Verify that adding a dictionary for English, Tajik, or Kazakh requires only a locale registration, dictionary, selector entry, and formatter locale; no feature screen should contain locale-specific branching.

- [ ] **Step 5: Review the final diff and commit the audit.**

  ```powershell
  git diff --stat
  git status --short
  git add scripts/check-i18n.cjs package.json
  git commit -m "test: verify localization coverage"
  ```

  Confirm that no prior user changes are staged in this commit. If Git index permissions still block commits, report the exact blocker and leave the working tree intact.

## Self-review checklist

- [ ] Every spec section maps to at least one task: architecture (Tasks 1–2), selector UX (Task 3), translation organization and errors (Tasks 4–8), formatting/performance (Tasks 1, 6, 8), migration order (Tasks 5–8), verification/acceptance (Task 9), and future locale extensibility (Tasks 1 and 9).
- [ ] No task changes backend contracts, secure-storage behavior, query keys, permissions, or business calculations.
- [ ] All later tasks use the same interfaces: `Locale`, `TranslateKey`, `Translate`, `useTranslation`, `getLocalizedApiErrorMessage`, and `openSheet("language", {})`.
- [ ] The plan contains no placeholder implementation step; each code change names exact files, behavior, and verification commands.
- [ ] The plan preserves current workspace changes and explicitly avoids worktrees.
