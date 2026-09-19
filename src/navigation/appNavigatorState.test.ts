// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { shouldMountMainNavigator } from "./appNavigatorState.ts";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

assert(
  !shouldMountMainNavigator({
    userId: 24,
    organizationId: 18,
    isLocked: true,
    setupRequired: false,
    unlockedUserId: null,
  }),
  "A locked cold start must not mount the protected navigator",
);

assert(
  shouldMountMainNavigator({
    userId: 24,
    organizationId: 18,
    isLocked: true,
    setupRequired: false,
    unlockedUserId: 24,
  }),
  "A relocked session must keep the already mounted navigator alive",
);

assert(
  !shouldMountMainNavigator({
    userId: 24,
    organizationId: 18,
    isLocked: true,
    setupRequired: false,
    unlockedUserId: 17,
  }),
  "A different account must not reuse the previous protected navigator",
);

assert(
  shouldMountMainNavigator({
    userId: 24,
    organizationId: 18,
    isLocked: false,
    setupRequired: false,
    unlockedUserId: null,
  }),
  "An unlocked session must mount the main navigator",
);

assert(
  !shouldMountMainNavigator({
    userId: 24,
    organizationId: null,
    isLocked: false,
    setupRequired: false,
    unlockedUserId: 24,
  }),
  "The main navigator requires a selected organization",
);

console.log("App navigator PIN persistence tests passed");
