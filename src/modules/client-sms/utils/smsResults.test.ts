// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { getBulkResultTone, groupSmsIssues } from "./smsResults.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

const SENT_TODAY = "Bugun SMS yuborilgan";
const NO_PHONE = "Telefon raqami yo'q";

const groups = groupSmsIssues([
  { status: "sent" },
  { status: "skipped", errorMessage: SENT_TODAY },
  { status: "skipped", errorMessage: NO_PHONE },
  { status: "skipped", errorMessage: SENT_TODAY },
  { status: "skipped", errorMessage: `  ${SENT_TODAY}  ` },
  { status: "failed", errorMessage: "" },
]);

assert(groups.length === 2, "Recipients sharing a reason collapse into one line");
assert(groups[0].reason === SENT_TODAY && groups[0].count === 3, "The most common reason comes first");
assert(groups[1].reason === NO_PHONE && groups[1].count === 1, "Other reasons follow");
assert(groupSmsIssues([{ status: "sent" }]).length === 0, "Clean sends produce no issues");

assert(getBulkResultTone({ sentCount: 5, failedCount: 0 }) === "success", "Everything sent is a success");
assert(getBulkResultTone({ sentCount: 5, failedCount: 1 }) === "error", "Any failure is an error");
assert(getBulkResultTone({ sentCount: 0, failedCount: 0 }) === "info", "All skipped is not a success");

console.log("SMS bulk result grouping tests passed");
