// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { createAppLockController } from "./appLockController.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

const values = new Map<number, string>();
const controller = createAppLockController({
  hasPin: async (userId: number) => values.has(userId),
  setPin: async (userId: number, pin: string) => void values.set(userId, pin),
  verifyPin: async (userId: number, pin: string) => values.get(userId) === pin,
});

await controller.evaluate({ id: 17, fullName: "Aziz", phoneNumber: "+998901234567" });
assert(controller.snapshot().setupRequired, "Authenticated user without PIN must enter setup");
await controller.savePin("4826");
assert(!controller.snapshot().isLocked, "Freshly created PIN must open current session");
controller.lockNow();
assert(controller.snapshot().isLocked, "Lock action must hide the app");
assert((await controller.submitUnlockPin("4826")).status === "unlocked", "Correct PIN must unlock");

console.log("app lock controller regression tests passed");
