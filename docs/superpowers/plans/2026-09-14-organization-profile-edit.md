# Organization Profile Edit Implementation Plan

> **For implementation:** Execute with strict RED → GREEN → REFACTOR. Keep organization ID and business-query scope stable.

**Goal:** Let the active organization name/address be edited from Settings through `PUT /organizations/current`, then refresh canonical organization data without disturbing client/transaction/report caches.

**Architecture:** API service handles PUT and existing GET. AuthContext remains the owner of selected organization/session metadata. A pure merge helper updates the selected organization consistently. Settings opens a keyboard-aware registered bottom sheet; presentation is separated from server/session synchronization.

---

## Task 1: Add exact update request contract and API

**Files:**
- Modify: `src/modules/organization/types/index.ts`
- Modify: `src/services/organizationsApi.ts`
- Create: `scripts/check-organization-update-api.cjs`

Add:

```ts
export interface UpdateCurrentOrganizationRequest {
  name: string;
  address: string;
}
```

**RED:** VM contract check calls `updateCurrentOrganization` and asserts exactly one `PUT /organizations/current` with `{ name, address }`; no `note` field is sent; response body is not required.

**GREEN:** Add the service and re-export through existing `organizationService.ts`.

**Verify:** `npm run check && npm run typecheck`.

**Commit:** `feat: add current organization update API`

---

## Task 2: Add pure canonical organization merge helper

**Files:**
- Create: `src/modules/organization/utils/organizationProfile.ts`
- Create: `src/modules/organization/utils/organizationProfile.test.ts`

Pure helper input:
- previous `organizations[]`,
- previous/current selected organization ID,
- canonical `OrganizationResponse` returned by GET.

**RED:** Test that:
- same ID is merged into list,
- role/roleId/isSelected membership metadata is preserved when canonical GET omits it,
- name/address are replaced by canonical values,
- other organizations are untouched,
- wrong/missing canonical ID is rejected rather than silently switching scope.

**GREEN:** Implement the smallest immutable merge function.

**Verify:** `npm test`.

**Commit:** `test: define organization profile merge contract`

---

## Task 3: Add AuthContext update orchestration

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Create: `scripts/check-organization-profile-context.cjs`

Expose:

```ts
updateCurrentOrganizationProfile(
  payload: UpdateCurrentOrganizationRequest,
): Promise<void>
```

Flow:
1. require authenticated user + active organization,
2. trim/validate name; trim address,
3. `PUT /organizations/current`,
4. `GET /organizations/current`,
5. require canonical response and same organization ID,
6. merge into `organizations[]`,
7. set `currentOrganization`,
8. persist user with updated `organizationName` and merged `organizations`,
9. refresh only organization/account query metadata.

Do not call `clearOrganizationQueries()` and do not invalidate clients/transactions/reports.

**RED:** Contract/static check proves PUT occurs before GET and no client/business-cache clear is used in this callback.

**GREEN:** Implement with local state mutation only after canonical GET succeeds so a successful PUT + failed GET leaves previous local organization metadata intact and surfaces an error.

**Verify:** `npm run typecheck && npm run check`.

**Commit:** `feat: synchronize edited organization profile`

---

## Task 4: Register organization edit bottom sheet

**Files:**
- Modify: `src/bottom-sheet/types.ts`
- Modify: `src/bottom-sheet/registry.ts`
- Create: `src/bottom-sheet/sheets/OrganizationEditSheet.tsx`
- Create: `scripts/check-organization-edit-sheet.cjs`

Sheet props carry the current organization plus an async `onSubmit(payload)` callback. The sheet itself owns form state/inline validation/loading and reuses `AppInput`, `PrimaryButton`, safe-area + keyboard-aware patterns from organization creation.

Fields:
- name: required, trimmed,
- address: optional, trimmed.

Behavior:
- pre-fill current values,
- no note field,
- duplicate submit disabled,
- API failure keeps sheet/form open,
- close only after `onSubmit` resolves,
- dismiss locked while saving.

**RED:** Static contract check proves registry/type entry exists and no note input is present.

**Verify:** `npm run typecheck && npm run check`.

**Commit:** `feat: add organization edit sheet`

---

## Task 5: Split organization profile UX in Settings

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/i18n/translations/uz.ts`
- Modify: `src/i18n/translations/ru.ts`
- Modify: `scripts/check-i18n.cjs`

Target organization section:
- non-interactive/current organization summary with name and address,
- `Edit organization information` row → opens `organizationEdit`,
- `Switch organization` row → existing selector flow,
- blacklist row unchanged functionally.

Settings passes an `onSubmit` callback that calls `updateCurrentOrganizationProfile`, shows success toast, and maps API errors through existing localized error handling.

Add UZ/RU keys for summary/address missing/edit/switch/save success/save error.

**RED:** Static contract check proves edit and switch are separate actions and current name/address are displayed.

**Verify:** `npm run verify`.

**Commit:** `feat: polish organization profile settings`

---

## Task 6: Manual checkpoint

Verify on Android/iOS:
- current name/address prefill,
- empty name inline validation,
- failed save keeps entered values,
- successful save updates Settings immediately from canonical GET,
- client list/report/history caches stay intact,
- organization switching still works.
