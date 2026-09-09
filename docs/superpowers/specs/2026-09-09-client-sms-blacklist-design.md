# Client SMS and Blacklist Integration Design

## Goal

Add organization-scoped debt SMS workflows and blacklist visibility to the existing Expo React Native application while preserving its current design system, navigation style, API client, TanStack Query cache boundaries, and permission model.

## Scope

The feature includes:

- New client blacklist fields from client list and detail responses.
- A blacklist summary on the client detail screen.
- An organization blacklist threshold setting saved through the backend.
- A dedicated “Mijozlarga SMS” menu and recipient workflow.
- Individual and bulk debt SMS sending.
- A paginated, filterable SMS history screen.
- Permission-aware visibility and actions.

No backend changes, scheduled sending, message template editor, or local persistence of recipient selections are included.

## Architecture

Create a focused `src/modules/client-sms` module with `types`, `services`, `hooks`, `components`, and utility functions. The module owns SMS response normalization, request parameters, query hooks, selection behavior, and SMS-specific UI. Shared client blacklist fields remain in `src/modules/clients/types` and are mapped in `src/services/clientsApi.ts` because they are part of the existing client domain.

Organization blacklist settings remain in the organization module. The screen uses a frontend default of 30 days because the current organization API does not yet return the setting. A successful PUT confirms the value for the current screen session; reopening the screen resets it to 30 until a GET field becomes available.

## Navigation and Menus

Add two root-stack screens:

- `ClientSms`: recipient search, filters, selection, and sending.
- `ClientSmsHistory`: SMS delivery history.
- `BlacklistSettings`: organization blacklist threshold configuration.

The profile screen contains:

- “Mijozlarga SMS” under an organization/tools section, visible only with `CLIENT_SMS_VIEW`.
- “Qora ro‘yxat sozlamasi” under the organization section. No new permission was specified for this endpoint, so it follows existing authenticated organization access and relies on backend authorization for final enforcement.

The SMS history entry inside `ClientSms` is visible only with `CLIENT_SMS_HISTORY_VIEW`.

## Permission Rules

Permissions are read from `user.permissions` with exact code matching:

- `CLIENT_SMS_VIEW`: may open and view recipient data.
- `CLIENT_SMS_SEND`: may send to one recipient.
- `CLIENT_SMS_BULK_SEND`: may select multiple recipients and submit bulk sends.
- `CLIENT_SMS_HISTORY_VIEW`: may open and view history.

Navigation screens also guard access, so deep or stale navigation cannot expose protected content. Missing permissions show a compact access-denied state and no protected network request is made. Backend 401/403 responses still use the central API error mapping.

Bulk selection is enabled only when bulk-send permission exists. With individual-send permission only, each eligible row exposes a direct send action. When both exist, rows support selection and retain an accessible individual action.

## API Contracts

### Client fields

Map the following optional fields from both `GET /api/clients` and `GET /api/clients/{id}`:

- `isBlacklisted: boolean`
- `overdueBalance: number`
- `blacklistedOrganizationCount: number`
- `blacklistedOrganizations: organization summary[]`

Unknown or omitted values receive safe defaults without inventing blacklist membership. Organization entries preserve the available identifier and display name. The parser tolerates direct arrays and common `results`, `items`, `data`, and `result` wrappers used elsewhere in the app.

### Organization setting

`PUT /api/organizations/current/blacklist-settings`

```json
{ "blacklistAfterDays": 30 }
```

The UI accepts positive whole days within a conservative client range of 1–3650. Backend validation messages remain authoritative.

### SMS recipients

`GET /api/clients/sms-recipients` with optional `search`, `blacklisted`, `hasDebt`, `canSend`, `pageNumber`, and `pageSize` parameters.

The hook uses organization-scoped query keys and backend pagination. Search is trimmed and debounced before entering the query key. Filter changes reset the page and clear selection to avoid submitting hidden or stale IDs. Previous page data remains visible while the next page loads.

### Send actions

- Individual: `POST /api/clients/{id}/debt-sms`
- Bulk: `POST /api/clients/debt-sms/bulk` with `{ "clientIds": number[] }`

Buttons lock synchronously during submission to prevent duplicate SMS requests. Only recipients with `canSend` are actionable. Bulk responses display `sentCount`, `failedCount`, and `skippedCount`; result-level failures remain available in a compact result summary. Successful sends invalidate recipient and SMS history queries for the active organization.

### SMS history

`GET /api/clients/debt-sms/history` with optional `status`, `search`, `pageNumber`, and `pageSize` parameters.

History is backend-paginated and searchable. Status uses an “Hammasi” option plus normalized server statuses. Rows show recipient identity, date, delivery status, and message/error detail when supplied by the API.

## Recipient Screen UX

The screen follows the current app theme and spacing tokens:

- Native stack back header with title and an SMS history action.
- Search bar followed by horizontally scrollable filter chips.
- Lightweight count/selection summary.
- Virtualized recipient list with initials, name, phone, debt/overdue amount, blacklist badge, and send eligibility.
- Disabled rows clearly explain why SMS cannot be sent when the API supplies a reason.
- A sticky bottom bulk-send bar appears only when at least one recipient is selected.
- Refresh, initial loading, pagination loading, error retry, and empty states use existing app patterns.

Selection lives only in screen memory and is represented by client IDs, avoiding duplicated client objects and unnecessary list rerenders. Pagination uses a bounded page size and stable item keys.

Before sending, the existing custom confirmation dialog states how many clients will receive SMS. Individual sending also requires confirmation because it has an external cost and side effect.

## Client Detail Blacklist UX

When `isBlacklisted` is true, display a warning-styled card below the client identity/statistics and above transaction history. It contains:

- “Qora ro‘yxatda” status.
- Overdue balance.
- Number of organizations that blacklisted the client.
- Compact list of organization names from `blacklistedOrganizations`.

If organization details are empty but the count is positive, show only the count. If the client is not blacklisted, do not consume profile space with an empty card.

## Blacklist Settings UX

The organization setting screen contains a short explanation, a numeric “Necha kundan keyin” field initialized to 30, and a sticky save action. The value is sent only when valid and changed. Success uses the existing toast; validation and server failures keep the entered value visible for correction. The screen warns that changing the threshold affects how overdue clients are classified by the organization.

## Data and Cache Boundaries

Add scoped query keys for SMS recipients and SMS history. Add the SMS roots to organization-dependent cache cleanup so switching organizations cannot expose data from the previous organization. Client detail/list queries retain their current keys; their richer mapped model flows through existing hooks.

Mutations do not optimistically claim SMS delivery. The server response is the source of truth. Query invalidation happens after accepted requests and does not cause a completed POST to be retried if refresh fails.

## Error Handling

- Parsing errors produce a controlled API-format error, not partially corrupted rows.
- Empty bulk selections never call the API.
- Duplicate IDs are removed before bulk submission.
- Invalid and non-positive IDs are rejected.
- Network/server errors use `getApiErrorMessage` and existing toast styling.
- List errors preserve search/filter state and expose retry.
- Partial bulk success reports all three counts instead of presenting the operation as wholly successful or wholly failed.

## Testing and Verification

Add focused tests for:

- Mapping new client blacklist fields and organization summaries.
- Recipient/history parameter construction and paginated response normalization.
- Permission helpers and screen access decisions.
- Selection deduplication, hidden-selection reset, and `canSend` enforcement.
- Individual and bulk request payloads, duplicate-submit prevention, and partial result summaries.
- Blacklist day validation and PUT payload.
- Organization-scoped SMS query cleanup.

Run TypeScript compilation, existing client/transaction/keyboard checks, new module tests, Babel transforms for new screens, and `git diff --check`. Device smoke verification covers navigation, first page/filter/search, individual confirmation, bulk selection/result, history, blacklist profile card, dark/light theme, keyboard avoidance, and permission combinations without sending unintended production SMS.
