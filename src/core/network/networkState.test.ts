// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { assertOnlineForMutation, normalizeNetworkStatus } from './networkState.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(normalizeNetworkStatus(true, true) === 'online', 'reachable connection is online');
assert(normalizeNetworkStatus(false, false) === 'offline', 'disconnected state is offline');
assert(normalizeNetworkStatus(null, null) === 'unknown', 'unresolved state remains unknown');
assert(normalizeNetworkStatus(true, null) === 'online', 'connected transport remains online while reachability is unresolved');

let blocked = false;
try {
  assertOnlineForMutation('offline');
} catch {
  blocked = true;
}
assert(blocked, 'offline server mutation must be blocked');
assertOnlineForMutation('online');
