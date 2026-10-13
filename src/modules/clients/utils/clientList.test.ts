// @ts-ignore This standalone Node test imports the TypeScript module directly.
import { getClientResultCount, sortCustomerList } from "./clientList.ts";

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

const sorted = sortCustomerList(customers);
assert(
  sorted.map((item) => item.customer.id).join(",") === "8,6,4",
  "the customer list puts the newest customer first, whatever the balances",
);
assert(sorted.length === customers.length, "sorting never drops a customer");
assert(
  customers.map((item) => item.customer.id).join(",") === "4,8,6",
  "sorting leaves the list it was given untouched",
);

const sameDay = [
  { customer: { id: 2, fullName: "A", phone: "", createdAt: "2026-09-18" }, balance: 0 },
  { customer: { id: 9, fullName: "B", phone: "", createdAt: "2026-09-18" }, balance: 0 },
  { customer: { id: 5, fullName: "C", phone: "" }, balance: 0 },
];
assert(
  sortCustomerList(sameDay).map((item) => item.customer.id).join(",") === "9,2,5",
  "customers created together go by id; one without a date goes last",
);

console.log("Client list utility tests passed");
