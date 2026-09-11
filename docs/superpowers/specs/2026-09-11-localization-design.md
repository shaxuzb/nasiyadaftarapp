# Nasiya Daftari localization design

## Status

Approved design direction: Uzbek and Russian, device-scoped persistence, and immediate application without restart.

## Context

The application currently presents user-facing copy directly inside screens, components, bottom sheets, toasts, custom alerts, validation messages, and accessibility labels. Language selection does not yet exist as a shared application capability.

The first release must support Uzbek and Russian consistently across authentication, onboarding, the main tabs, profile, organization management, customers, transactions, reports, SMS, subscriptions, security, and shared feedback UI. The implementation must remain easy to extend with English, Tajik, and Kazakh later without changing feature architecture.

## Goals

- Provide Uzbek (`uz`) and Russian (`ru`) translations for all user-facing application text.
- Use Uzbek as the default when no saved preference exists.
- Persist the selected language in `AsyncStorage` under `language_preference_v1`.
- Keep the preference device-scoped so logout does not reset it.
- Apply a language change immediately throughout the mounted application.
- Offer the same language selector from Profile, Login, and Register.
- Reuse the existing theme tokens, bottom-sheet infrastructure, safe-area handling, and accessibility conventions.
- Keep translation keys type-safe and make future locales additive.
- Localize known frontend and backend error states without changing API payloads.

## Non-goals

- No i18next or other third-party localization dependency in this phase.
- No backend localization or changes to API contracts.
- No translation of user data such as customer names, organization names, notes, or server-provided business content.
- No language-specific business rules; locale affects presentation only.

## Approved architecture

### Locale model

```ts
type Locale = "uz" | "ru";
```

The locale is represented by a small union so unsupported values cannot enter the application state. The storage value is validated before use; invalid or unavailable storage falls back to `uz`.

### Internal typed i18n layer

Add a dedicated `src/i18n/` module with these responsibilities:

- `types.ts`: locale, translation schema, translation key types, interpolation parameter types.
- `translations/uz.ts`: canonical Uzbek dictionary and schema source.
- `translations/ru.ts`: Russian dictionary checked against the same schema.
- `i18nStorage.ts`: read/write/remove-free device preference access using the existing AsyncStorage dependency.
- `LanguageContext.tsx`: provider, hydration state, locale setter, and `useTranslation()` hook.
- Optional shared formatting helpers in `formatters.ts` for locale-aware dates, numbers, currency, and count labels.

The dictionaries must satisfy one shared TypeScript schema. Russian cannot silently omit a key: missing keys fail type checking and the runtime still has an Uzbek fallback for resilience.

The public hook is intentionally small:

```ts
const { locale, setLocale, t } = useTranslation();
```

`t` supports interpolation for values such as client names, amounts, limits, and organization names. Count-sensitive copy goes through a locale-aware count helper rather than hardcoded suffixes in screens.

### Provider placement

The provider will be placed below `ThemeProvider` and above the rest of the application tree:

```text
ThemeProvider
└── LanguageProvider
    └── ThemedApp
        └── existing query, auth, lock, account, app, sheet and navigator providers
```

This makes the locale available to authentication, onboarding, navigation, profile, bottom sheets, toasts, dialogs, and all feature screens. The provider value and translation lookup functions will be memoized to avoid unrelated global re-renders.

### Startup and persistence

- Start with the approved default `uz`.
- Hydrate the saved locale once when `LanguageProvider` mounts.
- Validate the stored value against the supported locale union.
- Keep the existing startup/loading gate from rendering text in the wrong language while hydration completes; if that gate cannot own the wait, render a minimal neutral loading surface until the language is ready.
- Persist changes asynchronously after updating in-memory state so the UI responds immediately.
- If persistence fails, keep the current in-memory language and use Uzbek only as the next-launch fallback; do not block the user or log them out.
- Never read AsyncStorage separately from each screen.

## Language selector UX

### Profile

Add a `Til` / `Язык` row to the Profile settings area using the existing settings-row component. The row shows the localized current language name (`O‘zbekcha` or `Русский`) and a chevron. Tapping it calls the centralized bottom-sheet API with the language sheet identifier.

### Login and Register

Add a compact language/globe control in the top-right content area of both screens. It uses the same bottom sheet and current selection as Profile, so an unauthenticated user can choose a language before login or registration. The control has a localized accessibility label and a sufficiently large touch target.

### Bottom sheet

The language sheet is a shared sheet owned by the existing `BottomSheetProvider`:

- Title: `Tilni tanlang` / `Выберите язык`.
- Two rows only in this release: Uzbek and Russian.
- Each row has a language icon/label, selected-state styling, and a checkmark for the active locale.
- Selecting a row updates the provider immediately and dismisses the sheet after the selection is applied.
- The sheet uses the application theme, existing radius/spacing/typography tokens, safe-area bottom padding, and dynamic content height.
- It has no keyboard interaction, supports swipe-to-dismiss, and keeps the close affordance accessible.
- The sheet and its labels re-render from the newly selected locale before dismissal when necessary, so no stale text remains in the mounted UI.

## Translation organization

Use feature namespaces to keep the dictionary navigable and to prevent a single flat list of ambiguous keys:

```text
common
auth
profile
customers
transactions
reports
sms
subscription
organization
security
```

Keys describe meaning rather than a specific component, for example `auth.login.title`, `common.save`, or `sms.limitReached.title`. Reused actions, status labels, empty states, loading states, confirmation copy, validation messages, toast messages, custom alerts, bottom-sheet labels, and accessibility labels all belong in the dictionary.

Keep API-facing values independent from UI translations. For example, permission codes, plan codes, filter values, request bodies, and response property names remain unchanged; only their presentation labels are translated.

## Error and fallback behavior

- Known frontend validation errors use translation keys directly.
- Known API error codes/statuses are mapped to localized keys in a shared error-message utility.
- If the backend returns only an unrecognized free-form message, show a localized generic fallback instead of displaying a potentially wrong-language server sentence.
- Preserve useful safe server data in interpolation only when it is data, not UI copy.
- A missing translation key first falls back to Uzbek, then to a development-visible key marker; production must not crash because of a missing dictionary entry.
- Log missing keys only in development to avoid noisy production logs.

## Formatting rules

Numbers, dates, percentages, currency, and count labels must use centralized locale-aware helpers. Existing business calculations and API values remain unchanged. Formatters should be memoized by locale and should not be recreated on every render.

The Uzbek and Russian UI should retain the product’s existing visual hierarchy and concise mobile copy. Long Russian labels must be allowed to wrap naturally in rows and sheets; fixed-width text containers and clipped buttons are not acceptable.

## Migration strategy

Migrate in dependency order so the app remains buildable throughout:

1. Add the typed locale model, dictionaries, storage adapter, provider, and hook.
2. Mount `LanguageProvider` and verify hydration/persistence independently.
3. Add the shared language bottom sheet and wire Profile, Login, and Register.
4. Migrate shared primitives first: buttons, inputs, dialogs, toasts, common errors, empty/loading states, and accessibility labels.
5. Migrate feature areas in this order: auth/onboarding, profile/security, organization, customers, transactions, reports, SMS, subscriptions, and remaining shared screens.
6. Replace hardcoded date/number/status presentation with locale-aware helpers where the current UI exposes language-dependent text.
7. Remove obsolete duplicate literals only after each feature has been migrated and verified.

Do not migrate backend/API constants, permission identifiers, plan codes, or user-entered/user-owned text into translations.

## Performance and maintainability

- One provider owns locale state and one storage read occurs during startup.
- Translation dictionaries are static modules; do not construct them inside components.
- Memoize the context value and locale-dependent formatters.
- Keep translation lookup O(1) after module initialization.
- Avoid passing newly created translation objects through large list rows; pass resolved strings or stable keys as appropriate.
- Keep locale changes as a deliberate global update; list virtualization and existing query caches must not be invalidated by a language change.
- Adding a future locale should require a new dictionary, supported-locale registration, and selector row—not feature-screen rewrites.

## Verification plan

### Automated checks

- TypeScript strict check, including equal translation-key coverage for Uzbek and Russian.
- Existing repository check scripts and lint/type checks.
- Unit tests for storage validation, Uzbek fallback, interpolation, locale switching, and known API error mapping.
- Static check that rejects newly introduced user-facing literals in migrated areas unless explicitly allowlisted.

### Manual checks

- Select Russian from Login, navigate through registration, authenticate, and confirm every visible shared/auth string is Russian.
- Select Uzbek from Profile, confirm immediate global update without restart or logout.
- Log out and log back in; confirm the selected language remains unchanged on the same device.
- Clear or corrupt the stored preference; confirm safe Uzbek fallback.
- Open the language sheet from Profile, Login, and Register on Android and iOS.
- Verify bottom-sheet safe-area spacing, dynamic height, swipe dismissal, touch targets, and dark/light theme compatibility.
- Exercise loading, empty, validation, success, API error, custom alert, and accessibility-label states in both languages.
- Check long Russian copy on narrow devices and with large system font settings.

## Acceptance criteria

- Every user-facing string in the agreed application scope is rendered through the localization layer.
- Uzbek is the default and Russian is selectable from Profile, Login, and Register.
- Selection is immediate, persists across logout and restart, and is device-scoped.
- No API contract or business behavior changes because of localization.
- No known screen, bottom sheet, toast, dialog, validation error, or accessibility label remains unintentionally in the other language.
- Missing/invalid storage or unknown backend errors do not crash the app and produce a localized fallback.
- TypeScript and existing project checks pass, and both locales have complete translation coverage.

## Risks and mitigations

- **Large migration surface:** migrate feature-by-feature with checks after each area and keep the dictionary schema strict.
- **Russian text expansion:** use flexible layouts, wrapping, and content-size testing rather than truncation.
- **Wrong-language startup flash:** hydrate before the existing app startup gate releases text-heavy UI.
- **Server messages in one language:** map known codes/statuses and use localized generic fallbacks for unknown messages.
- **Unintended global re-render:** memoize provider values, keep dictionaries static, and avoid changing query keys on locale updates.

