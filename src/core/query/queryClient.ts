import { AppState } from "react-native";
import { focusManager, QueryClient } from "@tanstack/react-query";

// React Native has no browser tab to lose focus, so React Query takes the app
// as always in front and keeps polling (unread count, SMS phone) in the
// background. Telling it when the app is backgrounded pauses every
// refetchInterval there; refetchOnWindowFocus stays off, so coming back does
// not refetch anything by itself.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (state) => {
    setFocused(state === "active");
  });
  return () => subscription.remove();
});

/** The status of a failed axios request, if the server answered at all. */
function responseStatus(error: unknown): number | undefined {
  const response = (error as { response?: { status?: unknown } } | null)?.response;
  return typeof response?.status === "number" ? response.status : undefined;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // Once, for a dropped connection or a server error. A 4xx (no access,
      // not found, bad request) answers the same the second time.
      retry: (failureCount, error) => {
        const status = responseStatus(error);
        if (status !== undefined && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
      networkMode: "always",
    },
  },
});
