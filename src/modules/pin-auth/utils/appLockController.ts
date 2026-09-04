export interface AppLockUser {
  id: number;
  fullName: string;
  phoneNumber?: string | null;
}

export interface AppLockStorage {
  hasPin(userId: number): Promise<boolean>;
  setPin(userId: number, pin: string): Promise<void>;
  verifyPin(userId: number, pin: string): Promise<boolean>;
}

export interface AppLockSnapshot {
  userId: number | null;
  setupRequired: boolean;
  isLocked: boolean;
}

export function createAppLockController(storage: AppLockStorage) {
  let snapshot: AppLockSnapshot = {
    userId: null,
    setupRequired: false,
    isLocked: false,
  };

  return {
    snapshot: (): AppLockSnapshot => snapshot,
    async evaluate(user: AppLockUser | null): Promise<AppLockSnapshot> {
      if (!user) {
        snapshot = { userId: null, setupRequired: false, isLocked: false };
        return snapshot;
      }

      const hasPin = await storage.hasPin(user.id);
      snapshot = {
        userId: user.id,
        setupRequired: !hasPin,
        isLocked: hasPin,
      };
      return snapshot;
    },
    async savePin(pin: string): Promise<void> {
      if (snapshot.userId === null) throw new Error("PIN uchun foydalanuvchi topilmadi");
      await storage.setPin(snapshot.userId, pin);
      snapshot = { ...snapshot, setupRequired: false, isLocked: false };
    },
    lockNow(): void {
      if (!snapshot.setupRequired && snapshot.userId !== null) {
        snapshot = { ...snapshot, isLocked: true };
      }
    },
    async submitUnlockPin(pin: string): Promise<{ status: "unlocked" | "invalid" }> {
      if (snapshot.userId === null || !(await storage.verifyPin(snapshot.userId, pin))) {
        return { status: "invalid" };
      }
      snapshot = { ...snapshot, isLocked: false };
      return { status: "unlocked" };
    },
  };
}
