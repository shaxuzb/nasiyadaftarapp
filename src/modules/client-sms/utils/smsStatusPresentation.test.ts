// @ts-expect-error Node imports TypeScript with --experimental-strip-types.
import { getSmsStatusAppearance, formatSmsShortDate } from "./smsStatusPresentation.ts";
const theme = {
  primary: "blue", primaryLight: "blue-light", paymentColor: "green", paymentBg: "green-light",
  warningColor: "amber", dangerColor: "red", debtBg: "red-light",
  textSecondary: "gray", textMuted: "muted", inputBackground: "gray-light",
};
const expected = { queued: "blue", pending: "amber", sent: "green", failed: "red", cancelled: "gray", skipped: "muted" };
for (const [status, color] of Object.entries(expected)) {
  const actual = getSmsStatusAppearance(status, theme);
  if (actual?.color !== color) throw new Error(`Unexpected ${status} status color: ${actual?.color}`);
}
if (getSmsStatusAppearance(null, theme) !== null) throw new Error("Null last status should not get a badge");
if (formatSmsShortDate("2026-10-21T15:00:00") !== "21.10") throw new Error("Compact date should fit one short line");
console.log("SMS status appearance tests passed");
