export type UserRole = "admin" | "cashier";

export function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "cashier";
}
