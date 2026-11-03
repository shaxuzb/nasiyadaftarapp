// @ts-expect-error Node imports TypeScript with --experimental-strip-types.
import { getSmsStatusAppearance, formatSmsShortDate } from "./smsStatusPresentation.ts";
// Only the colours the badges use; the rest of the theme does not matter here.
const theme = {
  primary: "blue", primaryLight: "blue-light", paymentColor: "green", paymentBg: "green-light",
  warningColor: "amber", dangerColor: "red", debtBg: "red-light",
  textSecondary: "gray", textMuted: "muted", inputBackground: "gray-light",
} as unknown as Parameters<typeof getSmsStatusAppearance>[1];
const expected = { queued: "blue", pending: "amber", sent: "green", failed: "red", cancelled: "gray", skipped: "muted" };
for (const [status, color] of Object.entries(expected)) {
  const actual = getSmsStatusAppearance(status, theme);
  if (actual?.color !== color) throw new Error(`Unexpected ${status} status color: ${actual?.color}`);
}
if (getSmsStatusAppearance(null, theme) !== null) throw new Error("Null last status should not get a badge");
if (formatSmsShortDate("2026-10-21T15:00:00") !== "21.10, 15:00") throw new Error("Compact date and time should fit one short line");
if (formatSmsShortDate("2026-10-21T09:05:00Z") !== "21.10, 09:05") throw new Error("The time is the server's, as written");
if (formatSmsShortDate("2026-10-21") !== "21.10") throw new Error("No time: the day alone");
if (formatSmsShortDate("21/10/2026") !== "") throw new Error("Unknown shape: nothing rather than nonsense");
console.log("SMS status appearance tests passed");
