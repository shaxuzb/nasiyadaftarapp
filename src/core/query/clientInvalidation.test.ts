// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { getClientInvalidationKeys } from './clientInvalidation.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function hasKey(keys: readonly unknown[], expected: unknown[]): boolean {
  return keys.some((key) => JSON.stringify(key) === JSON.stringify(expected));
}

let keys = getClientInvalidationKeys(42, 'transaction', 8);
assert(hasKey(keys, ['clients', 42]), 'Transaction must invalidate client list');
assert(hasKey(keys, ['clients', 42, 'search']), 'Transaction must invalidate client search');
assert(hasKey(keys, ['client', 42, 8]), 'Transaction must invalidate client detail');
assert(hasKey(keys, ['transactions', 42]), 'Transaction must invalidate scoped transactions');
assert(hasKey(keys, ['transactions', 42, 'history', 8]), 'Transaction must invalidate client history');
assert(hasKey(keys, ['reports', 42]), 'Transaction must invalidate reports');
assert(hasKey(keys, ['client-sms', 42, 'recipients']), 'Transaction must invalidate balance-dependent SMS recipients');
assert(!hasKey(keys, ['subscription']), 'Transaction must not invalidate subscription catalog');
assert(!hasKey(keys, ['clients', 99]), 'Transaction must never invalidate another organization scope');

keys = getClientInvalidationKeys(42, 'created');
assert(hasKey(keys, ['clients', 42]), 'Create must invalidate client list');
assert(hasKey(keys, ['reports', 42]), 'Create must invalidate reports');
assert(hasKey(keys, ['client-sms', 42, 'recipients']), 'Create must invalidate SMS recipients');
assert(!hasKey(keys, ['transactions', 42]), 'Create does not need transaction history invalidation');

keys = getClientInvalidationKeys(42, 'updated', 8);
assert(hasKey(keys, ['client', 42, 8]), 'Update must invalidate client detail');
assert(hasKey(keys, ['clients', 42]), 'Update must invalidate client list');
assert(hasKey(keys, ['reports', 42]), 'Update must invalidate reports');

keys = getClientInvalidationKeys(42, 'deleted', 8);
assert(hasKey(keys, ['client', 42, 8]), 'Delete must invalidate deleted detail');
assert(hasKey(keys, ['transactions', 42, 'history', 8]), 'Delete must invalidate deleted history');
assert(hasKey(keys, ['reports', 42]), 'Delete must invalidate reports');

keys = getClientInvalidationKeys(42, 'refresh');
assert(hasKey(keys, ['clients', 42]), 'Refresh must invalidate clients');
assert(hasKey(keys, ['transactions', 42]), 'Refresh must invalidate transactions');
assert(hasKey(keys, ['reports', 42]), 'Refresh must invalidate reports');

console.log('Client domain invalidation policy tests passed');
