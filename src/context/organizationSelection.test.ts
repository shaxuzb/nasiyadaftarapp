// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { getOrganizationSelectionBackAction } from "./organizationSelection.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const previousOrganization = { id: 12, name: "Oldingi tashkilot" };
const restoreAction = getOrganizationSelectionBackAction(previousOrganization);

assert(
  restoreAction.type === "restore" &&
    restoreAction.organization === previousOrganization,
  "Profile'dan ochilgan selector orqaga qaytganda avvalgi tashkilotni tiklashi kerak",
);

const loginAction = getOrganizationSelectionBackAction(null);
assert(
  loginAction.type === "logout",
  "Login oqimidan ochilgan selector orqaga qaytganda logout qilishi kerak",
);

console.log("organization selection back regression tests passed");
