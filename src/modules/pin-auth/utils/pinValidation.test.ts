// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { PIN_LENGTH, validatePin } from "./pinValidation.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

assert(PIN_LENGTH === 4, "PIN exactly four digits bo‘lishi kerak");
assert(validatePin("4826").valid, "Normal 4-digit PIN qabul qilinishi kerak");
assert(!validatePin("123").valid, "3-digit PIN rad qilinishi kerak");
assert(!validatePin("12345").valid, "5-digit PIN rad qilinishi kerak");
assert(!validatePin("12a4").valid, "Raqam bo‘lmagan PIN rad qilinishi kerak");
assert(!validatePin("0000").valid, "Bir xil digitlar rad qilinishi kerak");
assert(!validatePin("1234").valid, "Ascending ketma-ketlik rad qilinishi kerak");
assert(!validatePin("4321").valid, "Descending ketma-ketlik rad qilinishi kerak");

console.log("PIN validation regression tests passed");
