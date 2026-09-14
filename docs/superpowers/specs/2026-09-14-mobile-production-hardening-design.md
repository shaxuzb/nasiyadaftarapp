# Mobile Production Hardening Design

Date: 2026-09-14
Branch: `feat/mobile-production-hardening`
Repository: `shaxuzb/nasiyadaftarapp`

## 1. Goal

Bring the existing React Native / Expo mobile app to a production-hardened state without rewriting working user flows or changing backend contracts unnecessarily.

The hardening covers five areas together because they influence each other:

1. network and offline lifecycle;
2. React Query ownership, cache consistency, and performance;
3. security re-authentication for sensitive local security actions;
4. UI state consistency and large-screen decomposition;
5. verification and release-readiness tooling.

The design preserves the current product behavior, brand, navigation model, subscription semantics, SMS permissions, organization flow, and server API contracts unless a concrete defect requires a compatible client-side fix.

## 2. Explicit Product Decisions

The approved product choices are:

- Sensitive security actions use stronger re-authentication.
- Offline mode is read-only. Cached data may be shown, but write mutations are blocked while offline.
- UI may receive professional polish for loading, error, empty, offline, disabled, and retry states, but this is not a visual redesign.
- Existing mobile navigation remains mobile-native. No web-style navigation redesign is introduced.
- No offline mutation queue is introduced.
- No new purchase/subscription backend endpoints are invented.
- Work is isolated to a feature branch; `main` is not modified directly.

## 3. Architecture Principles

### 3.1 Server state belongs to React Query

Server-owned entities must live in TanStack Query caches rather than being duplicated in context-local state.

Contexts may expose orchestration or convenience APIs, but they must not become parallel server-state stores.

### 3.2 Organization-scoped requests require an active organization

Client, transaction, reports, organization-settings, and organization-scoped SMS data requests must not run merely because a user is authenticated.

The effective rule is:

```ts
const enabled = Boolean(user && currentOrganization);
```

The query scope must prefer the active organization id. A user id may remain useful for truly account-level queries, but not as a fallback for organization-owned business data.

### 3.3 Backend remains authoritative

The client may optimistically patch display state after successful mutations, but backend data remains authoritative. Invalidations must refetch the affected authoritative data.

### 3.4 Performance optimizations must be evidence-based

Do not add blanket memoization or list-tuning flags by default. Optimize known expensive paths, duplicate requests, cache misses, large lists, and measurable re-render sources.

### 3.5 Behavior compatibility over rewrites

The implementation should improve boundaries incrementally. Existing consumers should keep working while internals are extracted into focused modules.

## 4. Network and Offline Design

### 4.1 Native connectivity source

Add a single native connectivity integration using `@react-native-community/netinfo`.

Expose it through a focused core network layer, for example:

```text
src/core/network/
  NetworkProvider.tsx
  useNetworkStatus.ts
  mutationGuard.ts
  setupOnlineManager.ts
```

This layer must:

- track current online/offline state;
- connect native state to TanStack Query `onlineManager`;
- expose a stable app-level connectivity status;
- avoid per-screen `NetInfo.fetch()` calls;
- provide a shared guard for write actions.

### 4.2 Offline behavior

When offline:

- cached read data remains visible where available;
- navigation remains usable;
- stale cached data must not be presented as freshly synchronized;
- create/update/delete customer actions are blocked;
- debt/payment mutations are blocked;
- SMS sends are blocked;
- security actions that are purely local may still work if they do not require a backend request;
- account actions requiring the backend remain blocked;
- the UI presents a clear but non-intrusive offline indicator.

No mutation queue, replay engine, or background synchronization is added.

### 4.3 Reconnect behavior

When connectivity returns:

- TanStack Query is informed through `onlineManager`;
- active stale queries may refetch according to Query configuration;
- the offline banner disappears;
- blocked write controls become available again;
- no previously blocked write action is submitted automatically.

### 4.4 Mutation guard contract

All server mutations should use one shared contract rather than custom offline checks in each screen.

Example shape:

```ts
assertOnlineForMutation();
```

or an equivalent hook/helper that returns a localized user-facing failure.

The exact API may be adapted during implementation, but there must be one canonical mechanism.

## 5. Query and Cache Ownership

### 5.1 Query gating

Organization-owned hooks must require an active organization. This includes at minimum:

- client lists/search/detail;
- transaction history/balance fallback;
- reports;
- organization settings such as blacklist;
- organization-scoped client SMS data.

Account-level subscription catalog/current subscription may remain user-scoped where that matches the backend contract.

### 5.2 Cache invalidation matrix

Mutation invalidation must be centralized enough to avoid missing related views.

#### Client create

After success:

- add or refetch the client list;
- invalidate client search caches;
- invalidate reports;
- refresh subscription usage/limits only if the backend contract exposes client-count-dependent subscription state.

#### Client update

After success:

- patch detail cache with accepted fields;
- patch list cache with accepted fields;
- invalidate detail/list for authoritative refresh;
- invalidate client search caches;
- invalidate reports if profile fields affect report presentation.

#### Client delete

After success:

- remove the client from list caches;
- remove detail cache;
- remove client transaction-history cache;
- invalidate client search caches;
- invalidate reports;
- invalidate transaction aggregates if any depend on the deleted client.

#### Debt/payment mutation

After success:

- invalidate the affected client history;
- invalidate the affected client detail/current balance;
- update or invalidate the client list/current balance;
- invalidate reports;
- invalidate SMS recipients/templates only when their data contract depends on the changed balance.

#### SMS send

After success:

- invalidate SMS recipient state;
- invalidate SMS history;
- refresh subscription SMS quota;
- do not treat quota-refresh failure as send failure after the send has already succeeded.

### 5.3 Balance source hierarchy

Balance resolution must be deterministic:

1. use finite backend `currentBalance` when present;
2. use transaction-history calculation only as a compatibility fallback;
3. never silently treat a malformed numeric backend value as zero;
4. never fetch history for every client when only a subset needs fallback data.

Main list and search results must use the same hierarchy.

### 5.4 Search fallback

If a server search result contains clients without `currentBalance`, the app must fetch history only for those missing-balance result ids rather than relying on histories from the default unfiltered client list.

This prevents search-only clients from displaying an incorrect zero balance.

## 6. Auth and Session Hardening

### 6.1 Preserve current strengths

Keep the current secure session model:

- access and refresh tokens stored in SecureStore;
- legacy AsyncStorage migration and cleanup;
- single-flight token refresh;
- original request replay after successful refresh;
- logout when refresh fails irrecoverably.

### 6.2 Reduce AuthContext responsibility incrementally

`AuthContext` currently orchestrates authentication, organizations, session persistence, subscription synchronization, and account profile updates.

Do not perform a risky rewrite. Extract focused internal helpers/hooks/services while preserving the public `useAuth()` contract as much as possible.

Candidate boundaries:

```text
src/modules/auth/session/
src/modules/organization/hooks/
src/modules/subscription/hooks/
```

The objective is maintainability and clearer ownership, not API churn.

### 6.3 Exact auth route matching

Replace broad string-fragment matching for public account endpoints with a clearer canonical matcher or endpoint set so authentication refresh behavior remains explicit and maintainable.

## 7. Security Re-authentication

### 7.1 Existing PIN storage remains

Retain the current secure local PIN model:

- per-user SecureStore record;
- random salt;
- digest rather than plaintext PIN;
- attempt tracking;
- biometric preference;
- forced logout after the configured failed-attempt limit.

### 7.2 Sensitive local actions require re-authentication

The following actions require a fresh local re-authentication step:

- remove PIN;
- enable biometrics;
- disable biometrics;
- change PIN;
- any future security-sensitive local credential action added to the same account-security surface.

### 7.3 Re-auth contract

Provide one reusable flow rather than implementing separate verification logic in each row/screen.

Conceptual API:

```ts
type ReauthResult =
  | { success: true }
  | { success: false; reason: "cancelled" | "invalid" | "unavailable" };

reauthenticate({ allowBiometric: true, allowPin: true })
```

Behavior:

- prefer an available/enabled biometric path where appropriate;
- fall back to current PIN;
- cancellation is not treated as an application error;
- failed PIN attempts continue to follow existing attempt-count semantics;
- successful re-auth authorizes only the current sensitive action, not an extended session unless explicitly designed later.

### 7.4 PIN removal flow

Approved flow:

```text
Danger confirmation
→ local re-authentication
→ clear PIN/biometric local records
→ success feedback
```

### 7.5 Biometric toggle flow

Both enabling and disabling biometrics require re-authentication. Enabling may additionally require the platform biometric prompt as part of confirming device capability/identity.

### 7.6 PIN display metadata freshness

PIN-gate display metadata must refresh when relevant user profile fields change, not only when user id changes.

Dependencies include at least:

- `user.id`;
- `user.fullName`;
- `user.phoneNumber`;
- `user.email`.

## 8. API Parsing Hardening

Client and transaction parsing should follow the defensive pattern already used by reports/subscription parsing.

Introduce shared or local helpers such as:

- required positive id parsing;
- finite numeric parsing;
- optional finite numeric parsing;
- trimmed optional string parsing;
- explicit enum normalization.

Malformed financial values must cause a controlled parsing error or explicit fallback defined by the contract, not `NaN` propagation.

Transaction `amount` is specifically required to be finite before entering balance calculations.

## 9. UI State System

### 9.1 No redesign

Keep the current mobile brand, colors, navigation, bottom tabs, bottom-sheet interaction model, and typography direction.

### 9.2 Standard states

Feature screens should use consistent states for:

- initial loading;
- background refreshing;
- offline with cached data;
- offline without cached data;
- API error;
- empty data;
- mutation pending;
- disabled offline write actions;
- retry.

### 9.3 Global offline indicator

Use one small app-level offline banner/indicator rather than duplicate banners in every screen.

Screens still need local disabled states and relevant toast/message copy for blocked mutations.

### 9.4 Accessibility

Preserve or improve:

- accessibility roles;
- labels;
- selected/disabled/busy state;
- reasonable touch targets;
- non-color-only state communication.

## 10. Screen Decomposition

Large screens should be decomposed only along clear behavioral boundaries, without rewriting unrelated UI.

### 10.1 Customers

Target shape:

```text
CustomersScreen
├── CustomersHeader
├── CustomerFilters
├── CustomerList
├── CustomerCreateSheet
└── hooks
    ├── useCustomerListState
    └── useCustomerCreate
```

### 10.2 Customer Detail

Target shape:

```text
CustomerDetailScreen
├── CustomerHeader
├── BalanceCard
├── BlacklistSection
├── TransactionsSection
├── CustomerEditSheet
└── hooks
```

### 10.3 Reports

Target shape:

```text
ReportsScreen
├── ReportsSummary
├── MonthlyStatistics
├── TopDebtors
├── ReportInsights
└── ExportAction
```

### 10.4 Settings / Client SMS

Extract sections/hooks only where doing so reduces responsibility or repeated logic. Do not decompose files into tiny components with no independent purpose.

## 11. Module Boundary Cleanup

Some feature modules currently re-export implementations from legacy shared locations. During work in those areas, move ownership toward the feature module.

Desired direction:

```text
src/
  core/
    network/
    query/
    security/
  modules/
    auth/
    clients/
    transactions/
    reports/
    subscription/
    client-sms/
    organization/
  screens/
```

Do not perform a repository-wide move solely for cosmetic consistency. Migrate touched functionality where it improves ownership and testability.

## 12. App Update Hardening

Keep the current semantic-version validation, timeout, deduplication, foreground checks, dismiss behavior, and forced-update evaluation.

For this client-only hardening phase:

- retain the current config source unless a backend endpoint already exists;
- validate store URLs against the expected platform/store destination rather than arbitrary HTTPS only;
- preserve fail-open behavior for update-config fetch failure so the app is not bricked by an update-service outage.

A migration from GitHub Raw to an application-owned API/CDN is a separate backend-capable follow-up unless that endpoint is already available.

## 13. Environment Configuration

`.env` is currently tracked even though it is ignored for future untracked files.

The tracked values are public Expo client configuration, not private runtime secrets, but the repository should still move to a cleaner convention:

- remove tracked `.env` from version control;
- keep `.env.example` with required keys and safe example values;
- use EAS environment configuration for build-time values as appropriate.

Do not claim secret rotation is required unless an actual secret is found.

## 14. Testing and Verification

### 14.1 One canonical verification command

Add a clear verification entry point, for example:

```bash
npm run verify
```

It should compose the repository's supported checks rather than replace them.

Expected categories:

- TypeScript typecheck;
- unit/regression tests;
- existing `scripts/check-*` contract checks that are still relevant;
- Expo Doctor;
- production dependency audit where practical.

### 14.2 Tests required for changed behavior

Add or extend tests for at least:

- organization query gating;
- network/offline mutation guard;
- reconnect integration contract;
- client mutation invalidation policy;
- search missing-balance fallback;
- finite transaction amount parsing;
- security re-auth result handling;
- PIN metadata refresh behavior where feasible;
- subscription/SMS/report regression coverage for touched modules.

### 14.3 CI

Only add or update CI after the canonical local verification command is known to work in a dependency-equipped environment.

CI should not be used as a substitute for defining a reproducible local verification command.

## 15. Implementation Sequence

Implement in this order to reduce regression risk:

1. create verification baseline and capture current failures/warnings;
2. add network/offline foundation and TanStack `onlineManager` integration;
3. gate organization-owned queries by active organization;
4. centralize mutation invalidation and fix cache consistency;
5. fix main-list/search balance fallback consistency;
6. add security re-authentication and PIN metadata freshness;
7. harden client/transaction response parsing;
8. add consistent UI loading/error/offline/empty/retry behavior;
9. decompose large screens where touched;
10. reduce AppContext/AuthContext responsibilities incrementally;
11. add canonical verification scripts and regression tests;
12. perform a final request/render/cache/security audit;
13. run release-readiness verification.

## 16. Definition of Done

The work is complete only when all applicable conditions below are verified:

- organization-owned API requests do not run without an active organization;
- cached read-only data remains usable offline;
- server write actions are blocked offline with clear feedback;
- reconnect updates TanStack online state and permits normal refetch behavior;
- no automatic replay of blocked mutations exists;
- client create/update/delete keeps clients/search/reports/related caches consistent;
- debt/payment keeps detail/list/history/reports balance state consistent;
- search clients without `currentBalance` do not silently display zero because of unrelated list history;
- no all-client N+1 history regression is introduced;
- PIN removal requires fresh local re-authentication;
- biometric enable/disable requires fresh local re-authentication;
- PIN change uses the same sensitive-action verification contract;
- PIN gate metadata reflects changed user name/contact data;
- malformed transaction amount cannot propagate `NaN` into balances;
- loading, refreshing, empty, error, retry, disabled, and offline states are consistent on touched screens;
- existing navigation, auth, organization, subscription, SMS, reports, and PIN flows still behave as intended;
- TypeScript verification passes;
- applicable regression/contract checks pass;
- Expo Doctor is clean or remaining warnings are documented and understood;
- production dependency audit is reviewed;
- no direct changes are made to `main` during implementation.

## 17. Non-goals

This project does not include:

- backend API redesign;
- offline write queue/synchronization;
- a new navigation system;
- a visual rebrand;
- new subscription purchase APIs;
- blanket repository-wide file moves unrelated to touched behavior;
- speculative performance changes without a concrete reason;
- automatic merge to `main`.
