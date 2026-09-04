# PIN Login va Biometrik Qulf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nasiya Daftari’da foydalanuvchi ID’siga bog‘langan 4 xonali PIN, Face ID/Touch ID/barmoq izi bilan lokal app-qulf va profil boshqaruvini qo‘shish.

**Architecture:** `src/modules/pin-auth` PIN qoidalari, SecureStore persistance’i, biometrik adapter va React lock contextini ajratadi. `AuthProvider` server sessiyasining yagona egasi bo‘lib qoladi; `AppLockProvider` faqat user ID bo‘yicha lokal PIN holatini tekshiradi. Root navigator auth, PIN setup, PIN qulf va mavjud app navigatsiyasi o‘rtasida himoyalangan gate vazifasini bajaradi.

**Tech Stack:** Expo SDK 55, React Native 0.83, TypeScript, `expo-secure-store`, `expo-crypto`, `expo-local-authentication`, React Navigation 7, `expo-haptics`.

**Spec:** `docs/superpowers/specs/2026-09-05-pin-login-design.md`

## Global Constraints

- PIN aynan 4 xonali bo‘ladi; `0000`, `1111`, `0123`, `1234`, `4321`, `9876` kabi xavfsiz bo‘lmagan qiymatlar rad etiladi.
- PIN email/telefon bilan emas, `AuthUser.id` bilan namespacelanadi: `pin-auth:v1:<userId>`.
- PIN, password, access token, refresh token va OTP hech qachon `AsyncStorage`ga yoki logga yozilmaydi.
- True `logout()` tokenlarni o‘chirishda davom etadi; u saqlangan PIN yozuvi bilan sessiyani qayta tiklamaydi. `Ilovani qulflash` esa sessiyani saqlab qolgan holda lokal PIN ekranini ochadi.
- Biometrika optional; mavjud bo‘lmasa yoki bekor qilinsa, PIN fallback doim ishlaydi. Android’da faqat strong biometrics so‘raladi.
- Beshinchi ketma-ket noto‘g‘ri PIN `AuthProvider.logout()` orqali haqiqiy logoutga olib keladi.
- UI hozirgi `theme`, `spacing`, `radius`, `typography` tokenlarini ishlatadi; barcha yangi interaktiv elementlarda accessibility label/state bo‘ladi.
- Har bir production funksiyasi avval failing test bilan belgilanadi. Standalone testlar `node --experimental-strip-types` bilan ishlaydi.
- iOS Face ID uchun development build talab qilinadi; Expo Go Face ID yakuniy test hisoblanmaydi.

---

## File Structure

| Fayl | Javobgarlik |
|---|---|
| `src/modules/pin-auth/types.ts` | PIN record, biometric capability va controller natija turlari |
| `src/modules/pin-auth/utils/pinValidation.ts` | 4 xonali PIN validation va taqiqlangan patternlar |
| `src/modules/pin-auth/utils/pinDigest.ts` | salt bilan SHA-256 verifier yaratish |
| `src/modules/pin-auth/services/pinStorageFactory.ts` | native modulsiz, dependency-injected user-ID scoped PIN record CRUD |
| `src/modules/pin-auth/services/pinStorage.ts` | Expo SecureStore va crypto dependencylarini production factory’ga ulash |
| `src/modules/pin-auth/services/biometricAuth.ts` | Expo LocalAuthentication adapter va platformaga mos label |
| `src/modules/pin-auth/utils/biometricPresentation.ts` | native modulsiz, testlanadigan capability-to-label mapping |
| `src/modules/pin-auth/utils/appLockState.ts` | testlanadigan lock setup/unlock/attempt state transitionlari |
| `src/modules/pin-auth/context/AppLockContext.tsx` | Auth user lifecycle’ini PIN storage va UI state bilan bog‘lash |
| `src/modules/pin-auth/components/PinDots.tsx` | maskalangan 4 nuqtali indikator |
| `src/modules/pin-auth/components/PinKeypad.tsx` | accessible 3×4 numeric keypad |
| `src/modules/pin-auth/screens/PinSetupScreen.tsx` | PIN yaratish va qayta tasdiqlash |
| `src/modules/pin-auth/screens/PinUnlockScreen.tsx` | PIN/biometrik qulf ekrani |
| `src/modules/pin-auth/screens/PinChangeScreen.tsx` | profil orqali amaldagi va yangi PIN oqimi |
| `src/navigation/index.tsx` | auth/PIN/main navigator gate va PinChange route |
| `App.tsx` | `AppLockProvider` provider nesting |
| `src/screens/AccountSecurityScreen.tsx` | PIN, biometrika va local lock boshqaruv qatori |
| `src/screens/SettingsScreen.tsx` | xavfsizlik row copy’sini PIN/biometrika bilan yangilash |

## Task 1: PIN qoidalari va Expo native konfiguratsiyasi

**Files:**
- Create: `src/modules/pin-auth/utils/pinValidation.ts`
- Create: `src/modules/pin-auth/utils/pinValidation.test.ts`
- Create: `src/modules/pin-auth/types.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `PIN_LENGTH`, `validatePin(pin: string): PinValidationResult`, `PinValidationResult`, `PinRecord`, `BiometricCapability`.
- Consumed by: storage, setup/change/unlock screens and app lock context.

- [ ] **Step 1: Write the failing validation test**

```ts
// src/modules/pin-auth/utils/pinValidation.test.ts
// @ts-expect-error Standalone Node test imports TS directly.
import { PIN_LENGTH, validatePin } from "./pinValidation.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

assert(PIN_LENGTH === 4, "PIN exactly four digits bo‘lishi kerak");
assert(validatePin("4826").valid, "Normal 4-digit PIN qabul qilinishi kerak");
assert(!validatePin("123").valid, "3-digit PIN rad qilinishi kerak");
assert(!validatePin("12345").valid, "5-digit PIN rad qilinishi kerak");
assert(!validatePin("12a4").valid, "Raqam bo‘lmagan PIN rad qilinishi kerak");
assert(!validatePin("0000").valid, "Bir xil digitlar rad qilinishi kerak");
assert(!validatePin("1234").valid, "Ascending ketma-ketlik rad qilinishi kerak");
assert(!validatePin("4321").valid, "Descending ketma-ketlik rad qilinishi kerak");
console.log("PIN validation regression tests passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types src/modules/pin-auth/utils/pinValidation.test.ts`

Expected: FAIL because `pinValidation.ts` does not exist.

- [ ] **Step 3: Implement the minimal validator and shared types**

```ts
// src/modules/pin-auth/utils/pinValidation.ts
export const PIN_LENGTH = 4;
const BLOCKED = new Set(["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "0123", "1234", "2345", "3456", "4567", "5678", "6789", "9876", "8765", "7654", "6543", "5432", "4321", "3210"]);

export type PinValidationResult = { valid: true } | { valid: false; message: string };

export function validatePin(pin: string): PinValidationResult {
  if (!/^\d{4}$/.test(pin)) return { valid: false, message: "PIN 4 ta raqamdan iborat bo‘lishi kerak" };
  if (BLOCKED.has(pin)) return { valid: false, message: "Murakkabroq PIN-kod tanlang" };
  return { valid: true };
}
```

Define `PinRecord` as `{ version: 1; salt: string; digest: string; biometricEnabled: boolean; attempts: number; displayName: string; maskedContact: string | null; }` and `BiometricCapability` as `{ available: boolean; label: "Face ID" | "Touch ID" | "Barmoq izi"; icon: "scan-outline" | "finger-print-outline"; }` in `types.ts`.

- [ ] **Step 4: Run the validation test to verify it passes**

Run: `node --experimental-strip-types src/modules/pin-auth/utils/pinValidation.test.ts`

Expected: PASS with `PIN validation regression tests passed`.

- [ ] **Step 5: Add SDK-compatible native dependencies and iOS permission copy**

Run:

```powershell
npx.cmd expo install expo-crypto expo-local-authentication
```

Add this plugin after `expo-secure-store` in `app.json`:

```json
[
  "expo-local-authentication",
  {
    "faceIDPermission": "Qarz Daftar hisobingizni himoyalash uchun Face ID’dan foydalanadi."
  }
]
```

Add `.superpowers/` to `.gitignore`; the visual brainstorming server writes only local temporary files there. Do not add Android biometric permissions manually: `expo-local-authentication` supplies them.

- [ ] **Step 6: Typecheck and commit**

Run: `npm.cmd run typecheck`

Expected: PASS.

```bash
git add package.json package-lock.json app.json .gitignore src/modules/pin-auth/types.ts src/modules/pin-auth/utils/pinValidation.ts src/modules/pin-auth/utils/pinValidation.test.ts
git commit -m "feat: add PIN authentication foundations"
```

## Task 2: Secure PIN record va user-ID isolation

**Files:**
- Create: `src/modules/pin-auth/utils/pinDigest.ts`
- Create: `src/modules/pin-auth/services/pinStorageFactory.ts`
- Create: `src/modules/pin-auth/services/pinStorage.ts`
- Create: `src/modules/pin-auth/services/pinStorage.test.ts`

**Interfaces:**
- Consumes: `PinRecord`, `validatePin` from Task 1 and `expo-crypto` in production.
- Produces: `createPinStorage(deps)` from the factory, production `pinStorage`, `pinStorageKey(userId)`, `createPinRecord(input)`, `verifyPin(record, pin)`.
- `createPinStorage` receives `{ getItemAsync, setItemAsync, deleteItemAsync }`, a `createSalt()` function and `digest(pin, salt)` function so tests can use a memory adapter without mocking native modules.

- [ ] **Step 1: Write the failing storage/isolation test**

```ts
// src/modules/pin-auth/services/pinStorage.test.ts
// @ts-expect-error Standalone Node test imports TS directly.
import { createPinStorage, pinStorageKey } from "./pinStorageFactory.ts";

const values = new Map<string, string>();
const storage = createPinStorage({
  secureStore: {
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => void values.set(key, value),
    deleteItemAsync: async (key) => void values.delete(key),
  },
  createSalt: () => "test-salt",
  digest: async (pin, salt) => `${salt}:${pin}`,
});

await storage.setPin({ userId: 17, pin: "4826", displayName: "Aziz", maskedContact: "+998 ** *** ** 67" });
if (pinStorageKey(17) === pinStorageKey(18)) throw new Error("Keys must be user scoped");
if (!(await storage.hasPin(17))) throw new Error("Owner must have a PIN record");
if (await storage.hasPin(18)) throw new Error("Other user must not see owner PIN");
if (!(await storage.verifyPin(17, "4826"))) throw new Error("Correct PIN must verify");
if (await storage.verifyPin(17, "4827")) throw new Error("Incorrect PIN must fail");
console.log("PIN storage isolation regression tests passed");
```

- [ ] **Step 2: Run the storage test to verify it fails**

Run: `node --experimental-strip-types src/modules/pin-auth/services/pinStorage.test.ts`

Expected: FAIL because `pinStorageFactory.ts` does not exist.

- [ ] **Step 3: Implement encrypted storage without plaintext PINs**

Use `Crypto.getRandomBytesAsync(16)` encoded to hex/base64 for a salt and `Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`)` for a verifier. `pinStorageFactory.ts` must contain no Expo imports; `pinStorage.ts` imports `expo-secure-store` and `pinDigest.ts`, then supplies production dependencies to that factory. Never return a PIN to UI code.

```ts
export const pinStorageKey = (userId: number) => `pin-auth:v1:${userId}`;

export async function createPinRecord(input: CreatePinRecordInput): Promise<PinRecord> {
  const salt = await createSalt();
  return {
    version: 1,
    salt,
    digest: await digest(input.pin, salt),
    biometricEnabled: false,
    attempts: 0,
    displayName: input.displayName,
    maskedContact: input.maskedContact,
  };
}
```

On read, JSON-parse only valid version-1 records; malformed records are deleted and treated as absent. `setPin`, `verifyPin`, `setBiometricEnabled`, `incrementAttempts`, `resetAttempts`, and `clearPin` must each use the same user-scoped key.

- [ ] **Step 4: Run the storage test to verify it passes**

Run: `node --experimental-strip-types src/modules/pin-auth/services/pinStorage.test.ts`

Expected: PASS with `PIN storage isolation regression tests passed`.

- [ ] **Step 5: Typecheck and commit**

Run: `npm.cmd run typecheck`

Expected: PASS.

```bash
git add src/modules/pin-auth/utils/pinDigest.ts src/modules/pin-auth/services/pinStorageFactory.ts src/modules/pin-auth/services/pinStorage.ts src/modules/pin-auth/services/pinStorage.test.ts
git commit -m "feat: store PIN records by user id"
```

## Task 3: Biometrik capability adapter va lock state machine

**Files:**
- Create: `src/modules/pin-auth/services/biometricAuth.ts`
- Create: `src/modules/pin-auth/utils/biometricPresentation.ts`
- Create: `src/modules/pin-auth/utils/biometricPresentation.test.ts`
- Create: `src/modules/pin-auth/utils/appLockState.ts`
- Create: `src/modules/pin-auth/utils/appLockState.test.ts`

**Interfaces:**
- Consumes: `BiometricCapability`, `PinRecord` from Task 1 and storage functions from Task 2.
- Produces: `getBiometricCapability()`, `authenticateWithBiometrics(capability)`, pure `deriveBiometricCapability(platform, types, available)`, `evaluatePinGate`, `recordFailedPinAttempt`.
- `recordFailedPinAttempt(attempts)` returns `{ attempts: number; mustLogout: boolean }` and uses `MAX_PIN_ATTEMPTS = 5`.

- [ ] **Step 1: Write failing biometric presentation and lock-attempt tests**

```ts
// relevant assertions across the two standalone tests
assert(deriveBiometricCapability("ios", [FACIAL_RECOGNITION], true).label === "Face ID", "iOS face must be labelled Face ID");
assert(deriveBiometricCapability("ios", [FINGERPRINT], true).label === "Touch ID", "iOS fingerprint must be labelled Touch ID");
assert(deriveBiometricCapability("android", [FINGERPRINT], true).label === "Barmoq izi", "Android must not claim Face ID");
assert(!deriveBiometricCapability("android", [], false).available, "Unavailable hardware must hide biometric action");
assert(recordFailedPinAttempt(4).mustLogout, "Fifth consecutive incorrect PIN must request logout");
assert(!recordFailedPinAttempt(3).mustLogout, "Fourth incorrect PIN must leave one final attempt");
```

- [ ] **Step 2: Run both tests to verify they fail**

Run:

```powershell
node --experimental-strip-types src/modules/pin-auth/utils/biometricPresentation.test.ts
node --experimental-strip-types src/modules/pin-auth/utils/appLockState.test.ts
```

Expected: FAIL because the presentation mapper and state machine do not exist.

- [ ] **Step 3: Implement native adapter and pure state transitions**

`biometricPresentation.ts` contains `deriveBiometricCapability` and no Expo imports, so its Node test never loads a native module. `getBiometricCapability` in `biometricAuth.ts` must require both `LocalAuthentication.hasHardwareAsync()` and `isEnrolledAsync()`, then inspect `supportedAuthenticationTypesAsync()` before passing the platform/types into that pure mapper. `authenticateWithBiometrics` calls:

```ts
LocalAuthentication.authenticateAsync({
  promptMessage: "Qarz Daftar ilovasini oching",
  promptDescription: "Hisobingizni biometrika bilan tasdiqlang",
  biometricsSecurityLevel: "strong",
  disableDeviceFallback: true,
  fallbackLabel: "",
});
```

Treat `user_cancel`, `system_cancel`, and `user_fallback` as a silent return to PIN; do not increment PIN attempts. Keep platform-specific labels in `deriveBiometricCapability`, not in screen files. `appLockState.ts` must be framework-independent and export deterministic gate/attempt transitions for Node tests.

- [ ] **Step 4: Run both tests to verify they pass**

Run the two commands from Step 2.

Expected: both PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npm.cmd run typecheck`

Expected: PASS.

```bash
git add src/modules/pin-auth/services/biometricAuth.ts src/modules/pin-auth/utils/biometricPresentation.ts src/modules/pin-auth/utils/biometricPresentation.test.ts src/modules/pin-auth/utils/appLockState.ts src/modules/pin-auth/utils/appLockState.test.ts
git commit -m "feat: add biometric and lock state services"
```

## Task 4: Auth-aware AppLock provider

**Files:**
- Create: `src/modules/pin-auth/context/AppLockContext.tsx`
- Create: `src/modules/pin-auth/utils/appLockController.ts`
- Create: `src/modules/pin-auth/utils/appLockController.test.ts`
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`user`, `isBootstrapping`, `logout`), storage from Task 2 and biometric adapter/state transitions from Task 3.
- Produces: `useAppLock()` with `{ isResolving, setupRequired, isLocked, biometric, beginPinSetup, confirmPinSetup, submitUnlockPin, unlockWithBiometrics, lockNow, changePin, setBiometricEnabled }`.
- `submitUnlockPin(pin)` returns `{ status: "unlocked" | "invalid" | "logged-out"; attemptsRemaining: number }`.

- [ ] **Step 1: Write the failing controller test**

```ts
// src/modules/pin-auth/utils/appLockController.test.ts
const controller = createAppLockController({ storage: memoryStorage, biometrics: noBiometrics });
await controller.evaluate({ id: 17, fullName: "Aziz", phoneNumber: "+998901234567", email: null });
assert(controller.snapshot().setupRequired, "Authenticated user without PIN must enter setup");
await controller.confirmPinSetup("4826");
assert(controller.snapshot().isLocked === false, "Freshly created PIN must open current session");
controller.lockNow();
assert(controller.snapshot().isLocked, "Lock action must hide the app");
assert((await controller.submitUnlockPin("4826")).status === "unlocked", "Correct PIN must unlock");
```

- [ ] **Step 2: Run the controller test to verify it fails**

Run: `node --experimental-strip-types src/modules/pin-auth/utils/appLockController.test.ts`

Expected: FAIL because `appLockController.ts` does not exist.

- [ ] **Step 3: Implement the controller and context gate**

`AppLockProvider` must wait for `AuthProvider.isBootstrapping === false`. When `user?.id` changes, reset `isResolving` before asynchronous SecureStore access so `AppNavigator` renders only a loader, never a protected route from a prior account. Build display data from `user.fullName` and a masked phone/email; it must be refreshed after each successful auth evaluation.

Wire controller lockout to `await logout()` only after the fifth consecutive failed PIN. `lockNow()` changes only local app-lock state and does not call `clearAuthSession()`. A successful PIN/biometric authentication resets attempts to zero. A successful setup sets `setupRequired` false and `isLocked` false for the active session.

In `App.tsx`, nest `<AppLockProvider>` immediately inside `<AuthProvider>` and outside the account/app/navigation consumers:

```tsx
<AuthProvider>
  <AppLockProvider>
    <AccountSecurityProvider>{/* existing children */}</AccountSecurityProvider>
  </AppLockProvider>
</AuthProvider>
```

- [ ] **Step 4: Run the controller test to verify it passes**

Run: `node --experimental-strip-types src/modules/pin-auth/utils/appLockController.test.ts`

Expected: PASS.

- [ ] **Step 5: Run all pure PIN regression tests and commit**

Run:

```powershell
node --experimental-strip-types src/modules/pin-auth/utils/pinValidation.test.ts
node --experimental-strip-types src/modules/pin-auth/services/pinStorage.test.ts
node --experimental-strip-types src/modules/pin-auth/utils/biometricPresentation.test.ts
node --experimental-strip-types src/modules/pin-auth/utils/appLockState.test.ts
node --experimental-strip-types src/modules/pin-auth/utils/appLockController.test.ts
npm.cmd run typecheck
```

Expected: all PASS.

```bash
git add App.tsx src/modules/pin-auth/context/AppLockContext.tsx src/modules/pin-auth/utils/appLockController.ts src/modules/pin-auth/utils/appLockController.test.ts
git commit -m "feat: gate authenticated sessions with app lock"
```

## Task 5: Maketga mos PIN screens va reusable keypad

**Files:**
- Create: `src/modules/pin-auth/components/PinDots.tsx`
- Create: `src/modules/pin-auth/components/PinKeypad.tsx`
- Create: `src/modules/pin-auth/screens/PinSetupScreen.tsx`
- Create: `src/modules/pin-auth/screens/PinUnlockScreen.tsx`
- Create: `src/modules/pin-auth/screens/PinChangeScreen.tsx`
- Create: `src/modules/pin-auth/utils/pinEntry.ts`
- Create: `src/modules/pin-auth/utils/pinEntry.test.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Consumes: `useAppLock`, `PIN_LENGTH`, `validatePin`, theme tokens and `expo-haptics`.
- Produces: `PinSetupScreen`, `PinUnlockScreen`, `PinChangeScreen`, and `RootStackParamList["PinChange"]`.
- `PinKeypad` props: `{ onDigit(digit: string): void; onBackspace(): void; secondaryAction?: { label: string; onPress(): void }; disabled?: boolean; }`.

- [ ] **Step 1: Write the failing keypad interaction test**

Extract `appendPinDigit(current, digit)` and `removePinDigit(current)` into `pinEntry.ts` before rendering UI. Test:

```ts
assert(appendPinDigit("482", "6") === "4826", "Fourth digit must be accepted");
assert(appendPinDigit("4826", "9") === "4826", "Fifth digit must be ignored");
assert(removePinDigit("4826") === "482", "Backspace must remove only final digit");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types src/modules/pin-auth/utils/pinEntry.test.ts`

Expected: FAIL because `pinEntry.ts` does not exist.

- [ ] **Step 3: Implement the professional screen set**

Create shared screen styling with current `theme`, `spacing`, `radius.xl`, `typography.headingLarge`, `SafeAreaView`, and a 3×4 Pressable keypad. Call `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on accepted digits and `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)` only for validation/auth errors.

Screen behavior:

- `PinSetupScreen`: title `PIN-kod yarating`, then `PIN-kodni takrorlang`; accepts exactly 4 digits, clears both visible state and pending setup on mismatch, and offers biometric enable only after successful confirmation.
- `PinUnlockScreen`: name/masked contact, 4 dots, dynamic biometric icon/label, PIN fallback, error text with remaining attempts, and `Hisobdan chiqish` that calls true `logout()`.
- `PinChangeScreen`: current PIN → new valid PIN → confirmation; it calls `changePin` only after all three values are valid. Back navigation must never expose the stored PIN.
- All displayed PIN values are dots; no TextInput auto-fill, clipboard paste or Android screenshot of PIN is introduced.

Add `PinChange: undefined` to `RootStackParamList`.

- [ ] **Step 4: Run the keypad test and typecheck to verify they pass**

Run:

```powershell
node --experimental-strip-types src/modules/pin-auth/utils/pinEntry.test.ts
npm.cmd run typecheck
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/pin-auth/components src/modules/pin-auth/screens src/modules/pin-auth/utils/pinEntry.ts src/modules/pin-auth/utils/pinEntry.test.ts src/types/index.ts
git commit -m "feat: add PIN setup and unlock screens"
```

## Task 6: Navigator va Profile → Kirish va xavfsizlik integratsiyasi

**Files:**
- Modify: `src/navigation/index.tsx`
- Modify: `src/screens/AccountSecurityScreen.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Create: `src/modules/pin-auth/utils/rootGate.ts`
- Create: `src/modules/pin-auth/utils/rootGate.test.ts`

**Interfaces:**
- Consumes: `useAppLock`, `PinSetupScreen`, `PinUnlockScreen`, `PinChangeScreen` from Task 5.
- Produces: root-level transition order `auth → PIN setup → PIN unlock → organization/main`; Profile security rows for changing PIN, switching biometrics, and locking now.

- [ ] **Step 1: Write the failing root-gate decision test**

Add `src/modules/pin-auth/utils/rootGate.test.ts` for a pure `getRootGate` function:

```ts
assert(getRootGate({ bootstrapping: false, resolvingPin: false, hasUser: true, setupRequired: true, locked: false }) === "pin-setup", "New authenticated user must not see main app before setup");
assert(getRootGate({ bootstrapping: false, resolvingPin: false, hasUser: true, setupRequired: false, locked: true }) === "pin-unlock", "Saved session must show PIN lock first");
assert(getRootGate({ bootstrapping: false, resolvingPin: false, hasUser: false, setupRequired: false, locked: false }) === "auth", "No session must show normal login");
```

- [ ] **Step 2: Run the root-gate test to verify it fails**

Run: `node --experimental-strip-types src/modules/pin-auth/utils/rootGate.test.ts`

Expected: FAIL because `rootGate.ts` does not exist.

- [ ] **Step 3: Implement secure navigation and profile controls**

Add pure `getRootGate` and use it in `AppNavigator` before the `NavigationContainer` children. While auth/PIN state is unresolved, retain the existing full-screen loader. Render `PinSetupScreen` or `PinUnlockScreen` in place of the protected organization/main navigator; do not mount protected screens behind a transparent modal.

Add `PinChangeScreen` to `MainNavigator` as a stack screen. In `AccountSecurityScreen`, add a `PIN login` section above password/Google controls with:

1. active PIN status and `PIN-kodni o‘zgartirish` row navigating to `PinChange`;
2. dynamic biometric row/switch only when hardware is enrolled; toggling calls `setBiometricEnabled` and uses a clear failure toast when system auth is unavailable;
3. `Ilovani qulflash` row calling `lockNow()`.

Update the existing Settings security description to `PIN, biometrika va parol`. Keep existing phone verification, password and Google flows unchanged.

- [ ] **Step 4: Run root-gate test and typecheck to verify they pass**

Run:

```powershell
node --experimental-strip-types src/modules/pin-auth/utils/rootGate.test.ts
npm.cmd run typecheck
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/navigation/index.tsx src/screens/AccountSecurityScreen.tsx src/screens/SettingsScreen.tsx src/modules/pin-auth/utils/rootGate.ts src/modules/pin-auth/utils/rootGate.test.ts
git commit -m "feat: integrate PIN login with profile security"
```

## Task 7: Full verification va native-device acceptance

**Files:**
- Modify only when tests expose an implementation defect in the files above.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified Android build and recorded manual acceptance results.

- [ ] **Step 1: Run every standalone regression test**

Run:

```powershell
node --experimental-strip-types src/context/organizationSelection.test.ts
node --experimental-strip-types src/modules/auth/utils/otp.test.ts
node --experimental-strip-types src/modules/pin-auth/utils/pinValidation.test.ts
node --experimental-strip-types src/modules/pin-auth/services/pinStorage.test.ts
node --experimental-strip-types src/modules/pin-auth/utils/biometricPresentation.test.ts
node --experimental-strip-types src/modules/pin-auth/utils/appLockState.test.ts
node --experimental-strip-types src/modules/pin-auth/utils/appLockController.test.ts
node --experimental-strip-types src/modules/pin-auth/utils/pinEntry.test.ts
node --experimental-strip-types src/modules/pin-auth/utils/rootGate.test.ts
```

Expected: every command exits 0.

- [ ] **Step 2: Run static and native build checks**

Run:

```powershell
npm.cmd run typecheck
Push-Location android; .\gradlew.bat assembleDebug; Pop-Location
```

Expected: typecheck and Android `assembleDebug` exit 0.

- [ ] **Step 3: Perform manual acceptance on physical devices**

Verify these exact paths:

1. A newly registered account must see 4-digit setup and confirmation before organization/main screens.
2. Closing/reopening with a saved session must show the PIN qulf, not protected content.
3. Correct PIN unlocks; five wrong PIN attempts perform true logout; next launch requires normal login.
4. `Ilovani qulflash` immediately hides main content and correct PIN reopens it without a network login.
5. True `Hisobdan chiqish` clears session but leaves same-user PIN configuration; successful later password/Google login does not show setup again.
6. Android enrolled strong fingerprint works; an unavailable/cancelled prompt leaves PIN keypad usable.
7. iOS development build verifies Face ID and Touch ID on appropriate physical devices, with the Uzbek Face ID permission copy.
8. Login as user A then user B on the same device: user B must never unlock with user A’s PIN.

- [ ] **Step 4: Commit only a concrete, test-backed verification fix if verification exposes one**

Before changing code, add the failing assertion to the exact existing PIN test file that describes the defect, rerun that one test to observe failure, then make the smallest fix. Stage that named test and the named implementation file together and commit with a specific message, for example:

```bash
git add src/modules/pin-auth/utils/rootGate.test.ts src/modules/pin-auth/utils/rootGate.ts
git commit -m "fix: prevent protected route before PIN unlock"
```
