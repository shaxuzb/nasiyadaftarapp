// @ts-expect-error Standalone Node test.
import { createPinStorage } from './pinStorageFactory.ts';
// @ts-expect-error Standalone Node test.
import { createPinSecurity } from './pinSecurity.ts';
// @ts-expect-error Standalone Node test.
import { validatePin } from '../utils/pinValidation.ts';

function assert(value: boolean, message: string) { if (!value) throw new Error(message); }
const data = new Map<string, string>();
let salt = 0;
const storage = createPinStorage({
  secureStore: {
    getItemAsync: async (key: string) => data.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => { data.set(key, value); },
    deleteItemAsync: async (key: string) => { data.delete(key); },
  },
  createSalt: async () => String(++salt),
  digest: async (pin: string, salt: string) => `${salt}-${pin}`,
});
let authCalls = 0;
let biometricSuccess = true;
const security = createPinSecurity(storage, validatePin, async () => { authCalls++; return biometricSuccess; });
await storage.setPin({ userId: 17, pin: '4826', displayName: 'Aziz', maskedContact: null });
assert(!(await security.unlockBiometric(17)), 'Disabled biometric must not unlock');
assert(authCalls === 0, 'Disabled biometric must not open a prompt');
assert(!(await security.changePin(17, '4827', '5937')).success, 'Wrong current PIN must prevent replacement');
assert(await storage.verifyPin(17, '4826'), 'Wrong PIN must preserve original');
assert((await security.setBiometric(17, '4826', true)).success, 'Correct PIN and system auth enable biometric');
assert(await security.unlockBiometric(17), 'Enabled and successful biometric unlocks');
biometricSuccess = false;
assert(!(await security.unlockBiometric(17)), 'Cancelled biometric must stay locked');
assert((await storage.getPinRecord(17))?.attempts === 0, 'Cancel does not spend PIN attempts');
assert((await security.changePin(17, '4826', '5937')).success, 'Current PIN permits replacement');
assert(!(await storage.verifyPin(17, '4826')), 'Old PIN no longer works');
assert(await storage.verifyPin(17, '5937'), 'New PIN works');
assert((await storage.getPinRecord(17))?.biometricEnabled === true, 'PIN change preserves biometric preference');
assert(!(await storage.hasPin(18)), 'Other accounts remain isolated');
let rejected = false;
try { await security.changePin(17, '5937', '1111'); } catch { rejected = true; }
assert(rejected, 'Weak new PIN must be rejected');
assert((await security.setBiometric(17, '5937', false)).success, 'Correct PIN can disable biometric');
assert(!(await security.unlockBiometric(17)), 'Disabled again must not unlock');
for (let i = 1; i <= 5; i++) {
  const result = await security.checkPin(17, '4827');
  assert(!result.success && result.mustLogout === (i === 5), 'Exactly fifth failure requires logout');
}
console.log('PIN change, biometric consent and attempt regression tests passed');
