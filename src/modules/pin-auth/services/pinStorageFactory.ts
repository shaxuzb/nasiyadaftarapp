import type { PinRecord } from "../types";

export interface SecureStoreAdapter {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface CreatePinStorageDependencies {
  secureStore: SecureStoreAdapter;
  createSalt(): Promise<string>;
  digest(pin: string, salt: string): Promise<string>;
}

export interface SetPinInput {
  userId: number;
  pin: string;
  displayName: string;
  maskedContact: string | null;
  biometricEnabled?: boolean;
}

export const pinStorageKey = (userId: number) => `pin_auth_v1_${userId}`;
const pinSetupStateKey = (userId: number) => `pin_setup_v1_${userId}`;
const biometricPreferenceKey = (userId: number) =>
  `pin_biometric_v1_${userId}`;

function isPinRecord(value: unknown): value is PinRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PinRecord>;

  return (
    record.version === 1 &&
    typeof record.salt === "string" &&
    typeof record.digest === "string" &&
    typeof record.biometricEnabled === "boolean" &&
    typeof record.attempts === "number" &&
    Number.isInteger(record.attempts) &&
    record.attempts >= 0 &&
    typeof record.displayName === "string" &&
    (typeof record.maskedContact === "string" || record.maskedContact === null)
  );
}

export function createPinStorage({
  secureStore,
  createSalt,
  digest,
}: CreatePinStorageDependencies) {
  async function getPinRecord(userId: number): Promise<PinRecord | null> {
    const key = pinStorageKey(userId);
    const raw = await secureStore.getItemAsync(key);
    if (!raw) return null;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (isPinRecord(parsed)) {
        const biometricPreference = await secureStore.getItemAsync(
          biometricPreferenceKey(userId),
        );
        if (biometricPreference === "1") {
          return { ...parsed, biometricEnabled: true };
        }
        if (biometricPreference === "0") {
          return { ...parsed, biometricEnabled: false };
        }
        return parsed;
      }
    } catch {
      // Invalid data is cleared below and treated as absent.
    }

    await secureStore.deleteItemAsync(key);
    return null;
  }

  async function savePinRecord(userId: number, record: PinRecord): Promise<void> {
    await Promise.all([
      secureStore.setItemAsync(pinStorageKey(userId), JSON.stringify(record)),
      secureStore.setItemAsync(
        biometricPreferenceKey(userId),
        record.biometricEnabled ? "1" : "0",
      ),
    ]);
  }

  return {
    getPinRecord,
    async isPinSetupComplete(userId: number): Promise<boolean> {
      return (await secureStore.getItemAsync(pinSetupStateKey(userId))) === "1";
    },
    async markPinSetupComplete(userId: number): Promise<void> {
      await secureStore.setItemAsync(pinSetupStateKey(userId), "1");
    },
    async clearPinSetupState(userId: number): Promise<void> {
      await secureStore.deleteItemAsync(pinSetupStateKey(userId));
    },
    async hasPin(userId: number): Promise<boolean> {
      return Boolean(await getPinRecord(userId));
    },
    async setPin(input: SetPinInput): Promise<PinRecord> {
      const salt = await createSalt();
      const record: PinRecord = {
        version: 1,
        salt,
        digest: await digest(input.pin, salt),
        biometricEnabled: input.biometricEnabled ?? false,
        attempts: 0,
        displayName: input.displayName,
        maskedContact: input.maskedContact,
      };
      await savePinRecord(input.userId, record);
      await secureStore.setItemAsync(pinSetupStateKey(input.userId), "1");
      return record;
    },
    async verifyPin(userId: number, pin: string): Promise<boolean> {
      const record = await getPinRecord(userId);
      if (!record) return false;
      return (await digest(pin, record.salt)) === record.digest;
    },
    async setBiometricEnabled(userId: number, enabled: boolean): Promise<PinRecord | null> {
      const record = await getPinRecord(userId);
      if (!record) return null;
      const next = { ...record, biometricEnabled: enabled };
      await savePinRecord(userId, next);
      return next;
    },
    async incrementAttempts(userId: number): Promise<PinRecord | null> {
      const record = await getPinRecord(userId);
      if (!record) return null;
      const next = { ...record, attempts: record.attempts + 1 };
      await savePinRecord(userId, next);
      return next;
    },
    async resetAttempts(userId: number): Promise<PinRecord | null> {
      const record = await getPinRecord(userId);
      if (!record) return null;
      const next = { ...record, attempts: 0 };
      await savePinRecord(userId, next);
      return next;
    },
    async updateDisplayMetadata(
      userId: number,
      displayName: string,
      maskedContact: string | null,
    ): Promise<PinRecord | null> {
      const record = await getPinRecord(userId);
      if (!record) return null;
      const next = { ...record, displayName, maskedContact };
      await savePinRecord(userId, next);
      return next;
    },
    clearPin(userId: number): Promise<void> {
      return Promise.all([
        secureStore.deleteItemAsync(pinStorageKey(userId)),
        secureStore.deleteItemAsync(biometricPreferenceKey(userId)),
      ]).then(() => undefined);
    },
  };
}

export type PinStorage = ReturnType<typeof createPinStorage>;
