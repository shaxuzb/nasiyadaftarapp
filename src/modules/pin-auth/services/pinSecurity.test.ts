// @ts-expect-error Standalone Node test.
import { createPinStorage } from './pinStorageFactory.ts';
// @ts-expect-error Standalone Node test.
import { createPinSecurity } from './pinSecurity.ts';
// @ts-expect-error Standalone Node test.
import { validatePin } from '../utils/pinValidation.ts';
// @ts-expect-error Standalone Node test.
import { defaultPinLockoutPolicy } from '../utils/pinLockout.ts';

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
let clock = 1_700_000_000_000;
const security = createPinSecurity(
  storage,
  validatePin,
  async () => { authCalls++; return biometricSuccess; },
  { ...defaultPinLockoutPolicy, now: () => clock },
);
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
// Four wrong PINs only warn.
for (let i = 1; i <= 4; i++) {
  const result = await security.checkPin(17, '4827');
  assert(!result.success, 'A wrong PIN must not unlock');
  assert(result.lockedUntilMs === null, 'Early failures must not lock entry');
  assert(result.attemptsRemaining === 5 - i, 'Remaining attempts must count down');
}

// The fifth locks entry for 30 seconds instead of signing the user out.
const firstLock = await security.checkPin(17, '4827');
assert(
  firstLock.lockedUntilMs === clock + 30_000,
  'The fifth failure must lock entry for 30 seconds',
);
assert(firstLock.attemptsRemaining === 0, 'A locked gate reports no attempts left');
assert(
  (await storage.getPinRecord(17))?.lockedUntil === new Date(clock + 30_000).toISOString(),
  'The deadline must be persisted so it survives a restart',
);

// During the lockout even the correct PIN is refused, and it costs no attempt.
clock += 10_000;
const duringLock = await security.checkPin(17, '5937');
assert(!duringLock.success, 'The correct PIN must be refused while locked');
assert(
  duringLock.lockedUntilMs === firstLock.lockedUntilMs,
  'A guess during the lockout must not extend the deadline',
);
assert(
  (await storage.getPinRecord(17))?.attempts === 5,
  'A guess during the lockout must not spend an attempt',
);

// Biometrics stay available while the PIN is locked out, and clear the lock.
await storage.setBiometricEnabled(17, true);
biometricSuccess = true;
assert(await security.unlockBiometric(17), 'Biometrics must work during a PIN lockout');
assert(
  (await storage.getPinRecord(17))?.lockedUntil === null,
  'A biometric unlock must clear the lockout',
);
assert((await storage.getPinRecord(17))?.attempts === 0, 'A biometric unlock resets attempts');
await storage.setBiometricEnabled(17, false);

// The ladder escalates: five more failures lock for 30s, the next for a minute.
for (let i = 1; i <= 5; i++) await security.checkPin(17, '4827');
clock += 30_000;
const secondLock = await security.checkPin(17, '4827');
assert(
  secondLock.lockedUntilMs === clock + 60_000,
  'The sixth consecutive failure must lock for a minute',
);

// Waiting it out reopens entry, and the correct PIN clears everything.
clock += 60_000;
const recovered = await security.checkPin(17, '5937');
assert(recovered.success, 'The correct PIN must work once the lockout expires');
assert(recovered.lockedUntilMs === null, 'A successful unlock reports no lock');
const cleared = await storage.getPinRecord(17);
assert(cleared?.attempts === 0, 'A successful unlock resets the failure count');
assert(cleared?.lockedUntil === null, 'A successful unlock clears the deadline');

console.log('PIN change, biometric consent and lockout regression tests passed');
