import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

import type { AppleLoginRequest } from "../types";
import { normalizeAppleCredential } from "./appleCredential";

export type AppleSignInReason =
  | "cancelled"
  | "tokenMissing"
  | "unavailable"
  | "unexpected";

export class AppleSignInFlowError extends Error {
  readonly reason: AppleSignInReason;

  constructor(reason: AppleSignInReason) {
    super(reason);
    this.name = "AppleSignInFlowError";
    this.reason = reason;
  }
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  return AppleAuthentication.isAvailableAsync();
}

export async function requestAppleCredential(): Promise<AppleLoginRequest> {
  if (!(await isAppleSignInAvailable())) {
    throw new AppleSignInFlowError("unavailable");
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    console.log(credential);

    const formattedName = credential.fullName
      ? AppleAuthentication.formatFullName(credential.fullName).trim() || null
      : null;

    try {
      return normalizeAppleCredential({
        identityToken: credential.identityToken,
        email: credential.email,
        fullName: formattedName,
      });
    } catch {
      throw new AppleSignInFlowError("tokenMissing");
    }
  } catch (error) {
    if (error instanceof AppleSignInFlowError) throw error;

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ERR_REQUEST_CANCELED"
    ) {
      throw new AppleSignInFlowError("cancelled");
    }

    throw new AppleSignInFlowError("unexpected");
  }
}

export function getAppleSignInReason(error: unknown): AppleSignInReason {
  return error instanceof AppleSignInFlowError ? error.reason : "unexpected";
}
