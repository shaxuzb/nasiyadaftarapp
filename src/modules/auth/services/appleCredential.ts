import type { AppleLoginRequest } from "../types";

export type AppleCredentialInput = {
  identityToken?: string | null;
  email?: string | null;
  fullName?: string | null;
};

type AppleIdentityTokenPayload = {
  email?: unknown;
};

export function getAppleEmailFromIdentityToken(
  identityToken: string,
): string | null {
  try {
    const encodedPayload = identityToken.split(".")[1];
    if (!encodedPayload || typeof globalThis.atob !== "function") {
      return null;
    }

    const normalizedPayload = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
    const payload = JSON.parse(
      globalThis.atob(normalizedPayload),
    ) as AppleIdentityTokenPayload;
    return typeof payload.email === "string" && payload.email.trim()
      ? payload.email.trim()
      : null;
  } catch {
    return null;
  }
}

export function normalizeAppleCredential(
  credential: AppleCredentialInput,
): AppleLoginRequest {
  const identityToken = credential.identityToken?.trim();
  if (!identityToken) {
    throw new Error("APPLE_IDENTITY_TOKEN_MISSING");
  }

  const email =
    credential.email?.trim() || getAppleEmailFromIdentityToken(identityToken);
  const fullName = credential.fullName?.trim() || null;

  return {
    identityToken,
    email,
    fullName,
  };
}
