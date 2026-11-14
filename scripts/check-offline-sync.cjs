const assert = require("node:assert/strict");
const fs = require("node:fs");

// Offline phase 2: writes made while the server cannot be reached are queued
// with the phone's uuid, sent through /sync/push, and never lost or sent
// under another account. The pure parts (parsing, planning, overlay) have
// their own unit tests in src/modules/offline/sync/sync.test.ts.
const read = (file) => fs.readFileSync(file, "utf8");

const app = read("App.tsx");
const queries = read("src/modules/clients/hooks/useClientQueries.ts");
const sheet = read("src/bottom-sheet/sheets/TransactionSheet.tsx");
const engine = read("src/modules/offline/sync/syncEngine.ts");
const service = read("src/modules/offline/sync/syncService.ts");
const controller = read("src/modules/offline/components/OfflineSyncController.tsx");
const saved = read("src/modules/offline/db/savedDataRepository.ts");
const outbox = read("src/modules/offline/db/outboxRepository.ts");
const detail = read("src/screens/CustomerDetailScreen.tsx");
const settings = read("src/screens/SettingsScreen.tsx");
const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");

assert.match(app, /<OfflineSyncController \/>/, "The sync controller must run for the whole app");

// A write goes to the server first, with its uuid; only no answer queues it.
assert.match(queries, /createClient\(\{ \.\.\.request, uuid \}\)/, "A new customer carries its uuid");
assert.match(queries, /if \(!isUnreachableWrite\(error\)[^)]*\) throw error;\s*return queue\(\);/, "Only an unreachable server queues a customer");
assert.match(queries, /if \(shouldQueueRightAway\(\) && user && organizationId !== null\) return queue\(\);/, "Known down: queued at once, no timeout");
assert.match(sheet, /if \(customerId < 0 \|\| shouldQueueRightAway\(\)\)/, "Known down: a debt or payment is queued at once");
assert.match(sheet, /createClientTransaction\(customerId, \{ \.\.\.request, uuid \}\)/, "A debt or payment carries its uuid");
assert.match(sheet, /if \(!isUnreachableWrite\(error\)\) throw error;\s*await queue\(\);/, "Only an unreachable server queues a debt or payment");

// The backend contract.
assert.match(service, /"\/sync\/push"/);
assert.match(service, /"\/sync\/changes"/);
assert.match(service, /const CHANGES_PAGE_SIZE = 1000;[\s\S]*limit: CHANGES_PAGE_SIZE/, "Changes are pulled in the largest pages the server allows");
assert.match(engine, /chunkOperations\(pending\)/, "Pushes go in batches of at most 100");
assert.match(engine, /status\(error\) === 410 && !restarted/, "An expired cursor reloads everything once");
assert.match(engine, /status\(error\) === 401\) return \{ kind: "unauthorized" \}/, "A 401 keeps the queue");
assert.match(engine, /running \?\?= sync\(context\)/, "One round at a time");

// The queue belongs to its user and survives signing out.
assert.doesNotMatch(saved.slice(saved.indexOf("export async function clearSavedData")), /tx\.delete\(outbox\)/, "Signing out must not delete the queue");
assert.match(outbox, /eq\(outbox\.userId, userId\), eq\(outbox\.status, "pending"\)/, "Only the signed-in user's writes are sent");
assert.match(outbox, /const answered = \[\.\.\.plan\.done, \.\.\.plan\.rejected\.map\(\(item\) => item\.opId\)\];/, "Every answered write leaves the queue; a refused one quietly");
assert.doesNotMatch(read("src/bottom-sheet/registry.ts"), /pendingSync/, "No list of writes waiting: the offline label is enough");
assert.doesNotMatch(read("src/modules/offline/components/SavedDataNotice.tsx"), /useOutbox|openSheet/, "The label shows no count");
assert.match(controller, /void loadOutbox\(userId\);/, "The queue is read again for each user");
assert.match(settings, /withUnsentWarning\(t\("profile\.logoutMessage"\), t\)/, "Signing out warns about unsent writes");

// A customer only on the phone can take debts and payments, nothing else yet.
assert.match(detail, /const onlyOnPhone = resolvedId < 0;/);
assert.match(detail, /async function remove\(\) \{\s*if \(onlyOnPhone\) \{/);

// Server up or down: from the app's own requests, and GET /health only while down.
const health = read("src/modules/offline/sync/healthService.ts");
const monitor = read("src/modules/offline/components/ServerHealthMonitor.tsx");
assert.match(read("src/services/axiosService.ts"), /if \(isServerUnreachable\(error\) && getCurrentNetworkStatus\(\) !== "offline"\) reportServerDown\(\);/);
assert.match(read("src/modules/offline/utils/savedData.ts"), /new Set\(\[502, 503, 504\]\)/, "Down means no answer or 502/503/504, the backend's rule");
assert.match(health, /`\$\{API_BASE_URL\}\/health`/);
assert.match(health, /\[15_000, 15_000, 20_000, 30_000, 30_000, 60_000, 120_000, 180_000, 300_000\]/, "15-30 s at first, then 2-5 min");
assert.match(monitor, /if \(!down \|\| offline\) return undefined;/, "Never asked while the server answers or with no connection");
assert.match(app, /<ServerHealthMonitor \/>/);
assert.match(controller, /if \(wasDown\.current && !serverDown\) \{\s*failures\.current = 0;\s*void run\(\{ pull: true, refresh: true \}\);/, "Back: the queue, the changes, then the screens");
assert.match(engine, /if \(code !== 413 && code !== 422\) throw error;\s*if \(batch\.length > 1\)/, "A batch the server cannot read goes again one write at a time");

// Offline mode is for the server being down, never for the phone's internet
// being off: then nothing is written and the user is asked to connect.
const writes = read("src/modules/offline/sync/offlineWrites.ts");
assert.match(writes, /if \(getCurrentNetworkStatus\(\) === "offline"\) return false;/, "No internet: never queued");
assert.match(writes, /return isServerDown\(\) && getCurrentNetworkStatus\(\) !== "offline";/);
assert.match(sheet, /if \(!requireInternet\(\(\) => void save\(type\)\)\) return;/);
assert.match(read("src/screens/CustomersScreen.tsx"), /if \(!requireInternet\(\(\) => void handleCreateCustomer\(\)\)\) return;/);
assert.match(read("src/modules/offline/components/SavedDataNotice.tsx"), /return serverDown && !isOffline;/);

// Parts that need the server explain why instead, while it cannot be used.
assert.match(read("src/navigation/index.tsx"), /<Tab\.Navigator[\s\S]*UNSTABLE_router=\{guardServerRoutes\}[\s\S]*<Stack\.Navigator[\s\S]*UNSTABLE_router=\{guardServerRoutes\}/);
assert.match(read("src/bottom-sheet/BottomSheetProvider.tsx"), /SERVER_ONLY_SHEETS\.has\(type\) && !requireServer\(/);
assert.match(app, /<ConnectionNoticeModal \/>/);
const notice = read("src/modules/offline/state/connectionNotice.ts");
for (const route of ["Notifications", "ClientSms", "SmsSettings", "Subscription", "VideoLessons"]) {
  assert.match(notice, new RegExp(`"${route}"`), `${route} needs the server`);
}
assert.doesNotMatch(notice, /"CustomerDetail"|"Customers"|"Reports"/, "Customers, a customer and reports work offline");

// Offline mode is a small chip on the screens, never a bar over the header.
assert.doesNotMatch(app, /OfflineBanner/, "No full-width offline bar over the screens");

// The report counts the writes still on the phone.
assert.match(read("src/modules/reports/hooks/useReports.ts"), /applyPendingToReport\(/, "Reports include waiting writes");

for (const [name, source] of [["uz", uz], ["ru", ru]]) {
  for (const key of ["queuedTransaction", "queuedCustomer", "pendingTitle", "rejectedTitle", "sheetTitle", "sendNow", "logoutPending", "pendingCustomerLocked", "DEPENDS_ON_REJECTED", "modeTitle", "modeHint", "serverDownTitle", "noInternetTitle", "offlineBody"]) {
    assert.match(source, new RegExp(`${key}:`), `${name}: offline.${key} is missing`);
  }
}

console.log("Offline sync: uuid writes, queue on no answer, push/changes contract, per-user queue, sign-out warning and locks passed");
