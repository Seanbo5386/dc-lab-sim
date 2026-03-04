import { describe, it, expect } from "vitest";
import { validatePassword, passwordRules } from "../passwordValidation";

describe("passwordRules", () => {
  it("exports 5 password rules", () => {
    expect(passwordRules).toHaveLength(5);
    passwordRules.forEach((rule) => {
      expect(typeof rule.test).toBe("function");
      expect(typeof rule.message).toBe("string");
    });
  });
});

describe("validatePassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const result = validatePassword("Abc1!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("At least 8 characters");
  });

  it("requires at least one uppercase letter", () => {
    const result = validatePassword("abcdefg1!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("One uppercase letter");
  });

  it("requires at least one lowercase letter", () => {
    const result = validatePassword("ABCDEFG1!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("One lowercase letter");
  });

  it("requires at least one number", () => {
    const result = validatePassword("Abcdefgh!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("One number");
  });

  it("requires at least one special character", () => {
    const result = validatePassword("Abcdefg1");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("One special character");
  });

  it("accepts a valid password", () => {
    const result = validatePassword("Abcdefg1!");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns multiple errors for very weak passwords", () => {
    const result = validatePassword("abc");
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
