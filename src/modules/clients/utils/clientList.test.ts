// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { getClientResultCount, getCustomerCountLabel } from "./clientList.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(
  getClientResultCount(3, 1) === 3,
  "uses the API count when it is a valid number",
);

assert(
  getClientResultCount("invalid", 3) === 3,
  "falls back to the number of received results when count is invalid",
);

assert(
  getCustomerCountLabel({
    visibleCount: 3,
    serverCount: 3,
    query: "Zohid",
    debtorOnly: false,
  }) === "3 ta natija",
  "labels backend search matches as results",
);

assert(
  getCustomerCountLabel({
    visibleCount: 2,
    serverCount: 3,
    query: "",
    debtorOnly: true,
  }) === "2 ta qarzdor mijoz",
  "labels the active debtor filter clearly",
);

console.log("Client list utility tests passed");
