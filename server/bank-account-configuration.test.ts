import { describe, expect, it } from "vitest";
import { maskBankAccountNumber, normaliseNigerianBankAccountNumber } from "./db";

describe("physical school bank account safeguards", () => {
  it("normalises a 10-digit Nigerian account number and masks it after capture", () => {
    expect(normaliseNigerianBankAccountNumber("0123 456 789")).toBe("0123456789");
    expect(maskBankAccountNumber("0123456789")).toBe("••••••6789");
  });

  it("rejects invalid account-number lengths before encryption or persistence", () => {
    expect(() => normaliseNigerianBankAccountNumber("123456789")).toThrow(/10-digit Nigerian bank account number/i);
    expect(() => normaliseNigerianBankAccountNumber("12345678901")).toThrow(/10-digit Nigerian bank account number/i);
  });
});
