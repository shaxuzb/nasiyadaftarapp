import {
  applyPushPlanToOutbox,
  getPendingOperations,
} from "../db/outboxRepository";
import {
  applyChangesPage,
  clearScope,
  getSyncCursor,
  saveClientAlias,
} from "../db/savedDataRepository";
import { isServerUnreachable } from "../utils/savedData";
import { chunkOperations, planPushResults } from "./syncParsing";
import { fetchChanges, pushOperations } from "./syncService";
import type { OutboxOperation } from "./syncTypes";

/**
 * One round with the server: the queued writes first (in order, 100 at a
 * time), then whatever changed in the organization (until there is no more).
 * One round at a time: a second call while one runs gets the same result.
 */

export type SyncOutcome =
  /** Done: every reply came back. */
  | { kind: "done"; pushed: boolean; clientsMapped: boolean }
  /** The server could not be reached: try again later, nothing lost. */
  | { kind: "unreachable" }
  /** The session has ended: the queue waits for the same user to sign in. */
  | { kind: "unauthorized" }
  /** Something else went wrong (a bad request): tried again later, nothing lost. */
  | { kind: "failed"; error: unknown };

export interface SyncContext {
  userId: number;
  organizationId: number;
  deviceId: string | null | undefined;
  /** Also pull the organization's changes (not only push the queue). */
  pull: boolean;
}

const status = (error: unknown) =>
  (error as { response?: { status?: unknown } } | null)?.response?.status;

let running: Promise<SyncOutcome> | null = null;

export function runSync(context: SyncContext): Promise<SyncOutcome> {
  running ??= sync(context).finally(() => {
    running = null;
  });
  return running;
}

/** What sending one batch came to. */
interface BatchResult {
  /** Some writes left the queue or were marked refused. */
  pushed: boolean;
  clientsMapped: boolean;
  /** Every write in it has its answer; false stops the round (the rest waits). */
  complete: boolean;
}

/** The server's own words for a refused request, if it gave any. */
function serverMessage(error: unknown): string {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  const message = (data as { message?: unknown } | null | undefined)?.message;
  return typeof message === "string" ? message : "";
}

async function pushBatch(context: SyncContext, batch: OutboxOperation[]): Promise<BatchResult> {
  let results;
  try {
    results = await pushOperations(context.deviceId, batch);
  } catch (error) {
    const code = status(error);
    // The server could not read the request as a whole (413/422). One bad
    // write must not hold back every other: the batch goes again one write
    // at a time, and a single write it still cannot read is marked refused,
    // kept and shown, never dropped.
    if (code !== 413 && code !== 422) throw error;
    if (batch.length > 1) {
      const total: BatchResult = { pushed: false, clientsMapped: false, complete: true };
      for (const operation of batch) {
        const one = await pushBatch(context, [operation]);
        total.pushed ||= one.pushed;
        total.clientsMapped ||= one.clientsMapped;
        if (!one.complete) return { ...total, complete: false };
      }
      return total;
    }
    await applyPushPlanToOutbox(context.userId, {
      done: [],
      rejected: [{ opId: batch[0].opId, code: "VALIDATION", message: serverMessage(error) }],
      clients: [],
    });
    return { pushed: true, clientsMapped: false, complete: true };
  }

  const plan = planPushResults(batch, results);
  let clientsMapped = false;
  // A customer added offline now has its real id: screens still open on
  // the stand-in find it from here.
  for (const client of plan.clients) {
    if (client.tempId === null) continue;
    const operation = batch.find((item) => item.meta.tempId === client.tempId || item.meta.clientTempId === client.tempId);
    await saveClientAlias(operation?.organizationId ?? context.organizationId, client.tempId, client.id, client.uuid);
    clientsMapped = true;
  }
  await applyPushPlanToOutbox(context.userId, plan);
  return {
    pushed: plan.done.length > 0 || plan.rejected.length > 0,
    clientsMapped,
    // A batch the server answered only in part: the rest waits for next
    // time, rather than being sent again in a loop now.
    complete: plan.done.length + plan.rejected.length >= batch.length,
  };
}

async function sync(context: SyncContext): Promise<SyncOutcome> {
  let pushed = false;
  let clientsMapped = false;
  try {
    const pending = await getPendingOperations(context.userId);
    for (const batch of chunkOperations(pending)) {
      const result = await pushBatch(context, batch);
      pushed ||= result.pushed;
      clientsMapped ||= result.clientsMapped;
      if (!result.complete) break;
    }

    if (context.pull) {
      try {
        await pullChanges(context.organizationId);
      } catch (error) {
        // The queue went: that is what matters. Changes that the server
        // refused to give now (an error, not an outage) come next time.
        if (status(error) === 401 || isServerUnreachable(error)) throw error;
        if (__DEV__) console.warn("Offline changes could not be read", error);
      }
    }
    return { kind: "done", pushed, clientsMapped };
  } catch (error) {
    if (status(error) === 401) return { kind: "unauthorized" };
    if (isServerUnreachable(error) || (error as { name?: unknown } | null)?.name === "OFFLINE_MUTATION") {
      return { kind: "unreachable" };
    }
    if (__DEV__) console.warn("Offline sync failed", error);
    return { kind: "failed", error };
  }
}

async function pullChanges(organizationId: number): Promise<void> {
  let cursor = await getSyncCursor(organizationId);
  let restarted = false;
  for (;;) {
    let page;
    try {
      page = await fetchChanges(cursor, organizationId);
    } catch (error) {
      // The cursor belongs to another organization (or has expired): start
      // again from nothing, once.
      if (status(error) === 410 && !restarted) {
        restarted = true;
        await clearScope(organizationId);
        cursor = null;
        continue;
      }
      throw error;
    }
    await applyChangesPage(organizationId, page);
    if (!page.hasMore || !page.cursor || page.cursor === cursor) return;
    cursor = page.cursor;
    // Lets the screen draw between pages of a long first load.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
