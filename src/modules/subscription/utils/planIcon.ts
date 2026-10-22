/** Backend icon identifiers mapped to the app's Ionicons vocabulary. */
const ICONS: Readonly<Record<string, string>> = {
  box: "cube-outline",
  building: "business-outline",
  users: "people-outline",
  mail: "mail-outline",
  chart: "bar-chart-outline",
  telegram: "paper-plane-outline",
  shield: "shield-checkmark-outline",
  clock: "time-outline",
  headphones: "headset-outline",
};
export function normalizePlanIcon(icon: string | null): string {
  if (!icon) return "checkmark-circle-outline";
  return ICONS[icon.trim().toLowerCase()] ?? icon;
}
