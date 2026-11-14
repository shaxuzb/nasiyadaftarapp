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

/* Cents, for every currency but the sum. */

assert(formatAmountInput("120,5", true) === "120,5", "A comma and the cents");
assert(formatAmountInput("1200.505", true) === "1 200,50", "A point becomes the comma; two digits at most");
assert(formatAmountInput(",5", true) === "0,5", "A leading comma gets its zero");
assert(formatAmountInput("12,3,4", true) === "12,34", "One comma only");
assert(formatAmountInput("120,5") === "1 205", "The sum: no comma, as before");

assert(parseAmountInput("120,50") === 120.5, "Reads the cents");
assert(parseAmountInput("1 200,05") === 1200.05, "Grouped, with cents");
assert(parseAmountInput("120,") === 120, "A comma with nothing after it yet");
assert(parseAmountInput("0,00") === null, "Zero with cents is still zero");
assert(parseAmountInput("1,234") === null, "Never more than two digits after the comma");

console.log("Amount input formatting tests passed");
