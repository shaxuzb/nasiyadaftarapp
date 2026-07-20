import { Customer } from "../modules/clients/types";

const currencyFormatter = new Intl.NumberFormat("uz-UZ");

export function formatCurrency(amount: number): string {
  return `${currencyFormatter.format(amount)} so'm`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getFullName(customer: Customer): string {
  return `${customer.firstName} ${customer.lastName}`;
}

export function getInitials(customer: Customer): string {
  const first = customer.firstName.trim().charAt(0);
  const last = customer.lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase();
}
