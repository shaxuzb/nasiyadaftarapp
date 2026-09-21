import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { getAuthDisplayName } from "./userDisplay.ts";

assert.equal(getAuthDisplayName(" Rich Boy "), "Rich Boy");
assert.equal(getAuthDisplayName(null), "Foydalanuvchi");
assert.equal(getAuthDisplayName("   "), "Foydalanuvchi");

console.log("Auth display-name fallback tests passed");
