import { describe, it, expect } from "vitest";
import { isUserRole } from "@/lib/auth/roles";

describe("isUserRole", () => {
  it("should return true for valid roles", () => {
    expect(isUserRole("admin")).toBe(true);
    expect(isUserRole("cashier")).toBe(true);
  });

  it("should return false for invalid roles", () => {
    expect(isUserRole("user")).toBe(false);
    expect(isUserRole("")).toBe(false);
    expect(isUserRole(null)).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
    expect(isUserRole(123)).toBe(false);
  });
});
