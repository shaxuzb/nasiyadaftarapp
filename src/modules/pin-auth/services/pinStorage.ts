import * as SecureStore from "expo-secure-store";

import { createPinSalt, digestPin } from "../utils/pinDigest";
import { createPinStorage } from "./pinStorageFactory";

export const pinStorage = createPinStorage({
  secureStore: SecureStore,
  createSalt: createPinSalt,
  digest: digestPin,
});

/**
 * Removes the device PIN and the record that setup already ran, so the next
 * sign-in starts the PIN setup flow again. Used when the user signs out on
 * purpose or deletes their account.
 */
export async function clearPinForUser(userId: number): Promise<void> {
  await Promise.all([
    pinStorage.clearPin(userId),
    pinStorage.clearPinSetupState(userId),
  ]);
}
