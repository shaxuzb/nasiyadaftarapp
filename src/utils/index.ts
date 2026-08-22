import { Customer } from "../modules/clients/types";

const currencyFormatter = new Intl.NumberFormat("uz-UZ");

export function formatCurrency(amount: number): string {
  return `${currencyFormatter.format(amount)} so'm`;
}

export function formatBalance(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  if (value > 0) return `+${formatCurrency(value)}`;
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return formatCurrency(0);
}

/** Presentation-only balance format: API sign is displayed inverted. */
export function formatDisplayedBalance(amount: number): string {
  return formatBalance(-amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getFullName(customer: Customer): string {
  return customer.fullName.trim() || customer.phone || "Noma'lum mijoz";
}

export function getInitials(customer: Customer): string {
  const parts = customer.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}
