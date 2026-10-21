// @ts-expect-error Node's strip-types runner supports TS file imports.
import { parseSmsQueue, parseAutoReminderSettings, parseSmsHistory, parseSmsPreview, parseSmsSendResult, parseBulkSmsResponse, parseSmsRecipients } from "./smsParsing.ts";

const assert = (ok: boolean, message: string) => { if (!ok) throw new Error(message); };

const empty = parseSmsQueue({ queuedCount: 0, ownDevice: false, items: [] });
assert(empty.queuedCount === 0 && empty.items.length === 0 && !empty.ownDevice, "Confirmed queue envelope");
const one = parseSmsQueue({ queuedCount: 1, ownDevice: false, items: [{ logId: 23, clientName: "Ali", position: 2, source: "user", estimatedSendDate: "2026-10-22" }] });
assert(one.items[0].id === 23 && one.items[0].queuePosition === 2, "History-compatible queue item");
let rejected = false;
try { parseSmsQueue({ results: [] }); } catch { rejected = true; }
assert(rejected, "Invalid queue envelope rejected");

const settings = parseAutoReminderSettings({ available: true, enabled: false, intervalDays: 7, minBalance: 0, minIntervalDays: 3, lastRunDate: null });
assert(settings.available && !settings.enabled && settings.intervalDays === 7 && settings.minIntervalDays === 3, "Confirmed reminder contract");
rejected = false;
try { parseAutoReminderSettings({ enabled: false }); } catch { rejected = true; }
assert(rejected, "Invalid reminder payload rejected");
console.log("Queue and reminder parser tests passed");

const history = parseSmsHistory({ count: 1, results: [{ id: 501, clientFullName: "Ali Valiyev", status: "queued", queuePosition: 1 }] });
assert(history.results[0].fullName === "Ali Valiyev", "History full name");
const preview = parseSmsPreview({ requested: 1, eligible: 1, sendNow: 0, queued: 1, skipped: 0, estimatedLastSendDate: "2026-10-22", quotaRemaining: 99, ownDevice: false, message: "1 tasi navbatda", skippedClients: [] });
assert(preview.queued === 1 && preview.eligible === 1, "Preview");
const single = parseSmsSendResult({ logId: 501, status: "queued", quota: { periodEnd: "2026-11-20", monthlyLimit: 100, monthlyUsed: 1 } });
assert(single.logId === 501 && single.quota?.periodEnd === "2026-11-20", "Single result");
const bulk = parseBulkSmsResponse({ queuedCount: 1, results: [{ logId: 501, status: "queued" }] });
assert(bulk.queuedCount === 1 && bulk.results[0].logId === 501, "Bulk results");
const recipients = parseSmsRecipients({ count: 1, results: [{ id: 217, canSend: true, smsSentToday: true }] });
assert(recipients.results[0].smsSentToday, "Queued-today recipient flag");
