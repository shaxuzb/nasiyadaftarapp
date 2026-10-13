/**
 * The one-line pitch under a plan's name. The three plans the app knows have
 * their own wording; any other plan the server adds has none, and the caller
 * falls back to whatever the server says about it.
 */
export type PlanTaglineKey =
  | "subscription.taglineFree"
  | "subscription.taglineStandard"
  | "subscription.taglinePremium";

export function getPlanTaglineKey(
  planCode: string | null | undefined,
): PlanTaglineKey | null {
  switch (planCode?.trim().toUpperCase()) {
    case "FREE":
      return "subscription.taglineFree";
    case "STANDARD":
      return "subscription.taglineStandard";
    case "PREMIUM":
      return "subscription.taglinePremium";
    default:
      return null;
  }
}
