import type { NavigationAction, NavigationState, Router } from "@react-navigation/native";

import { navigationRef } from "./navigationRef";
import {
  currentConnectionProblem,
  SERVER_ONLY_ROUTES,
  showConnectionNotice,
} from "../modules/offline/state/connectionNotice";

const OPENING_ACTIONS = new Set(["NAVIGATE", "NAVIGATE_DEPRECATED", "PUSH", "REPLACE", "JUMP_TO", "POP_TO"]);

/** The screen an action opens, when it opens one of this navigator's own. */
function openedRoute(state: { routeNames: readonly string[] }, action: NavigationAction) {
  if (!OPENING_ACTIONS.has(action.type)) return null;
  const payload = action.payload as { name?: unknown } | undefined;
  const name = typeof payload?.name === "string" ? payload.name : null;
  return name && state.routeNames.includes(name) ? name : null;
}

/**
 * Router override for the main stack and the tabs: opening a screen that
 * needs the server, while it cannot be used, shows why (no internet, or the
 * server down) and stays where it is. Every way in goes through here: a tab,
 * a button, a notification link. Reads the connection when the action comes,
 * never React state, as React Navigation requires.
 */
export function guardServerRoutes<State extends NavigationState, Action extends NavigationAction>(
  original: Router<State, Action>,
): Partial<Router<State, Action>> {
  return {
    getStateForAction(state, action, options) {
      const route = openedRoute(state, action);
      if (route && SERVER_ONLY_ROUTES.has(route)) {
        const problem = currentConnectionProblem();
        if (problem) {
          // Checked again and back: the very same action, now let through.
          showConnectionNotice(problem, () => {
            if (navigationRef.isReady()) navigationRef.dispatch(action);
          });
          // Handled, and nothing changes: the user stays on the screen they were on.
          return state;
        }
      }
      return original.getStateForAction(state, action, options);
    },
  };
}
