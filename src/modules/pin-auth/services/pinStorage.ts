import * as SecureStore from "expo-secure-store";

import { createPinSalt, digestPin } from "../utils/pinDigest";
import { createPinStorage } from "./pinStorageFactory";

export const pinStorage = createPinStorage({
  secureStore: SecureStore,
  createSalt: createPinSalt,
  digest: digestPin,
});
