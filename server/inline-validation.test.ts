import { describe, expect, it } from "vitest";
import { validateAdmissionNumber, validateDate, validateEmail, validateName, validatePhone, validationControlClass } from "../client/src/lib/inlineValidation";

describe("inline biodata validation", () => {
  it("confirms valid names, Nigerian-style phone numbers, emails, and admission identifiers", () => {
    expect(validateName("Ada").state).toBe("valid");
    expect(validatePhone("0803 123 4567").state).toBe("valid");
    expect(validateEmail("guardian@example.ng").state).toBe("valid");
    expect(validateAdmissionNumber("GFA-001").state).toBe("valid");
  });

  it("gives corrective inline states only after incomplete values are entered", () => {
    expect(validateName("").state).toBe("idle");
    expect(validateName("A")).toMatchObject({ state: "invalid", message: "Enter at least 2 characters." });
    expect(validatePhone("123").state).toBe("invalid");
    expect(validateEmail("not-an-email").state).toBe("invalid");
    expect(validateDate("2999-01-01").state).toBe("invalid");
  });

  it("adds visual control styles for valid and invalid states", () => {
    expect(validationControlClass("base", { state: "valid" })).toContain("border-[#6aa77a]");
    expect(validationControlClass("base", { state: "invalid" })).toContain("border-[#d98a82]");
  });
});
