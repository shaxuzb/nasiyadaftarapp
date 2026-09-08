// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { getToastDismissDirection } from "./toastGesture.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

assert(
  getToastDismissDirection(-80, 0, 0, 0) === "left",
  "dismisses the toast after a left swipe",
);

assert(
  getToastDismissDirection(0, -80, 0, 0) === "up",
  "dismisses the top toast after an upward swipe",
);

assert(
  getToastDismissDirection(12, 4, 720, 0) === "right",
  "dismisses the toast when a horizontal flick has enough velocity",
);

assert(
  getToastDismissDirection(32, 0, 0, -720) === "up",
  "uses the dominant upward flick velocity even when the drag distance is small",
);

assert(
  getToastDismissDirection(32, 0, 0, 0) === null,
  "keeps the toast when the drag does not reach the dismissal threshold",
);

assert(
  getToastDismissDirection(0, 32, 0, 0) === null,
  "keeps the toast when a vertical drag is too short",
);

console.log("Toast gesture utility tests passed");
