// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { createPinStorage, pinStorageKey } from "./pinStorageFactory.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

const values = new Map<string, string>();
const storage = createPinStorage({
  secureStore: {
    getItemAsync: async (key: string) => values.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      values.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      values.delete(key);
    },
  },
  createSalt: async () => "test-salt",
  digest: async (pin: string, salt: string) => `${salt}:${pin}`,
});

await storage.setPin({
  userId: 17,
  pin: "4826",
  displayName: "Aziz",
  maskedContact: "+998 ** *** ** 67",
});

assert(pinStorageKey(17) !== pinStorageKey(18), "Keys must be user scoped");
assert(await storage.hasPin(17), "Owner must have a PIN record");
assert(!(await storage.hasPin(18)), "Other user must not see owner PIN");
assert(await storage.verifyPin(17, "4826"), "Correct PIN must verify");
assert(!(await storage.verifyPin(17, "4827")), "Incorrect PIN must fail");

console.log("PIN storage isolation regression tests passed");
