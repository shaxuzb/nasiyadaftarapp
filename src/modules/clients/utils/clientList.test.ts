// @ts-ignore This standalone Node test imports the TypeScript module directly.
import { getClientResultCount, getCustomerCountLabel, sortCustomerList } from "./clientList.ts";

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

const customers = [
  {
    customer: { id: 4, fullName: "Eski", phone: "", createdAt: "2026-09-10" },
    balance: 900_000,
  },
  {
    customer: { id: 8, fullName: "Yangi", phone: "", createdAt: "2026-09-18" },
    balance: 100_000,
  },
  {
    customer: { id: 6, fullName: "O'rta", phone: "", createdAt: "2026-09-15" },
    balance: 500_000,
  },
];

assert(
  sortCustomerList(customers, false).map((item) => item.customer.id).join(",") ===
    "8,6,4",
  "default customer list puts the newest customer first",
);

assert(
  sortCustomerList(customers, true).map((item) => item.customer.id).join(",") ===
    "4,6,8",
  "debtor filter sorts customers by highest balance first",
);

console.log("Client list utility tests passed");
