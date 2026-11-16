import { Customer } from "../modules/clients/types";

/** The name, else the phone, else `fallback`: a translated "Customer". */
export function getFullName(customer: Customer, fallback: string): string {
  return customer.fullName.trim() || customer.phone || fallback;
}

export function getInitials(customer: Customer): string {
  const parts = customer.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}
