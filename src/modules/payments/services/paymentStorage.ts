import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import { createPaymentStorageCore } from "./paymentStorageCore";

const paymentStorage = createPaymentStorageCore({
  storage: AsyncStorage,
  randomUUID: () => Crypto.randomUUID(),
});

export const getOrCreateCheckoutAttempt =
  paymentStorage.getOrCreateCheckoutAttempt;
export const clearCheckoutAttempt = paymentStorage.clearCheckoutAttempt;
export const savePendingPayment = paymentStorage.savePendingPayment;
export const getPendingPayment = paymentStorage.getPendingPayment;
export const clearPendingPayment = paymentStorage.clearPendingPayment;
export const clearPaymentLifecycleForUser =
  paymentStorage.clearPaymentLifecycleForUser;
