import { AuthUser } from "../../auth/types";

export function hasVerifiedPhone(user: AuthUser | null): boolean {
  return Boolean(user?.phoneNumber?.trim()) && user?.phoneVerified !== false;
}
