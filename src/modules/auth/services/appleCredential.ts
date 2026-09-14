import type { AppleLoginRequest } from "../types";

export type AppleCredentialInput = {
  identityToken?: string | null;
  email?: string | null;
  fullName?: string | null;
};

export function normalizeAppleCredential(
  credential: AppleCredentialInput,
): AppleLoginRequest {
  const identityToken = credential.identityToken?.trim();
  if (!identityToken) {
    throw new Error("APPLE_IDENTITY_TOKEN_MISSING");
  }

  const email = credential.email?.trim() || null;
  const fullName = credential.fullName?.trim() || null;

  return {
    identityToken,
    email,
    fullName,
  };
}
