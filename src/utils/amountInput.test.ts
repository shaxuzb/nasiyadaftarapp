// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { formatAmountInput, parseAmountInput } from "./amountInput.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

assert(formatAmountInput("1500000") === "1 500 000", "Groups digits in threes");
assert(formatAmountInput("1 500 000") === "1 500 000", "Reformatting is stable");
assert(formatAmountInput("007") === "7", "Leading zeros are dropped");
assert(formatAmountInput("0") === "0", "A lone zero stays");
assert(formatAmountInput("12a3,4") === "1 234", "Non-digits are stripped");
assert(formatAmountInput("") === "", "Blank stays blank");
assert(formatAmountInput("12345678901234567").replace(/\s/g, "").length === 13, "Caps the length");

assert(parseAmountInput("1 500 000") === 1500000, "Reads a grouped amount");
assert(parseAmountInput("") === null, "Blank means no initial balance");
assert(parseAmountInput("0") === null, "Zero means no initial balance");
assert(parseAmountInput("   ") === null, "Whitespace means no initial balance");

console.log("Amount input formatting tests passed");
