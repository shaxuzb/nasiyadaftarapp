export interface MainNavigatorStateInput {
  userId: number | null | undefined;
  organizationId: number | null | undefined;
  isLocked: boolean;
  setupRequired: boolean;
  unlockedUserId: number | null;
}

export function shouldMountMainNavigator(
  input: MainNavigatorStateInput,
): boolean {
  if (input.userId == null || input.organizationId == null) {
    return false;
  }

  // Keep the protected navigator mounted while PIN gate overlays it after an
  // inactivity lock. This preserves query caches and avoids a full remount.
  if (input.unlockedUserId === input.userId) {
    return true;
  }

  return !input.isLocked && !input.setupRequired;
}
