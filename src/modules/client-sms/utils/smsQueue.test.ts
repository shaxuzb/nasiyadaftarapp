// @ts-expect-error Node's strip-types runner supports TS file imports.
import { parseSmsQueue, parseAutoReminderSettings } from "./smsParsing.ts";

const assert = (ok: boolean, message: string) => { if (!ok) throw new Error(message); };

const empty = parseSmsQueue({ queuedCount: 0, ownDevice: false, items: [] });
assert(empty.queuedCount === 0 && empty.items.length === 0 && !empty.ownDevice, "Confirmed queue envelope");
const one = parseSmsQueue({ queuedCount: 1, ownDevice: false, items: [{ logId: 23, status: "queued", queuePosition: 2 }] });
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
